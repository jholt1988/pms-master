import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantHealthService } from './tenant-health.service';
import { ListTenantsDto } from './dto/list-tenants.dto';
import { UpdateTenantProfileDto } from './dto/update-tenant-profile.dto';
import { CreateHouseholdMemberDto } from './dto/create-household-member.dto';
import { CreateViolationDto } from './dto/create-violation.dto';
import { Prisma, TenantRelationshipStatus, TenantHealthClassification } from '@prisma/client';
import { AuditLogService } from '../shared/audit-log.service';

@Injectable()
export class TenantService {
  private readonly logger = new Logger(TenantService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly healthService: TenantHealthService,
    private readonly auditLogService: AuditLogService,
  ) {}

  private readonly tenantSelect = {
    id: true,
    username: true,
    firstName: true,
    lastName: true,
    email: true,
    phoneNumber: true,
    role: true,
    lastLoginAt: true,
    tenantProfile: {
      include: {
        householdMembers: true,
        violations: { where: { isResolved: false }, orderBy: { createdAt: 'desc' as const } },
      },
    },
    lease: {
      include: {
        unit: { include: { property: true } },
        renewalOffers: { orderBy: { createdAt: 'desc' as const }, take: 1 },
        notices: { orderBy: { sentAt: 'desc' as const }, take: 5 },
        autopayEnrollment: true,
      },
    },
  };

