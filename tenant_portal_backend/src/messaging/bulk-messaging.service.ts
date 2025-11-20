import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { BulkMessageStatus, BulkRecipientStatus, BulkSendStrategy } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBulkMessageDto, RecipientFilterDto } from './dto/messaging.dto';
import { MessagingService } from './messaging.service';

const ONE_MINUTE_MS = 60 * 1000;

@Injectable()
export class BulkMessagingService {
  private readonly logger = new Logger(BulkMessagingService.name);
  private readonly DEFAULT_THROTTLE = 50;

  constructor(
    private readonly prisma: PrismaService,
    private readonly messagingService: MessagingService,
  ) {}

  async getTemplates() {
    return this.prisma.messageTemplate.findMany({
      orderBy: { updatedAt: 'desc' },
    });
  }

  async previewBulkMessage(dto: CreateBulkMessageDto, creatorId: number) {
    const recipients = await this.resolveRecipients(dto.filters, dto.recipientIds, creatorId);
    if (!recipients.length) {
      throw new BadRequestException('No recipients match the selected filters');
    }

    const templateBody = await this.resolveTemplateBody(dto);
    const contexts = recipients.map((recipient) =>
      this.buildRecipientContext(recipient.user, templateBody, dto.mergeFields ?? {}),
    );

    return {
      totalRecipients: contexts.length,
      sample: contexts.slice(0, 5),
    };
  }

  async queueBulkMessage(dto: CreateBulkMessageDto, creatorId: number) {
    const recipients = await this.resolveRecipients(dto.filters, dto.recipientIds, creatorId);
    if (!recipients.length) {
      throw new BadRequestException('No recipients match the selected filters');
    }

    const templateBody = await this.resolveTemplateBody(dto);
    const payload = recipients.map((recipient) =>
      this.buildRecipientContext(recipient.user, templateBody, dto.mergeFields ?? {}),
    );

    const scheduledAt =
      dto.sendStrategy === BulkSendStrategy.SCHEDULED && dto.scheduledAt
        ? new Date(dto.scheduledAt)
        : null;

    const batch = await this.prisma.bulkMessageBatch.create({
      data: {
        title: dto.title,
        body: templateBody,
        status: BulkMessageStatus.QUEUED,
        sendStrategy: dto.sendStrategy ?? BulkSendStrategy.IMMEDIATE,
        scheduledAt,
        throttlePerMinute: dto.throttlePerMinute ?? this.DEFAULT_THROTTLE,
        filters: dto.filters ? (dto.filters as Prisma.JsonObject) : undefined,
        metadata: dto.mergeFields ? (dto.mergeFields as Prisma.JsonObject) : undefined,
        templateId: dto.templateId,
        creatorId,
      },
    });

    await this.prisma.bulkMessageRecipient.createMany({
      data: payload.map((context) => ({
        batchId: batch.id,
        userId: context.user.id,
        renderedContent: context.renderedContent,
        mergeVariables: context.mergeVariables as Prisma.JsonObject,
      })),
    });

    return this.getBatchById(batch.id);
  }

