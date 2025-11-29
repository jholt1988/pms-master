import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  LeaseNoticeDeliveryMethod,
  LeaseNoticeType,
  LeaseRenewalStatus,
  LeaseStatus,
  LeaseTerminationParty,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLeaseDto } from './dto/create-lease.dto';
import { UpdateLeaseDto } from './dto/update-lease.dto';
import { UpdateLeaseStatusDto } from './dto/update-lease-status.dto';
import { CreateRenewalOfferDto } from './dto/create-renewal-offer.dto';
import { RecordLeaseNoticeDto } from './dto/record-lease-notice.dto';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { RespondRenewalOfferDto, RenewalDecision } from './dto/respond-renewal-offer.dto';
import { TenantSubmitNoticeDto } from './dto/tenant-submit-notice.dto';
import { AILeaseRenewalService } from './ai-lease-renewal.service';

@Injectable()
export class LeaseService {
  private readonly logger = new Logger(LeaseService.name);

  constructor(
    private prisma: PrismaService,
    private readonly aiLeaseRenewalService: AILeaseRenewalService,
  ) {}

  private readonly leaseInclude: Prisma.LeaseInclude = {
    tenant: { select: { id: true, username: true, role: true } },
    unit: { include: { property: true } },
    recurringSchedule: true,
    autopayEnrollment: {
      include: { paymentMethod: true },
    },
    history: {
      include: { actor: { select: { id: true, username: true } } },
      orderBy: { createdAt: 'desc' },
      take: 25,
    },
    renewalOffers: {
      orderBy: { createdAt: 'desc' },
      take: 10,
    },
    notices: {
      orderBy: { sentAt: 'desc' },
      take: 10,
    },
    esignEnvelopes: {
      include: {
        participants: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    },
  };

  async createLease(dto: CreateLeaseDto) {
    const startDate = this.requireDate(dto.startDate, 'startDate');
    const endDate = this.requireDate(dto.endDate, 'endDate');

    if (startDate >= endDate) {
      throw new BadRequestException('Lease end date must be after start date.');
    }

    try {
      const lease = await this.prisma.lease.create({
        data: {
          tenantId: dto.tenantId,
          unitId: dto.unitId,
          startDate,
          endDate,
          rentAmount: dto.rentAmount,
          status: dto.status ?? LeaseStatus.ACTIVE,
          moveInAt: this.optionalDate(dto.moveInAt) ?? startDate,
          moveOutAt: this.optionalDate(dto.moveOutAt),
          noticePeriodDays: dto.noticePeriodDays ?? 30,
          autoRenew: dto.autoRenew ?? false,
          autoRenewLeadDays: dto.autoRenewLeadDays,
          depositAmount: dto.depositAmount ?? 0,
        },
        include: this.leaseInclude,
      });

      await this.logHistory(lease.id, undefined, {
        toStatus: lease.status,
        note: 'Lease created',
        rentAmount: lease.rentAmount,
        depositAmount: lease.depositAmount,
      });

      return lease;
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async getAllLeases() {
    return this.prisma.lease.findMany({
      include: this.leaseInclude,
      orderBy: [{ status: 'asc' }, { endDate: 'asc' }],
    });
  }

  async getLeaseById(id: number) {
    const lease = await this.prisma.lease.findUnique({ where: { id }, include: this.leaseInclude });
    if (!lease) {
      throw new NotFoundException('Lease not found');
    }
    return lease;
  }

  async getLeaseHistory(id: number) {
    const lease = await this.prisma.lease.findUnique({ where: { id } });
    if (!lease) {
      throw new NotFoundException('Lease not found');
    }
    return this.prisma.leaseHistory.findMany({
      where: { leaseId: id },
      include: { actor: { select: { id: true, username: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getLeaseByTenantId(tenantId: number) {
    return this.prisma.lease.findUnique({ where: { tenantId }, include: this.leaseInclude });
  }

  async updateLease(id: number, dto: UpdateLeaseDto, actorId: number) {
    const lease = await this.ensureLease(id);

    const data: Prisma.LeaseUncheckedUpdateInput = {};
    if (dto.startDate) {
      data.startDate = this.requireDate(dto.startDate, 'startDate');
    }
    if (dto.endDate) {
      data.endDate = this.requireDate(dto.endDate, 'endDate');
    }
    if (dto.moveInAt) {
      data.moveInAt = this.requireDate(dto.moveInAt, 'moveInAt');
    }
    if (dto.moveOutAt) {
      data.moveOutAt = this.requireDate(dto.moveOutAt, 'moveOutAt');
    }
    if (dto.rentAmount !== undefined) {
      data.rentAmount = dto.rentAmount;
    }
    if (dto.depositAmount !== undefined) {
      data.depositAmount = dto.depositAmount;
    }
    if (dto.noticePeriodDays !== undefined) {
      data.noticePeriodDays = dto.noticePeriodDays;
    }
    if (dto.autoRenew !== undefined) {
      data.autoRenew = dto.autoRenew;
    }
    if (dto.autoRenewLeadDays !== undefined) {
      data.autoRenewLeadDays = dto.autoRenewLeadDays;
    }
    if (dto.terminationReason !== undefined) {
      data.terminationReason = dto.terminationReason;
    }

    const updated = await this.prisma.lease.update({
      where: { id },
      data,
      include: this.leaseInclude,
    });

    if (dto.rentAmount !== undefined || dto.depositAmount !== undefined) {
      await this.logHistory(updated.id, actorId, {
        fromStatus: lease.status,
        toStatus: updated.status,
        rentAmount: updated.rentAmount,
        depositAmount: updated.depositAmount,
        note: 'Lease details updated',
      });
    }

    return updated;
  }

  async updateLeaseStatus(id: number, dto: UpdateLeaseStatusDto, actorId: number) {
    const lease = await this.ensureLease(id);

    const data: Prisma.LeaseUncheckedUpdateInput = {
      status: dto.status,
    };

    if (dto.moveInAt) {
      data.moveInAt = this.requireDate(dto.moveInAt, 'moveInAt');
    }
    if (dto.moveOutAt) {
      data.moveOutAt = this.requireDate(dto.moveOutAt, 'moveOutAt');
    }
    if (dto.noticePeriodDays !== undefined) {
      data.noticePeriodDays = dto.noticePeriodDays;
    }
    if (dto.renewalDueAt) {
      data.renewalDueAt = this.requireDate(dto.renewalDueAt, 'renewalDueAt');
    }
    if (dto.renewalAcceptedAt) {
      data.renewalAcceptedAt = this.requireDate(dto.renewalAcceptedAt, 'renewalAcceptedAt');
    }
    if (dto.terminationEffectiveAt) {
      data.terminationEffectiveAt = this.requireDate(dto.terminationEffectiveAt, 'terminationEffectiveAt');
    }
    if (dto.terminationRequestedBy) {
      data.terminationRequestedBy = dto.terminationRequestedBy;
    }
    if (dto.terminationReason !== undefined) {
      data.terminationReason = dto.terminationReason;
    }
    if (dto.rentEscalationPercent !== undefined) {
      data.rentEscalationPercent = dto.rentEscalationPercent;
    }
    if (dto.rentEscalationEffectiveAt) {
      data.rentEscalationEffectiveAt = this.requireDate(dto.rentEscalationEffectiveAt, 'rentEscalationEffectiveAt');
    }
    if (dto.currentBalance !== undefined) {
      data.currentBalance = dto.currentBalance;
    }
    if (dto.autoRenew !== undefined) {
      data.autoRenew = dto.autoRenew;
    }

    const updated = await this.prisma.lease.update({ where: { id }, data, include: this.leaseInclude });

    await this.logHistory(updated.id, actorId, {
      fromStatus: lease.status,
      toStatus: updated.status,
      note: 'Lease status updated',
    });

    return updated;
  }

  async createRenewalOffer(id: number, dto: CreateRenewalOfferDto, actorId: number) {
    const lease = await this.ensureLease(id);

    const proposedStart = this.requireDate(dto.proposedStart, 'proposedStart');
    const proposedEnd = this.requireDate(dto.proposedEnd, 'proposedEnd');

    if (proposedStart >= proposedEnd) {
      throw new BadRequestException('Renewal offer start date must be before end date.');
    }

    // Get optimal rent adjustment if not provided
    let proposedRent = dto.proposedRent;
    let aiRentUsed = false;
    let rentAdjustmentDetails: {
      adjustmentPercentage?: number;
      reasoning?: string;
      factors?: Array<{ name: string; impact: number; description: string }>;
    } = {};

    if (!dto.proposedRent || dto.proposedRent === 0) {
      try {
        const startTime = Date.now();
        const adjustment = await this.aiLeaseRenewalService.getRentAdjustmentRecommendation(id);
        const responseTime = Date.now() - startTime;

        proposedRent = adjustment.recommendedRent;
        aiRentUsed = true;
        rentAdjustmentDetails = {
          adjustmentPercentage: adjustment.adjustmentPercentage,
          reasoning: adjustment.reasoning,
          factors: adjustment.factors,
        };

        this.logger.log(
          `AI recommended rent adjustment for lease ${id}: ` +
          `$${Number(lease.rentAmount).toFixed(2)} → $${proposedRent.toFixed(2)} ` +
          `(${adjustment.adjustmentPercentage > 0 ? '+' : ''}${adjustment.adjustmentPercentage.toFixed(1)}%) ` +
          `(${responseTime}ms)`,
        );
      } catch (error) {
        this.logger.warn(
          `AI rent adjustment failed for lease ${id}, using current rent`,
          error instanceof Error ? error.message : String(error),
        );
        // Fallback to current rent
        proposedRent = Number(lease.rentAmount);
      }
    }

    const offer = await this.prisma.leaseRenewalOffer.create({
      data: {
        leaseId: id,
        proposedRent,
        proposedStart,
        proposedEnd,
        escalationPercent: dto.escalationPercent,
        message: dto.message || (aiRentUsed ? rentAdjustmentDetails.reasoning : undefined),
        status: LeaseRenewalStatus.OFFERED,
        expiresAt: this.optionalDate(dto.expiresAt),
        respondedById: actorId,
      },
    });

    const updated = await this.prisma.lease.update({
      where: { id },
      data: {
        status: LeaseStatus.RENEWAL_PENDING,
        renewalOfferedAt: new Date(),
        renewalDueAt: this.optionalDate(dto.expiresAt) ?? lease.renewalDueAt ?? this.addDays(lease.endDate, -30),
      },
      include: this.leaseInclude,
    });

    const historyNote = aiRentUsed
      ? `Renewal offer sent with AI-recommended rent (${rentAdjustmentDetails.adjustmentPercentage?.toFixed(1)}% adjustment)`
      : 'Renewal offer sent';

    await this.logHistory(updated.id, actorId, {
      fromStatus: lease.status,
      toStatus: updated.status,
      note: historyNote,
      rentAmount: proposedRent,
    });

    return updated;
  }

  async recordLeaseNotice(id: number, dto: RecordLeaseNoticeDto, actorId: number) {
    await this.ensureLease(id);

    const notice = await this.prisma.leaseNotice.create({
      data: {
        lease: { connect: { id } },
        type: dto.type,
        deliveryMethod: dto.deliveryMethod,
        message: dto.message,
        acknowledgedAt: this.optionalDate(dto.acknowledgedAt),
        createdBy: { connect: { id: actorId } },
      },
      include: {
        lease: true,
      },
    });

    let updatedStatus: LeaseStatus | undefined;
    if (dto.type === LeaseNoticeType.MOVE_OUT) {
      updatedStatus = LeaseStatus.NOTICE_GIVEN;
      await this.prisma.lease.update({
        where: { id },
        data: { status: updatedStatus },
      });
    }

    await this.logHistory(id, actorId, {
      fromStatus: notice.lease.status,
      toStatus: updatedStatus ?? notice.lease.status,
      note: `Notice recorded (${dto.type})`,
    });

    return this.getLeaseById(id);
  }

  async respondToRenewalOffer(
    leaseId: number,
    offerId: number,
    dto: RespondRenewalOfferDto,
    tenantUserId: number,
  ) {
    const lease = await this.ensureLease(leaseId);
    if (lease.tenantId !== tenantUserId) {
      throw new ForbiddenException('You are not authorized to respond to this renewal offer.');
    }

    const offer = await this.prisma.leaseRenewalOffer.findUnique({ where: { id: offerId } });
    if (!offer || offer.leaseId !== leaseId) {
      throw new NotFoundException('Renewal offer not found.');
    }

    if (offer.status !== LeaseRenewalStatus.OFFERED) {
      throw new BadRequestException('This renewal offer is no longer actionable.');
    }

    const respondedAt = new Date();
    const decisionStatus =
      dto.decision === RenewalDecision.ACCEPTED ? LeaseRenewalStatus.ACCEPTED : LeaseRenewalStatus.DECLINED;

    if (dto.decision === RenewalDecision.ACCEPTED && offer.expiresAt && offer.expiresAt < respondedAt) {
      throw new BadRequestException('This renewal offer has already expired.');
    }

    const leaseUpdate: Prisma.LeaseUncheckedUpdateInput = {};
    if (dto.decision === RenewalDecision.ACCEPTED) {
      leaseUpdate.status = LeaseStatus.ACTIVE;
      leaseUpdate.renewalAcceptedAt = respondedAt;
      leaseUpdate.startDate = offer.proposedStart;
      leaseUpdate.endDate = offer.proposedEnd;
      leaseUpdate.rentAmount = offer.proposedRent;
      leaseUpdate.rentEscalationPercent = offer.escalationPercent ?? lease.rentEscalationPercent;
      leaseUpdate.rentEscalationEffectiveAt = offer.proposedStart;
      leaseUpdate.renewalDueAt = null;
    } else {
      leaseUpdate.status = LeaseStatus.RENEWAL_PENDING;
      leaseUpdate.renewalAcceptedAt = null;
    }

    const [, updatedLease] = await this.prisma.$transaction([
      this.prisma.leaseRenewalOffer.update({
        where: { id: offerId },
        data: {
          status: decisionStatus,
          respondedAt,
          respondedBy: { connect: { id: tenantUserId } },
        },
      }),
      this.prisma.lease.update({
        where: { id: leaseId },
        data: leaseUpdate,
      }),
    ]);

    const noteParts = [
      `Tenant ${dto.decision === RenewalDecision.ACCEPTED ? 'accepted' : 'declined'} renewal offer #${offerId}.`,
    ];
    if (dto.message?.trim()) {
      noteParts.push(`Message: ${dto.message.trim()}`);
    }

    const historyMetadata: Prisma.JsonObject = {
      renewalOfferId: offerId,
      decision: dto.decision,
      respondedAt: respondedAt.toISOString(),
    };
    if (dto.message?.trim()) {
      historyMetadata.message = dto.message.trim();
    }

    await this.logHistory(leaseId, tenantUserId, {
      fromStatus: lease.status,
      toStatus: updatedLease.status,
      note: noteParts.join(' '),
      rentAmount: updatedLease.rentAmount,
      metadata: historyMetadata,
    });

    return this.getLeaseById(leaseId);
  }

  async submitTenantNotice(leaseId: number, dto: TenantSubmitNoticeDto, tenantUserId: number) {
    const lease = await this.ensureLease(leaseId);
    if (lease.tenantId !== tenantUserId) {
      throw new ForbiddenException('You are not authorized to update this lease.');
    }

    const moveOutAt = this.requireDate(dto.moveOutAt, 'moveOutAt');

    const updatedStatus = dto.type === LeaseNoticeType.MOVE_OUT ? LeaseStatus.NOTICE_GIVEN : lease.status;

    const [, updatedLease] = await this.prisma.$transaction([
      this.prisma.leaseNotice.create({
        data: {
          lease: { connect: { id: leaseId } },
          type: dto.type,
          deliveryMethod: LeaseNoticeDeliveryMethod.PORTAL,
          message: dto.message,
          createdBy: { connect: { id: tenantUserId } },
        },
      }),
      this.prisma.lease.update({
        where: { id: leaseId },
        data: {
          moveOutAt: dto.type === LeaseNoticeType.MOVE_OUT ? moveOutAt : lease.moveOutAt,
          status: updatedStatus,
          terminationRequestedBy: LeaseTerminationParty.TENANT,
        },
      }),
    ]);

    const noteParts = [`Tenant submitted ${dto.type.toLowerCase().replace('_', ' ')} notice via portal.`];
    if (dto.message?.trim()) {
      noteParts.push(`Message: ${dto.message.trim()}`);
    }

    const metadata: Prisma.JsonObject = {
      noticeType: dto.type,
      submittedAt: new Date().toISOString(),
    };
    if (dto.type === LeaseNoticeType.MOVE_OUT) {
      metadata.requestedMoveOut = moveOutAt.toISOString();
    }
    if (dto.message?.trim()) {
      metadata.message = dto.message.trim();
    }

    await this.logHistory(leaseId, tenantUserId, {
      fromStatus: lease.status,
      toStatus: updatedLease.status,
      note: noteParts.join(' '),
      metadata,
    });

    return this.getLeaseById(leaseId);
  }

  private async ensureLease(id: number) {
    const lease = await this.prisma.lease.findUnique({ where: { id }, include: this.leaseInclude });
    if (!lease) {
      throw new NotFoundException('Lease not found');
    }
    return lease;
  }

  private requireDate(value: string | Date, field: string): Date {
    const date = this.optionalDate(value);
    if (!date) {
      throw new BadRequestException(`Invalid ${field} provided.`);
    }
    return date;
  }

  private optionalDate(value?: string | Date | null): Date | undefined {
    if (!value) {
      return undefined;
    }
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('Invalid date value provided.');
    }
    return date;
  }

  private handlePrismaError(error: unknown): never {
    if (error instanceof PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        throw new BadRequestException('A tenant or unit already has an active lease.');
      }
    }
    throw error;
  }

  async logHistory(
    leaseId: number,
    actorId: number | undefined,
    data: {
      fromStatus?: LeaseStatus;
      toStatus?: LeaseStatus;
      note?: string;
      rentAmount?: number;
      depositAmount?: number;
      metadata?: Prisma.InputJsonValue;
    },
  ) {
    await this.prisma.leaseHistory.create({
      data: {
        lease: { connect: { id: leaseId } },
        actor: actorId ? { connect: { id: actorId } } : undefined,
        fromStatus: data.fromStatus,
        toStatus: data.toStatus,
        note: data.note,
        rentAmount: data.rentAmount,
        depositAmount: data.depositAmount,
        metadata: data.metadata,
      },
    });
  }

  /**
   * Get leases expiring within a specified number of days
   */
  async getLeasesExpiringInDays(days: number): Promise<any[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const targetDate = new Date(today);
    targetDate.setDate(targetDate.getDate() + days);

    return this.prisma.lease.findMany({
      where: {
        status: LeaseStatus.ACTIVE,
        endDate: {
          gte: today,
          lte: targetDate,
        },
        renewalOfferedAt: null, // Only get leases without existing offers
      },
      include: {
        tenant: true,
        unit: {
          include: { property: true },
        },
        renewalOffers: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { endDate: 'asc' },
    });
  }

  /**
   * Prepare for vacancy (mark unit as potentially available, start marketing)
   */
  async prepareForVacancy(leaseId: number): Promise<void> {
    const lease = await this.prisma.lease.findUnique({
      where: { id: leaseId },
      include: {
        unit: {
          include: {
            property: true,
          },
        },
        tenant: true,
      },
    });

    if (!lease) {
      throw new NotFoundException('Lease not found');
    }

    this.logger.log(`Preparing for vacancy: Lease ${leaseId} ending, unit ${lease.unitId} will be available`);

    // 1. Mark unit as potentially available (set availableOn to lease end date)
    await this.prisma.unit.update({
      where: { id: lease.unitId },
      data: {
        availableOn: lease.endDate,
      },
    });

    // 2. Ensure marketing profile exists or create one
    const property = lease.unit.property;
    if (property) {
      const existingProfile = await this.prisma.propertyMarketingProfile.findUnique({
        where: { propertyId: property.id },
      });

      if (!existingProfile) {
        await this.prisma.propertyMarketingProfile.create({
          data: {
            propertyId: property.id,
            isActive: true,
            isSyndicationEnabled: true,
          },
        });
        this.logger.log(`Created marketing profile for property ${property.id}`);
      } else if (!existingProfile.isActive) {
        await this.prisma.propertyMarketingProfile.update({
          where: { propertyId: property.id },
          data: { isActive: true },
        });
        this.logger.log(`Activated marketing profile for property ${property.id}`);
      }
    }

    // 3. Schedule move-out inspection (7 days before lease ends)
    const inspectionDate = new Date(lease.endDate);
    inspectionDate.setDate(inspectionDate.getDate() - 7);

    await this.prisma.unitInspection.create({
      data: {
        unitId: lease.unitId,
        propertyId: property?.id || 0,
        leaseId: leaseId,
        type: 'MOVE_OUT',
        status: 'SCHEDULED',
        scheduledDate: inspectionDate,
        notes: 'Automatically scheduled due to low renewal likelihood',
      },
    });
    this.logger.log(`Scheduled move-out inspection for lease ${leaseId} on ${inspectionDate.toISOString()}`);

    // 4. Log the action
    await this.logHistory(leaseId, 0, {
      fromStatus: lease.status,
      toStatus: lease.status,
      note: `Prepared for vacancy due to low renewal likelihood. Unit marked available on ${lease.endDate.toISOString()}, inspection scheduled for ${inspectionDate.toISOString()}`,
    });

    this.logger.log(`Successfully prepared for vacancy: Lease ${leaseId}, Unit ${lease.unitId}`);
  }

  private addDays(date: Date, days: number) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }
}