  async listTenants(query: ListTenantsDto, orgId?: string) {
    const skip = query.skip ?? 0;
    const take = query.take ?? 25;

    const where: Prisma.UserWhereInput = { role: 'TENANT' };

    if (query.search) {
      where.OR = [
        { firstName: { contains: query.search, mode: 'insensitive' } },
        { lastName: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { username: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.status) {
      where.tenantProfile = {
        relationshipStatus: query.status as TenantRelationshipStatus,
      };
    }

    if (query.healthClass) {
      where.tenantProfile = {
        ...((where.tenantProfile as any) ?? {}),
        healthClass: query.healthClass as TenantHealthClassification,
      };
    }

    if (query.propertyId) {
      where.lease = { unit: { propertyId: query.propertyId } };
    }

    if (query.unitId) {
      where.lease = { ...((where.lease as any) ?? {}), unitId: query.unitId };
    }

    if (query.delinquent === 'true') {
      where.tenantProfile = {
        ...((where.tenantProfile as any) ?? {}),
        relationshipStatus: 'DELINQUENT',
      };
    }

    if (query.leaseEndingSoon === 'true') {
      const ninetyDaysOut = new Date();
      ninetyDaysOut.setDate(ninetyDaysOut.getDate() + 90);
      where.lease = {
        ...((where.lease as any) ?? {}),
        endDate: { lte: ninetyDaysOut },
        status: { in: ['ACTIVE', 'RENEWAL_PENDING'] },
      };
    }

    if (query.openMaintenance === 'true') {
      where.requests = { some: { status: { not: 'COMPLETED' } } };
    }

    if (query.former === 'true') {
      where.tenantProfile = {
        ...((where.tenantProfile as any) ?? {}),
        relationshipStatus: 'FORMER',
      };
    }

    if (orgId) {
      where.lease = {
        ...((where.lease as any) ?? {}),
        unit: {
          ...((where.lease as any)?.unit ?? {}),
          property: { organizationId: orgId },
        },
      };
    }

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: this.tenantSelect,
        skip,
        take,
        orderBy: { lastName: 'asc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    const tenants = await Promise.all(
      data.map(async (user) => {
        const openMaintenance = await this.prisma.maintenanceRequest.count({
          where: { authorId: user.id, status: { not: 'COMPLETED' } },
        });

        const health = user.tenantProfile
          ? { classification: user.tenantProfile.healthClass }
          : { classification: 'STABLE' as const };

        const lease = user.lease;
        const daysUntilLeaseEnd = lease
          ? Math.floor((lease.endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          : null;

        return {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phoneNumber,
          status: user.tenantProfile?.relationshipStatus ?? 'ACTIVE',
          healthClass: health.classification,
          tags: user.tenantProfile?.tags ?? [],
          unit: lease?.unit?.name ?? null,
          unitId: lease?.unitId ?? null,
          property: lease?.unit?.property?.name ?? null,
          propertyId: lease?.unit?.propertyId ?? null,
          leaseEnd: lease?.endDate ?? null,
          daysUntilLeaseEnd,
          rentAmount: lease?.rentAmount ?? null,
          currentBalance: lease?.currentBalance ?? 0,
          autopayActive: !!lease?.autopayEnrollment?.active,
          openMaintenanceCount: openMaintenance,
          lastContactAt: null,
        };
      }),
    );

    return { data: tenants, total, skip, take };
  }

  async getTenantById(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: this.tenantSelect,
    });

    if (!user) throw new NotFoundException('Tenant not found');
    return user;
  }

  async getTenantWorkspace(userId: string) {
    const [
      user,
      health,
      payments,
      maintenanceRequests,
      communications,
      documents,
    ] = await Promise.all([
      this.getTenantById(userId),
      this.healthService.computeHealth(userId),
      this.getPaymentSummary(userId),
      this.getMaintenanceHistory(userId),
      this.getCommunicationTimeline(userId),
      this.getDocuments(userId),
    ]);

    const lease = user.lease;
    const daysUntilLeaseEnd = lease
      ? Math.floor((lease.endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : null;

    const lastComm = communications.length > 0 ? communications[0] : null;
    const daysSinceContact = lastComm
      ? Math.floor((Date.now() - new Date(lastComm.createdAt).getTime()) / (1000 * 60 * 60 * 24))
      : null;

    return {
      profile: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        preferredName: user.tenantProfile?.preferredName,
        email: user.email,
        phone: user.phoneNumber,
        status: user.tenantProfile?.relationshipStatus ?? 'ACTIVE',
        tags: user.tenantProfile?.tags ?? [],
        pets: user.tenantProfile?.pets,
        vehicles: user.tenantProfile?.vehicles,
        idVerified: user.tenantProfile?.idVerified ?? false,
        householdMembers: user.tenantProfile?.householdMembers ?? [],
      },
      lease: lease
        ? {
            id: lease.id,
            status: lease.status,
            startDate: lease.startDate,
            endDate: lease.endDate,
            rentAmount: lease.rentAmount,
            depositAmount: lease.depositAmount,
            currentBalance: lease.currentBalance,
            daysUntilEnd: daysUntilLeaseEnd,
            unit: lease.unit?.name,
            unitId: lease.unitId,
            property: lease.unit?.property?.name,
            propertyId: lease.unit?.propertyId,
            autopayActive: !!lease.autopayEnrollment?.active,
            renewalStatus: lease.renewalOffers?.[0]?.status ?? null,
          }
        : null,
      summary: {
        status: user.tenantProfile?.relationshipStatus ?? 'ACTIVE',
        paymentHealth: health.dimensions.paymentStability >= 80 ? 'Stable' : health.dimensions.paymentStability >= 60 ? 'Watch' : 'At Risk',
        leaseEndsIn: daysUntilLeaseEnd != null ? `${daysUntilLeaseEnd} days` : 'N/A',
        openIssues: maintenanceRequests.filter((r: any) => r.status !== 'COMPLETED').length,
        lastContact: daysSinceContact != null ? `${daysSinceContact} days ago` : 'Never',
      },
      health,
      payments,
      maintenance: maintenanceRequests,
      communications,
      documents,
      violations: user.tenantProfile?.violations ?? [],
      notices: user.lease?.notices ?? [],
    };
  }

  async getActivityTimeline(userId: string, limit = 50) {
    const [payments, maintenance, comms, notices, leaseHistory] = await Promise.all([
      this.prisma.payment.findMany({
        where: { userId },
        orderBy: { paymentDate: 'desc' },
        take: limit,
        select: { id: true, amount: true, paymentDate: true, status: true },
      }),
      this.prisma.maintenanceRequest.findMany({
        where: { authorId: userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: { id: true, title: true, status: true, createdAt: true, completedAt: true },
      }),
      this.prisma.communicationLog.findMany({
        where: { tenantId: userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: { id: true, channel: true, direction: true, subject: true, message: true, createdAt: true },
      }),
      this.prisma.leaseNotice.findMany({
        where: { lease: { tenantId: userId } },
        orderBy: { sentAt: 'desc' },
        take: limit,
        select: { id: true, type: true, message: true, sentAt: true },
      }),
      this.prisma.leaseHistory.findMany({
        where: { lease: { tenantId: userId } },
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: { id: true, fromStatus: true, toStatus: true, note: true, createdAt: true },
      }),
    ]);

    const events = [
      ...payments.map((p) => ({
        id: `pay-${p.id}`,
        date: p.paymentDate,
        type: 'payment' as const,
        title: `Payment $${p.amount.toLocaleString()}`,
        details: `Status: ${p.status}`,
      })),
      ...maintenance.map((m) => ({
        id: `maint-${m.id}`,
        date: m.createdAt,
        type: 'maintenance' as const,
        title: m.title,
        details: `Status: ${m.status}`,
      })),
      ...comms.map((c) => ({
        id: `comm-${c.id}`,
        date: c.createdAt,
        type: 'communication' as const,
        title: `${c.channel} ${c.direction.toLowerCase()}`,
        details: c.subject ?? c.message?.slice(0, 80),
      })),
      ...notices.map((n) => ({
        id: `notice-${n.id}`,
        date: n.sentAt,
        type: 'notice' as const,
        title: `Notice: ${n.type}`,
        details: n.message ?? '',
      })),
      ...leaseHistory.map((h) => ({
        id: `lease-${h.id}`,
        date: h.createdAt,
        type: 'lease' as const,
        title: `Lease ${h.fromStatus ?? ''} → ${h.toStatus}`,
        details: h.note ?? '',
      })),
    ];

    events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return events.slice(0, limit);
  }

  async updateProfile(userId: string, dto: UpdateTenantProfileDto, actorId?: string) {
    let profile = await this.prisma.tenantProfile.findUnique({ where: { userId } });

    const data: any = {};
    if (dto.preferredName !== undefined) data.preferredName = dto.preferredName;
    if (dto.tags !== undefined) data.tags = dto.tags;
    if (dto.pets !== undefined) data.pets = dto.pets;
    if (dto.vehicles !== undefined) data.vehicles = dto.vehicles;
    if (dto.idVerified !== undefined) {
      data.idVerified = dto.idVerified;
      if (dto.idVerified) data.idVerifiedAt = new Date();
    }
    if (dto.notes !== undefined) data.notes = dto.notes;

    if (!profile) {
      profile = await this.prisma.tenantProfile.create({
        data: { userId, ...data },
      });
    } else {
      profile = await this.prisma.tenantProfile.update({
        where: { userId },
        data,
      });
    }

    if (dto.status) {
      const newStatus = dto.status as TenantRelationshipStatus;
      const oldStatus = profile.relationshipStatus;

      if (newStatus !== oldStatus) {
        await this.prisma.$transaction([
          this.prisma.tenantProfile.update({
            where: { userId },
            data: { relationshipStatus: newStatus },
          }),
          this.prisma.tenantStatusHistory.create({
            data: {
              tenantProfileId: profile.id,
              fromStatus: oldStatus,
              toStatus: newStatus,
              changedById: actorId,
            },
          }),
        ]);
      }
    }

    if (actorId) {
      await this.auditLogService.log('TENANT_PROFILE_UPDATED', actorId, {
        tenantId: userId,
        changes: dto,
      });
    }

    return profile;
  }

  async addHouseholdMember(userId: string, dto: CreateHouseholdMemberDto, actorId?: string) {
    const profile = await this.ensureProfile(userId);

    const member = await this.prisma.householdMember.create({
      data: {
        tenantProfileId: profile.id,
        name: dto.name,
        relationship: dto.relationship,
        phone: dto.phone,
        email: dto.email,
        isEmergency: dto.isEmergency ?? false,
        isOnLease: dto.isOnLease ?? false,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
        notes: dto.notes,
      },
    });

    if (actorId) {
      await this.auditLogService.log('HOUSEHOLD_MEMBER_ADDED', actorId, {
        tenantId: userId,
        memberId: member.id,
      });
    }

    return member;
  }

  async removeHouseholdMember(memberId: string, actorId?: string) {
    const member = await this.prisma.householdMember.delete({ where: { id: memberId } });
    if (actorId) {
      await this.auditLogService.log('HOUSEHOLD_MEMBER_REMOVED', actorId, { memberId });
    }
    return member;
  }

  async addViolation(userId: string, dto: CreateViolationDto, actorId?: string) {
    const profile = await this.ensureProfile(userId);

    const violation = await this.prisma.violation.create({
      data: {
        tenantProfileId: profile.id,
        type: dto.type,
        description: dto.description,
        severity: dto.severity ?? 'WARNING',
        issuedById: actorId,
        metadata: dto.metadata,
      },
    });

    if (actorId) {
      await this.auditLogService.log('VIOLATION_ISSUED', actorId, {
        tenantId: userId,
        violationId: violation.id,
      });
    }

    return violation;
  }

  async resolveViolation(violationId: string, notes: string, actorId?: string) {
    const violation = await this.prisma.violation.update({
      where: { id: violationId },
      data: {
        isResolved: true,
        resolvedAt: new Date(),
        resolvedById: actorId,
        resolvedNotes: notes,
      },
    });

    if (actorId) {
      await this.auditLogService.log('VIOLATION_RESOLVED', actorId, { violationId });
    }

    return violation;
  }

  async refreshHealth(userId: string) {
    const health = await this.healthService.computeHealth(userId);

    await this.prisma.tenantProfile.upsert({
      where: { userId },
      update: { healthClass: health.classification },
      create: { userId, healthClass: health.classification },
    });

    return health;
  }

  private async ensureProfile(userId: string) {
    let profile = await this.prisma.tenantProfile.findUnique({ where: { userId } });
    if (!profile) {
      profile = await this.prisma.tenantProfile.create({ data: { userId } });
    }
    return profile;
  }

  private async getPaymentSummary(userId: string) {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const payments = await this.prisma.payment.findMany({
      where: { userId, paymentDate: { gte: sixMonthsAgo } },
      include: { invoice: { select: { dueDate: true } } },
      orderBy: { paymentDate: 'desc' },
      take: 20,
    });

    const total = payments.length;
    const late = payments.filter(
      (p) => p.invoice?.dueDate && p.paymentDate > p.invoice.dueDate,
    ).length;

    const lease = await this.prisma.lease.findFirst({
      where: { tenantId: userId },
      select: { currentBalance: true },
    });

    const paymentPlan = await this.prisma.paymentPlan.findFirst({
      where: { invoice: { lease: { tenantId: userId } }, status: 'ACTIVE' },
    });

    return {
      recentPayments: payments.slice(0, 10).map((p) => ({
        id: p.id,
        amount: p.amount,
        date: p.paymentDate,
        status: p.status,
      })),
      onTimeRate: total > 0 ? Math.round(((total - late) / total) * 100) : 100,
      latePayments: late,
      currentBalance: lease?.currentBalance ?? 0,
      paymentPlanActive: !!paymentPlan,
    };
  }

  private async getMaintenanceHistory(userId: string) {
    return this.prisma.maintenanceRequest.findMany({
      where: { authorId: userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        priority: true,
        createdAt: true,
        completedAt: true,
        unit: { select: { name: true } },
      },
    });
  }

  private async getCommunicationTimeline(userId: string) {
    return this.prisma.communicationLog.findMany({
      where: { tenantId: userId },
      orderBy: { createdAt: 'desc' },
      take: 30,
      select: {
        id: true,
        channel: true,
        direction: true,
        to: true,
        from: true,
        subject: true,
        message: true,
        createdAt: true,
      },
    });
  }

  private async getDocuments(userId: string) {
    return this.prisma.document.findMany({
      where: { uploadedById: userId },
      orderBy: { createdAt: 'desc' },
      take: 30,
      select: {
        id: true,
        fileName: true,
        category: true,
        description: true,
        createdAt: true,
      },
    });
  }
}
