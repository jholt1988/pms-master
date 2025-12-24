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
          tenantId: this.normalizeId(dto.tenantId as any),
          unitId: this.normalizeNumericId(dto.unitId as any),
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

  async getLeaseById(id: string | number) {
    const leaseId = this.normalizeNumericId(id);
    const lease = await this.prisma.lease.findUnique({ where: { id: leaseId }, include: this.leaseInclude });
    if (!lease) {
      throw new NotFoundException('Lease not found');
    }
    return lease;
  }

  async getLeaseHistory(id: string | number) {
    const leaseId = this.normalizeNumericId(id);
    const lease = await this.prisma.lease.findUnique({ where: { id: leaseId } });
    if (!lease) {
      throw new NotFoundException('Lease not found');
    }
    return this.prisma.leaseHistory.findMany({
      where: { leaseId },
      include: { actor: { select: { id: true, username: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getLeaseByTenantId(tenantId: string | number) {
    const tenantIdStr = this.normalizeId(tenantId);
    return this.prisma.lease.findUnique({ where: { tenantId: tenantIdStr }, include: this.leaseInclude });
  }

  async updateLease(id: string | number, dto: UpdateLeaseDto, actorId: string | number) {
    const leaseId = this.normalizeNumericId(id);
    const actorIdStr = this.normalizeId(actorId);
    const lease = await this.ensureLease(leaseId);

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
      where: { id: leaseId },
      data,
      include: this.leaseInclude,
    });

    if (dto.rentAmount !== undefined || dto.depositAmount !== undefined) {
      await this.logHistory(updated.id, actorIdStr, {
        fromStatus: lease.status,
        toStatus: updated.status,
        rentAmount: updated.rentAmount,
        depositAmount: updated.depositAmount,
        note: 'Lease details updated',
      });
    }

    return updated;
  }

  async updateLeaseStatus(id: string | number, dto: UpdateLeaseStatusDto, actorId: string | number) {
    const leaseId = this.normalizeNumericId(id);
    const actorIdStr = this.normalizeId(actorId);
    const lease = await this.ensureLease(leaseId);

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

    const updated = await this.prisma.lease.update({ where: { id: leaseId }, data, include: this.leaseInclude });

    await this.logHistory(updated.id, actorIdStr, {
      fromStatus: lease.status,
      toStatus: updated.status,
      note: 'Lease status updated',
    });

    return updated;
  }

  async createRenewalOffer(id: string | number, dto: CreateRenewalOfferDto, actorId: string | number) {
    const leaseId = this.normalizeNumericId(id);
    const actorIdStr = this.normalizeId(actorId);
    const lease = await this.ensureLease(leaseId);

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
        const adjustment = await this.aiLeaseRenewalService.getRentAdjustmentRecommendation(Number(leaseId));
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
        leaseId,
        proposedRent,
        proposedStart,
        proposedEnd,
        escalationPercent: dto.escalationPercent,
        message: dto.message || (aiRentUsed ? rentAdjustmentDetails.reasoning : undefined),
        status: LeaseRenewalStatus.OFFERED,
        expiresAt: this.optionalDate(dto.expiresAt),
        respondedById: actorIdStr,
      },
    });

    const updated = await this.prisma.lease.update({
      where: { id: leaseId },
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

    await this.logHistory(updated.id, actorIdStr, {
      fromStatus: lease.status,
      toStatus: updated.status,
      note: historyNote,
      rentAmount: proposedRent,
    });

    return updated;
  }

  async recordLeaseNotice(id: string | number, dto: RecordLeaseNoticeDto, actorId: string | number) {
    const leaseId = this.normalizeNumericId(id);
    const actorIdStr = this.normalizeId(actorId);
    await this.ensureLease(leaseId);

    const notice = await this.prisma.leaseNotice.create({
      data: {
        lease: { connect: { id: leaseId } },
        type: dto.type,
        deliveryMethod: dto.deliveryMethod,
        message: dto.message,
        acknowledgedAt: this.optionalDate(dto.acknowledgedAt),
        createdBy: { connect: { id: actorIdStr } },
      },
      include: {
        lease: true,
      },
    });

    let updatedStatus: LeaseStatus | undefined;
    if (dto.type === LeaseNoticeType.MOVE_OUT) {
      updatedStatus = LeaseStatus.NOTICE_GIVEN;
      await this.prisma.lease.update({
        where: { id: leaseId },
        data: { status: updatedStatus },
      });
    }

    await this.logHistory(leaseId, actorIdStr, {
      fromStatus: notice.lease.status,
      toStatus: updatedStatus ?? notice.lease.status,
      note: `Notice recorded (${dto.type})`,
    });

    return this.getLeaseById(leaseId);
  }

  async respondToRenewalOffer(
    leaseId: string | number,
    offerId: string | number,
    dto: RespondRenewalOfferDto,
    tenantUserId: string | number,
  ) {
    const leaseIdNum = this.normalizeNumericId(leaseId);
    const offerIdNum = typeof offerId === 'string' ? Number(offerId) : offerId;
    const tenantUserIdStr = this.normalizeId(tenantUserId);
    const lease = await this.ensureLease(leaseIdNum);
    if (lease.tenantId !== tenantUserIdStr) {
      throw new ForbiddenException('You are not authorized to respond to this renewal offer.');
    }

    const offer = await this.prisma.leaseRenewalOffer.findUnique({ where: { id: offerIdNum } });
    if (!offer || offer.leaseId !== leaseIdNum) {
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
        where: { id: offerIdNum },
        data: {
          status: decisionStatus,
          respondedAt,
          respondedBy: { connect: { id: tenantUserIdStr } },
        },
      }),
      this.prisma.lease.update({
        where: { id: leaseIdNum },
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

    await this.logHistory(leaseIdNum, tenantUserIdStr, {
      fromStatus: lease.status,
      toStatus: updatedLease.status,
      note: noteParts.join(' '),
      rentAmount: updatedLease.rentAmount,
      metadata: historyMetadata,
    });

    return this.getLeaseById(leaseIdNum);
  }

  async submitTenantNotice(leaseId: string | number, dto: TenantSubmitNoticeDto, tenantUserId: string | number) {
    const leaseIdNum = this.normalizeNumericId(leaseId);
    const tenantUserIdStr = this.normalizeId(tenantUserId);
    const lease = await this.ensureLease(leaseIdNum);
    if (lease.tenantId !== tenantUserIdStr) {
      throw new ForbiddenException('You are not authorized to update this lease.');
    }

    const moveOutAt = this.requireDate(dto.moveOutAt, 'moveOutAt');

    const updatedStatus = dto.type === LeaseNoticeType.MOVE_OUT ? LeaseStatus.NOTICE_GIVEN : lease.status;

    const [, updatedLease] = await this.prisma.$transaction([
      this.prisma.leaseNotice.create({
        data: {
          lease: { connect: { id: leaseIdNum } },
          type: dto.type,
          deliveryMethod: LeaseNoticeDeliveryMethod.PORTAL,
          message: dto.message,
          createdBy: { connect: { id: tenantUserIdStr } },
        },
      }),
      this.prisma.lease.update({
        where: { id: leaseIdNum },
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

    await this.logHistory(leaseIdNum, tenantUserIdStr, {
      fromStatus: lease.status,
      toStatus: updatedLease.status,
      note: noteParts.join(' '),
      metadata,
    });

    return this.getLeaseById(leaseIdNum);
  }

  private async ensureLease(id: string | number) {
    const leaseId = this.normalizeNumericId(id);
    const lease = await this.prisma.lease.findUnique({ where: { id: leaseId }, include: this.leaseInclude });
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

  private normalizeId(id: string | number): string {
    return String(id);
  }

  private normalizeNumericId(id: string | number): number {
    const parsed = typeof id === 'string' ? Number(id) : id;
    if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
      throw new BadRequestException('Invalid numeric identifier provided.');
    }
    return parsed;
  }

  async logHistory(
    leaseId: string | number,
    actorId: string | number | undefined,
    data: {
      fromStatus?: LeaseStatus;
      toStatus?: LeaseStatus;
      note?: string;
      rentAmount?: number;
      depositAmount?: number;
      metadata?: Prisma.InputJsonValue;
    },
  ) {
    const leaseIdNum = this.normalizeNumericId(leaseId);
    const actorIdStr = actorId !== undefined ? this.normalizeId(actorId) : undefined;

    await this.prisma.leaseHistory.create({
      data: {
        lease: { connect: { id: leaseIdNum } },
        actor: actorIdStr ? { connect: { id: actorIdStr } } : undefined,
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
  async prepareForVacancy(leaseId: string | number): Promise<void> {
    const leaseIdNum = this.normalizeNumericId(leaseId);
    const lease = await this.prisma.lease.findUnique({
      where: { id: leaseIdNum },
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
    // 2. Ensure marketing profile exists or create one, and set availableOn
    const property = lease.unit.property;
    if (property) {
      const existingProfile = await this.prisma.propertyMarketingProfile.findUnique({
        where: { propertyId: property.id },
      });

      if (!existingProfile) {
        await this.prisma.propertyMarketingProfile.create({
          data: {
            propertyId: property.id,
            availableOn: lease.endDate,
            isSyndicationEnabled: true,
          },
        });
        this.logger.log(`Created marketing profile for property ${property.id}`);
      } else {
        // Update availableOn when lease ends
        await this.prisma.propertyMarketingProfile.update({
          where: { propertyId: property.id },
          data: { 
            availableOn: lease.endDate,
            availabilityStatus: 'AVAILABLE',
          },
        });
        this.logger.log(`Updated marketing profile for property ${property.id}`);
      }
    }

    // 3. Schedule move-out inspection (7 days before lease ends)
    const inspectionDate = new Date(lease.endDate);
    inspectionDate.setDate(inspectionDate.getDate() - 7);

    if (property) {
      // Get system user or first admin for createdBy
      const systemUser = await this.prisma.user.findFirst({
        where: { role: 'ADMIN' },
      });

      if (systemUser) {
        await this.prisma.unitInspection.create({
          data: {
            unit: {
              connect: { id: lease.unitId },
            },
            property: {
              connect: { id: property.id },
            },
            lease: {
              connect: { id: leaseIdNum },
            },
            createdBy: {
              connect: { id: systemUser.id },
            },
            type: 'MOVE_OUT',
            status: 'SCHEDULED',
            scheduledDate: inspectionDate,
            notes: 'Automatically scheduled due to low renewal likelihood',
          },
        });
        this.logger.log(`Scheduled move-out inspection for lease ${leaseId} on ${inspectionDate.toISOString()}`);
      } else {
        this.logger.warn(`Could not schedule inspection: No admin user found`);
      }
    }

    // 4. Log the action
    await this.logHistory(leaseIdNum, 0, {
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




