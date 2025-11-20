import { InjectQueue } from '@nestjs/bull';
import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, SyndicationChannel, SyndicationStatus } from '@prisma/client';
import { Queue } from 'bull';
import { PrismaService } from '../prisma/prisma.service';
import { ReportingService } from '../reporting/reporting.service';
import {
  ChannelCredential,
  ListingSyndicationAdapter,
  PropertyMarketingSnapshot,
} from './providers/listing-syndication.adapter';
import { ZillowSyndicationAdapter } from './providers/zillow.adapter';
import { ApartmentsComSyndicationAdapter } from './providers/apartments-com.adapter';
import { UpsertChannelCredentialDto } from './dto/channel-credential.dto';
import { SyndicationActionDto } from './dto/syndication-action.dto';

@Injectable()
export class ListingSyndicationService {
  private readonly adapters: Record<SyndicationChannel, ListingSyndicationAdapter>;
  private readonly channelRateLimitMs: Record<SyndicationChannel, number> = {
    [SyndicationChannel.ZILLOW]: 1_000,
    [SyndicationChannel.APARTMENTS_DOT_COM]: 5_000,
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly reportingService: ReportingService,
    zillowAdapter: ZillowSyndicationAdapter,
    apartmentsComAdapter: ApartmentsComSyndicationAdapter,
    @InjectQueue('listingSyndication') private readonly queue: Queue,
  ) {
    this.adapters = {
      [zillowAdapter.channel]: zillowAdapter,
      [apartmentsComAdapter.channel]: apartmentsComAdapter,
    };
  }

  async upsertChannelCredential(dto: UpsertChannelCredentialDto) {
    const { channel, ...config } = dto;
    return this.prisma.syndicationCredential.upsert({
      where: { channel },
      create: {
        channel,
        config,
      },
      update: {
        config,
      },
    });
  }

  async listChannelCredentials() {
    return this.prisma.syndicationCredential.findMany({
      orderBy: { channel: 'asc' },
    });
  }

  async queueSyndication(propertyId: number, dto?: SyndicationActionDto) {
    const channels = dto?.channels?.length
      ? dto.channels
      : (Object.keys(this.adapters) as SyndicationChannel[]);

    for (const channelKey of channels) {
      await this.prisma.syndicationQueue.create({
        data: {
          propertyId,
          channel: channelKey,
          status: SyndicationStatus.PENDING,
        },
      });
    }

    await this.schedulePendingJobs();

    return this.getPropertyStatus(propertyId);
  }

  async pauseSyndication(propertyId: number, dto?: SyndicationActionDto) {
    const channels = dto?.channels?.length
      ? dto.channels
      : (Object.keys(this.adapters) as SyndicationChannel[]);

    await this.prisma.syndicationQueue.updateMany({
      where: {
        propertyId,
        channel: { in: channels as SyndicationChannel[] },
      },
      data: {
        status: SyndicationStatus.PAUSED,
      },
    });

    return this.getPropertyStatus(propertyId);
  }

  async getPropertyStatus(propertyId: number) {
    const property = await this.prisma.property.findUnique({ where: { id: propertyId } });

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    const queue = await this.prisma.syndicationQueue.findMany({
      where: { propertyId },
      orderBy: { updatedAt: 'desc' },
    });

    return queue;
  }

  async refreshEnabledProperties() {
    const properties = await this.prisma.propertyMarketingProfile.findMany({
      where: { isSyndicationEnabled: true },
      select: { propertyId: true },
    });

    for (const record of properties) {
      await this.queueSyndication(record.propertyId);
    }
  }

  async schedulePendingJobs() {
    const pendingEntries = await this.prisma.syndicationQueue.findMany({
      where: { status: SyndicationStatus.PENDING },
    });

    for (const entry of pendingEntries) {
      await this.queue.add(
        'sync',
        { entryId: entry.id },
        {
          removeOnComplete: true,
          removeOnFail: false,
          delay: this.channelRateLimitMs[entry.channel] ?? 1_000,
        },
      );
    }
  }

  async processQueueEntry(entryId: number) {
    const queueEntry = await this.prisma.syndicationQueue.findUnique({
      where: { id: entryId },
      include: {
        property: {
          include: {
            marketingProfile: true,
            photos: true,
            amenities: { include: { amenity: true } },
            units: true,
          },
        },
      },
    });

    if (!queueEntry) {
      return;
    }

    if (queueEntry.status === SyndicationStatus.PAUSED) {
      return;
    }

    const adapter = this.adapters[queueEntry.channel];
    const credential = await this.getCredentialForChannel(queueEntry.channel);
    const snapshot = this.toSnapshot(queueEntry.property);
    const payload = adapter.buildPayload(snapshot);

    try {
      await this.prisma.syndicationQueue.update({
        where: { id: queueEntry.id },
        data: { status: SyndicationStatus.IN_PROGRESS, lastAttemptAt: new Date() },
      });

      const result = await adapter.send(payload, credential);
      const serializedPayload = payload as Prisma.JsonValue;

      await this.prisma.syndicationQueue.update({
        where: { id: queueEntry.id },
        data: {
          status: result.success ? SyndicationStatus.SUCCESS : SyndicationStatus.FAILED,
          payload: serializedPayload,
          lastError: result.success ? null : result.message,
          retryCount: queueEntry.retryCount,
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      const retryCount = queueEntry.retryCount + 1;
      const hasRetriesRemaining = retryCount < queueEntry.maxRetries;
      const nextRunAt = hasRetriesRemaining ? new Date(Date.now() + 60_000) : null;

      await this.prisma.syndicationQueue.update({
        where: { id: queueEntry.id },
        data: {
          status: hasRetriesRemaining ? SyndicationStatus.PENDING : SyndicationStatus.FAILED,
          retryCount,
          lastError: error instanceof Error ? error.message : 'Unknown error',
          nextRunAt,
          lastAttemptAt: new Date(),
        },
      });

      await this.reportingService.logSyndicationError({
        propertyId: queueEntry.propertyId,
        channel: queueEntry.channel,
        error: error instanceof Error ? error.message : 'Unknown error',
        context: payload as Prisma.JsonValue,
      });

      if (hasRetriesRemaining) {
        await this.queue.add('sync', { entryId: queueEntry.id }, { delay: 60_000 });
      }
    }
  }

  private async getCredentialForChannel(channel: SyndicationChannel): Promise<ChannelCredential> {
    const credential = await this.prisma.syndicationCredential.findUnique({ where: { channel } });

    if (!credential) {
      throw new Error(`Missing credentials for ${channel}`);
    }

    return credential.config as ChannelCredential;
  }

  private toSnapshot(property: any): PropertyMarketingSnapshot {
    return {
      property: {
        id: property.id,
        name: property.name,
        address: property.address,
      },
      marketingProfile: property.marketingProfile,
      photos: property.photos,
      amenities: property.amenities.map((amenity) => ({
        key: amenity.amenity.key,
        label: amenity.amenity.label,
        isFeatured: amenity.isFeatured,
      })),
      unitCount: property.units.length,
    };
  }
}