  async listBatches() {
    const batches = await this.prisma.bulkMessageBatch.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        template: true,
        recipients: {
          select: { status: true },
        },
      },
    });

    return batches.map((batch) => {
      const { recipients, ...rest } = batch;
      return {
        ...rest,
        deliverySummary: this.buildSummary(
          recipients.map((recipient) => recipient.status as BulkRecipientStatus),
        ),
      };
    });
  }

  async getBatchById(id: number) {
    const batch = await this.prisma.bulkMessageBatch.findUnique({
      where: { id },
      include: {
        template: true,
        creator: { select: { id: true, username: true, role: true } },
      },
    });
    if (!batch) {
      throw new BadRequestException('Bulk message batch not found');
    }

    const summary = await this.prisma.bulkMessageRecipient.groupBy({
      by: ['status'],
      where: { batchId: id },
      _count: { _all: true },
    });

    return {
      ...batch,
      deliverySummary: this.buildSummary(
        summary.map((item) => ({ status: item.status, count: item._count._all })),
      ),
    };
  }

  async getRecipientStatuses(batchId: number) {
    await this.ensureBatchExists(batchId);
    return this.prisma.bulkMessageRecipient.findMany({
      where: { batchId },
      include: {
        user: { select: { id: true, username: true, role: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getDeliveryReport(batchId: number) {
    await this.ensureBatchExists(batchId);
    const summary = await this.prisma.bulkMessageRecipient.groupBy({
      by: ['status'],
      where: { batchId },
      _count: { _all: true },
    });

    const failures = await this.prisma.bulkMessageRecipient.findMany({
      where: { batchId, status: BulkRecipientStatus.FAILED },
      select: { userId: true, errorMessage: true },
      take: 10,
    });

    return {
      summary: this.buildSummary(
        summary.map((item) => ({ status: item.status, count: item._count._all })),
      ),
      failures,
    };
  }

  @Interval(5000)
  async processQueue() {
    const now = new Date();
    const readyBatches = await this.prisma.bulkMessageBatch.findMany({
      where: {
        status: { in: [BulkMessageStatus.QUEUED, BulkMessageStatus.SENDING] },
        OR: [{ scheduledAt: null }, { scheduledAt: { lte: now } }],
      },
      include: {
        recipients: {
          where: {
            status: BulkRecipientStatus.PENDING,
            OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: now } }],
          },
          include: {
            user: {
              include: {
                lease: {
                  include: { unit: { include: { property: true } } },
                },
              },
            },
          },
          orderBy: { createdAt: 'asc' },
          take: 50,
        },
      },
      orderBy: { createdAt: 'asc' },
      take: 5,
    });

    for (const batch of readyBatches) {
      if (!batch.recipients.length) {
        const remaining = await this.prisma.bulkMessageRecipient.count({
          where: { batchId: batch.id, status: BulkRecipientStatus.PENDING },
        });
        if (remaining === 0) {
          await this.completeBatchIfFinished(batch.id);
        }
        continue;
      }

      const throttle = batch.throttlePerMinute ?? this.DEFAULT_THROTTLE;
      const recentWindowStart = new Date(Date.now() - ONE_MINUTE_MS);
      const sentRecently = await this.prisma.bulkMessageRecipient.count({
        where: {
          batchId: batch.id,
          status: BulkRecipientStatus.SENT,
          updatedAt: { gt: recentWindowStart },
        },
      });
      const capacity = Math.max(0, throttle - sentRecently);
      if (!capacity) {
        continue;
      }

      await this.prisma.bulkMessageBatch.update({
        where: { id: batch.id },
        data: {
          status: BulkMessageStatus.SENDING,
          startedAt: batch.startedAt ?? new Date(),
        },
      });

      const recipients = batch.recipients.slice(0, capacity);
      const senderId = batch.creatorId;
      if (!senderId) {
        this.logger.error(`Skipping batch ${batch.id} because it is missing a creatorId.`);
        await this.prisma.bulkMessageBatch.update({
          where: { id: batch.id },
          data: { status: BulkMessageStatus.FAILED, completedAt: new Date() },
        });
        continue;
      }

      const batchMergeFields = ((batch.metadata ?? {}) as Record<string, string>) || {};
      for (const recipient of recipients) {
        await this.prisma.bulkMessageRecipient.update({
          where: { id: recipient.id },
          data: {
            status: BulkRecipientStatus.SENDING,
            attempts: recipient.attempts + 1,
            lastAttemptAt: new Date(),
          },
        });

        try {
          const mergeVariables = (recipient.mergeVariables ?? {}) as Record<string, string>;
          const rendered =
            recipient.renderedContent ??
            this.renderContent(batch.body, { ...batchMergeFields, ...mergeVariables });

          const message = await this.messagingService.sendMessage(
            { content: rendered, recipientId: recipient.userId },
            senderId,
          );

          await this.prisma.bulkMessageRecipient.update({
            where: { id: recipient.id },
            data: {
              status: BulkRecipientStatus.SENT,
              messageId: message.id,
              errorMessage: null,
              renderedContent: rendered,
              nextAttemptAt: null,
            },
          });

          await this.completeBatchIfFinished(batch.id);
        } catch (error) {
          await this.handleSendFailure(recipient, batch, error as Error);
        }
      }
    }
  }

  private async ensureBatchExists(batchId: number) {
    const batch = await this.prisma.bulkMessageBatch.findUnique({ where: { id: batchId } });
    if (!batch) {
      throw new BadRequestException('Bulk message batch not found');
    }
  }

  private buildSummary(
    statusCounts:
      | BulkRecipientStatus[]
      | { status: BulkRecipientStatus; count: number }[],
  ) {
    if (!statusCounts.length) {
      return { total: 0, sent: 0, failed: 0, pending: 0 };
    }

    const firstEntry = statusCounts[0] as any;

    if (typeof firstEntry === 'string') {
      const counts: Record<string, number> = {};
      (statusCounts as BulkRecipientStatus[]).forEach((status) => {
        counts[status] = (counts[status] ?? 0) + 1;
      });
      return {
        total: (statusCounts as BulkRecipientStatus[]).length,
        sent: counts[BulkRecipientStatus.SENT] ?? 0,
        failed: (counts[BulkRecipientStatus.FAILED] ?? 0) + (counts[BulkRecipientStatus.SKIPPED] ?? 0),
        pending:
          (counts[BulkRecipientStatus.PENDING] ?? 0) + (counts[BulkRecipientStatus.SENDING] ?? 0),
      };
    }

    const aggregate = statusCounts as { status: BulkRecipientStatus; count: number }[];
    const total = aggregate.reduce((sum, entry) => sum + entry.count, 0);
    const sent = aggregate
      .filter((entry) => entry.status === BulkRecipientStatus.SENT)
      .reduce((sum, entry) => sum + entry.count, 0);
    const failedStatuses: BulkRecipientStatus[] = [
      BulkRecipientStatus.FAILED,
      BulkRecipientStatus.SKIPPED,
    ];
    const failed = aggregate
      .filter((entry) => failedStatuses.includes(entry.status as BulkRecipientStatus))
      .reduce((sum, entry) => sum + entry.count, 0);
    const pending = total - sent - failed;

    return { total, sent, failed, pending };
  }

  private async resolveTemplateBody(dto: CreateBulkMessageDto) {
    if (!dto.templateId) {
      return dto.body;
    }

    const template = await this.prisma.messageTemplate.findUnique({
      where: { id: dto.templateId },
    });

    if (!template) {
      throw new BadRequestException('Template not found');
    }

    return template.body ?? dto.body;
  }

  private async resolveRecipients(
    filters: RecipientFilterDto | undefined,
    recipientIds: number[] | undefined,
    creatorId: number,
  ) {
    const ids = new Set<number>(recipientIds ?? []);
    const where: Prisma.UserWhereInput = {};

    if (filters?.roles?.length) {
      where.role = { in: filters.roles };
    }

    const andConditions: Prisma.UserWhereInput[] = [];

    if (filters?.search) {
      andConditions.push({
        OR: [{ username: { contains: filters.search, mode: 'insensitive' } }],
      });
    }

    if (filters?.propertyIds?.length || filters?.leaseStatuses?.length) {
      const leaseFilter: Prisma.LeaseWhereInput = {};
      if (filters.propertyIds?.length) {
        leaseFilter.unit = { propertyId: { in: filters.propertyIds } };
      }
      if (filters.leaseStatuses?.length) {
        leaseFilter.status = { in: filters.leaseStatuses };
      }
      andConditions.push({ lease: { is: leaseFilter } });
    }

    if (andConditions.length) {
      where.AND = andConditions;
    }

    const filterResults = filters
      ? await this.prisma.user.findMany({
          where,
          include: {
            lease: {
              include: { unit: { include: { property: true } } },
            },
          },
        })
      : [];

    const directRecipients = ids.size
      ? await this.prisma.user.findMany({
          where: { id: { in: Array.from(ids) } },
          include: {
            lease: {
              include: { unit: { include: { property: true } } },
            },
          },
        })
      : [];

    const combined = new Map<number, any>();
    for (const user of [...filterResults, ...directRecipients]) {
      if (user.id === creatorId) continue;
      combined.set(user.id, user);
    }

    return Array.from(combined.values()).map((user) => ({ user }));
  }

  private buildRecipientContext(user: any, templateBody: string, mergeFields: Record<string, string>) {
    const lease = (user.lease ?? null) as any;
    const propertyName = lease?.unit?.property?.name ?? '';
    const unitName = lease?.unit?.name ?? '';
    const derived = {
      username: user.username,
      fullName: user.username,
      propertyName,
      unitName,
    };
    const mergeVariables = { ...derived, ...mergeFields } as Record<string, string>;

    return {
      user,
      mergeVariables,
      renderedContent: this.renderContent(templateBody, mergeVariables),
    };
  }

  private renderContent(templateBody: string, mergeVariables: Record<string, string>) {
    return Object.entries(mergeVariables).reduce((acc, [key, value]) => {
      const pattern = new RegExp(`{{\\s*${key}\\s*}}`, 'gi');
      return acc.replace(pattern, value?.toString() ?? '');
    }, templateBody);
  }

  private async completeBatchIfFinished(batchId: number) {
    const pending = await this.prisma.bulkMessageRecipient.count({
      where: { batchId, status: { in: [BulkRecipientStatus.PENDING, BulkRecipientStatus.SENDING] } },
    });

    if (pending === 0) {
      const failures = await this.prisma.bulkMessageRecipient.count({
        where: { batchId, status: BulkRecipientStatus.FAILED },
      });
      await this.prisma.bulkMessageBatch.update({
        where: { id: batchId },
        data: {
          status: failures > 0 ? BulkMessageStatus.FAILED : BulkMessageStatus.COMPLETED,
          completedAt: new Date(),
        },
      });
    }
  }

  private async handleSendFailure(recipient: any, batch: any, error: Error) {
    const attempts = recipient.attempts + 1;
    const shouldRetry = attempts < (batch.maxRetries ?? 3);
    const backoffSeconds = Math.min(60, Math.pow(2, attempts));

    await this.prisma.bulkMessageRecipient.update({
      where: { id: recipient.id },
      data: {
        status: shouldRetry ? BulkRecipientStatus.PENDING : BulkRecipientStatus.FAILED,
        errorMessage: error.message,
        nextAttemptAt: shouldRetry ? new Date(Date.now() + backoffSeconds * 1000) : null,
      },
    });

    if (!shouldRetry) {
      await this.completeBatchIfFinished(batch.id);
    }
  }
}
