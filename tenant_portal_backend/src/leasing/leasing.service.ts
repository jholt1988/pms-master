/**
 * Leasing Service
 * Handles lead management, property search, and conversation tracking
 */

import { BadRequestException, Injectable } from '@nestjs/common';
import { isUUID } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { EsignatureService } from '../esignature/esignature.service';
import { RentalApplicationService } from '../rental-application/rental-application.service';
import { Lead, LeadStatus, LeadMessage, MessageRole, PropertyInquiry, InterestLevel, Prisma, ApplicationStatus, EsignEnvelopeStatus, LeadApplicationStatus, EsignParticipantStatus, Role } from '@prisma/client';

@Injectable()
export class LeasingService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private esignatureService: EsignatureService,
    private rentalApplicationService: RentalApplicationService,
  ) {}

  /**
   * Create or update a lead
   */
  async upsertLead(sessionId: string, data: Partial<Lead>): Promise<Lead> {
    const isNewLead = !(await this.prisma.lead.findUnique({ where: { sessionId } }));
    
    const lead = await this.prisma.lead.upsert({
      where: { sessionId },
      create: {
        sessionId,
        ...data,
      },
      update: {
        ...data,
        updatedAt: new Date(),
      },
    });

    // Send welcome email to new leads with email address
    if (isNewLead && lead.email) {
      await this.emailService.sendLeadWelcomeEmail({
        name: lead.name || undefined,
        email: lead.email,
      }).catch(err => console.error('Failed to send welcome email:', err));
    }

    // Notify property managers of qualified leads
    if (isNewLead && lead.status === LeadStatus.QUALIFIED && lead.email) {
      const propertyManagers = await this.prisma.user.findMany({
        where: { role: 'PROPERTY_MANAGER' },
        select: { username: true },
      });
      
      for (const pm of propertyManagers) {
        await this.emailService.sendNewLeadNotificationToPM(pm.username, lead)
          .catch(err => console.error(`Failed to notify PM ${pm.username}:`, err));
      }
    }

    return lead;
  }

  /**
   * Get lead by session ID
   */
  async getLeadBySessionId(sessionId: string): Promise<Lead | null> {
    return this.prisma.lead.findUnique({
      where: { sessionId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
        propertyInquiries: {
          include: {
            property: true,
            unit: true,
          },
        },
        tours: {
          include: {
            property: true,
            unit: true,
          },
        },
        applications: {
          include: {
            property: true,
            unit: true,
          },
        },
      },
    });
  }

  /**
   * Get lead by ID
   */
  async getLeadById(id: string): Promise<Lead | null> {
    return this.prisma.lead.findUnique({
      where: { id },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
        propertyInquiries: {
          include: {
            property: true,
            unit: true,
          },
        },
        tours: {
          include: {
            property: true,
            unit: true,
          },
        },
        applications: {
          include: {
            property: true,
            unit: true,
          },
        },
      },
    });
  }

  /**
   * Get all leads with filtering
   */
  async getLeads(filters?: {
    status?: LeadStatus;
    search?: string;
    dateFrom?: Date;
    dateTo?: Date;
    limit?: number;
    offset?: number;
    page?: number;
    orgId?: string;
  }) {
    const where: Prisma.LeadWhereInput = {};

    if (filters?.orgId) {
      where.OR = [
        { propertyInquiries: { some: { property: { organizationId: filters.orgId } } } },
        { tours: { some: { property: { organizationId: filters.orgId } } } },
        { applications: { some: { property: { organizationId: filters.orgId } } } },
      ];
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.search) {
      const searchClause: Prisma.LeadWhereInput = {
        OR: [
          { name: { contains: filters.search, mode: 'insensitive' } },
          { email: { contains: filters.search, mode: 'insensitive' } },
          { phone: { contains: filters.search, mode: 'insensitive' } },
        ],
      };

      if (where.OR && Array.isArray(where.OR)) {
        const andConditions = Array.isArray(where.AND)
          ? where.AND
          : where.AND
            ? [where.AND]
            : [];
        where.AND = [...andConditions, searchClause];
      } else {
        Object.assign(where, searchClause);
      }
    }

    if (filters?.dateFrom || filters?.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) where.createdAt.gte = filters.dateFrom;
      if (filters.dateTo) where.createdAt.lte = filters.dateTo;
    }

    const limit = filters?.limit ?? 50;
    const offset =
      filters?.offset ??
      (filters?.page && filters.page > 0 ? (filters.page - 1) * limit : 0);

    const [leads, total] = await Promise.all([
      this.prisma.lead.findMany({
        where,
        include: {
          _count: {
            select: {
              messages: true,
              tours: true,
              applications: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.lead.count({ where }),
    ]);

    const page =
      filters?.page ??
      (limit > 0 ? Math.floor(offset / limit) + 1 : 1);

    return {
      leads,
      total,
      page,
      limit,
      totalPages: limit > 0 ? Math.ceil(total / limit) : 1,
    };
  }

  /**
   * Add message to conversation
   */
  async addMessage(
    leadId: string,
    role: MessageRole,
    content: string,
    metadata?: any,
  ): Promise<LeadMessage> {
    return this.prisma.leadMessage.create({
      data: {
        leadId,
        role,
        content,
        metadata: metadata || Prisma.JsonNull,
      },
    });
  }

  /**
   * Get conversation history
   */
  async getConversationHistory(leadId: string, orgId?: string): Promise<LeadMessage[]> {
    if (orgId) {
      await this.assertLeadInOrg(leadId, orgId);
    }
    return this.prisma.leadMessage.findMany({
      where: { leadId },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Search properties based on lead criteria
   */
  async searchProperties(criteria: {
    bedrooms?: number;
    bathrooms?: number;
    maxRent?: number;
    petFriendly?: boolean;
    amenities?: string[];
    limit?: number;
  }) {
    const where: Prisma.UnitWhereInput = {
      lease: null, // Only available units
    };

    if (criteria.bedrooms !== undefined) {
      where.bedrooms = criteria.bedrooms;
    }

    if (criteria.bathrooms !== undefined) {
      where.bathrooms = { gte: criteria.bathrooms };
    }

    if (criteria.petFriendly) {
      where.petsAllowed = true;
    }

    if (criteria.maxRent !== undefined) {
      where.property = {
        is: {
          OR: [
            { minRent: { lte: criteria.maxRent } },
            { maxRent: { lte: criteria.maxRent } },
            {
              AND: [{ minRent: null }, { maxRent: null }],
            },
          ],
        },
      };
    }

    // For rent filtering, we'd need to add current rent to Unit model
    // For now, we'll return all matching units

    const units = await this.prisma.unit.findMany({
      where,
      include: {
        property: true,
      },
      take: criteria.limit || 10,
    });

    // Transform to match frontend PropertyMatch interface
    return units.map((unit) => {
      const estimatedRent =
        unit.property.minRent ??
        unit.property.maxRent ??
        1500;

      return {
        propertyId: unit.property.id.toString(),
        unitId: unit.id.toString(),
        address: unit.property.address,
        city: unit.property.city,
        state: unit.property.state,
        bedrooms: unit.bedrooms,
        bathrooms: unit.bathrooms,
        rent: estimatedRent,
        available: true,
        status: 'AVAILABLE',
        petFriendly: !!unit.petsAllowed,
        amenities: this.getUnitAmenities(unit, unit.property),
        matchScore: 0.9, // TODO: Implement matching algorithm
        images: [], // TODO: Add unit images
      };
    });
  }

  /**
   * Record property inquiry
   */
  async recordPropertyInquiry(
    leadId: string,
    propertyId: string | number,
    unitId?: string | number,
    interest: InterestLevel = InterestLevel.MEDIUM,
  ): Promise<PropertyInquiry> {
    return this.prisma.propertyInquiry.create({
      data: {
        leadId,
        propertyId: propertyId as any,
        unitId: (unitId ?? null) as any,
        interest,
      },
    });
  }

  /**
   * Update lead status
   */
  async updateLeadStatus(leadId: string, status: LeadStatus, orgId?: string): Promise<Lead> {
    if (orgId) {
      await this.assertLeadInOrg(leadId, orgId);
    }
    const updates: any = { status };

    if (status === LeadStatus.CONVERTED) {
      updates.convertedAt = new Date();
    }

    return this.prisma.lead.update({
      where: { id: leadId },
      data: updates,
    });
  }

  async executeBulkAction(
    action: 'FOLLOW_UP_APPLICANT' | 'RETRY_SEND_ENVELOPE' | 'SEND_SIGNATURE_REMINDER' | 'CONVERT_TO_LEASE',
    ids: Array<string | number>,
    actor: { userId: string; username?: string },
    orgId?: string,
    options?: {
      startDate?: string;
      endDate?: string;
      rentAmount?: number;
      depositAmount?: number;
      moveInAt?: string;
      noticePeriodDays?: number;
    },
  ) {
    if (!['FOLLOW_UP_APPLICANT', 'RETRY_SEND_ENVELOPE', 'SEND_SIGNATURE_REMINDER', 'CONVERT_TO_LEASE'].includes(action)) {
      throw new BadRequestException(`Unsupported bulk action: ${action}`);
    }

    if (!Array.isArray(ids) || ids.length === 0) {
      throw new BadRequestException('ids must be a non-empty array');
    }

    const uniqueIds = [...new Set(ids.map((id) => String(id)))].slice(0, 200);
    const successes: Array<{ id: string; result?: unknown }> = [];
    const failures: Array<{ id: string; error: string }> = [];

    for (const id of uniqueIds) {
      try {
        if (action === 'FOLLOW_UP_APPLICANT') {
          const appId = id;
          const updated = await this.prisma.leadApplication.updateMany({
            where: {
              id: appId,
              ...(orgId ? { property: { organizationId: orgId } } : {}),
            },
            data: {
              lastActivityAt: new Date(),
              followUpDueAt: new Date(Date.now() + 24 * 3600000),
            },
          });
          if (updated.count === 0) {
            throw new BadRequestException('Lead application not found or not in org scope');
          }
          successes.push({ id, result: { updated: true } });
        }

        if (action === 'RETRY_SEND_ENVELOPE') {
          const envelopeId = Number(id);
          const result = await this.esignatureService.retryEnvelopeSend(envelopeId, actor.userId);
          successes.push({ id, result });
        }

        if (action === 'SEND_SIGNATURE_REMINDER') {
          const envelopeId = Number(id);
          const result = await this.esignatureService.resendNotifications(envelopeId, actor.userId);
          successes.push({ id, result });
        }

        if (action === 'CONVERT_TO_LEASE') {
          if (!options?.startDate || !options?.endDate) {
            throw new BadRequestException('startDate and endDate are required for CONVERT_TO_LEASE');
          }
          const appId = Number(id);
          const result = await this.rentalApplicationService.convertApprovedApplicationToLease(
            appId,
            { userId: actor.userId, username: actor.username || 'bulk-ops', role: Role.PROPERTY_MANAGER },
            {
              startDate: options.startDate,
              endDate: options.endDate,
              rentAmount: options.rentAmount,
              depositAmount: options.depositAmount,
              moveInAt: options.moveInAt,
              noticePeriodDays: options.noticePeriodDays,
            },
            orgId,
          );
          successes.push({ id, result: { leaseId: (result as any)?.id ?? null } });
        }
      } catch (error) {
        failures.push({
          id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return {
      action,
      requested: uniqueIds.length,
      succeeded: successes.length,
      failed: failures.length,
      successes,
      failures,
    };
  }

  async getLeasingOpsSummary(orgId?: string, limit = 25) {
    const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(1, limit), 100) : 25;
    const now = new Date();

    const staleLeadApps = await this.prisma.leadApplication.findMany({
      where: {
        status: {
          in: [LeadApplicationStatus.SUBMITTED, LeadApplicationStatus.PENDING, LeadApplicationStatus.CONDITIONALLY_APPROVED],
        },
        ...(orgId ? { property: { organizationId: orgId } } : {}),
        OR: [
          { followUpDueAt: { lte: now } },
          { lastActivityAt: { lte: new Date(now.getTime() - 48 * 3600000) } },
        ],
      },
      include: {
        lead: true,
        property: true,
        unit: true,
      },
      orderBy: [{ followUpDueAt: 'asc' }, { lastActivityAt: 'asc' }],
      take: safeLimit,
    });

    const signatureRisk = await this.prisma.esignEnvelope.findMany({
      where: {
        status: { in: [EsignEnvelopeStatus.SENT, EsignEnvelopeStatus.DELIVERED, EsignEnvelopeStatus.ERROR] },
        lease: orgId ? { unit: { property: { organizationId: orgId } } } : undefined,
      },
      include: {
        lease: {
          include: {
            tenant: true,
            unit: { include: { property: true } },
          },
        },
        participants: true,
      },
      orderBy: { createdAt: 'asc' },
      take: safeLimit,
    });

    const approvedNotConverted = await this.prisma.rentalApplication.findMany({
      where: {
        status: ApplicationStatus.APPROVED,
        convertedLeaseId: null,
        ...(orgId ? { property: { organizationId: orgId } } : {}),
      },
      include: {
        applicant: true,
        property: true,
        unit: true,
      },
      orderBy: { updatedAt: 'asc' },
      take: safeLimit,
    });

    const staleLeadItems = staleLeadApps.map((item) => ({
      id: item.id,
      status: item.status,
      leadId: item.leadId,
      propertyId: item.propertyId,
      propertyName: item.property?.name,
      unitId: item.unitId,
      followUpDueAt: item.followUpDueAt,
      lastActivityAt: item.lastActivityAt,
      recommendation: {
        priority: item.status === LeadApplicationStatus.CONDITIONALLY_APPROVED ? 'HIGH' : 'MEDIUM',
        action: 'FOLLOW_UP_APPLICANT',
        reason:
          item.status === LeadApplicationStatus.CONDITIONALLY_APPROVED
            ? 'Conditional approval pending documents/conditions.'
            : 'Application is stale and requires manager follow-up.',
        endpoint: `/applications/${item.id}/status`,
      },
    }));

    const signatureRiskItems = signatureRisk.map((env) => {
      const meta = (env.providerMetadata as Record<string, unknown>) || {};
      const pendingParticipantsCount = env.participants.filter(
        (p) => p.status !== EsignParticipantStatus.SIGNED && p.status !== EsignParticipantStatus.DECLINED,
      ).length;

      const recommendation = env.status === EsignEnvelopeStatus.ERROR
        ? {
            priority: 'HIGH',
            action: 'RETRY_SEND_ENVELOPE',
            reason: 'Envelope is in ERROR state and requires retry.',
            endpoint: `/esignature/envelopes/${env.id}/retry-send`,
          }
        : {
            priority: pendingParticipantsCount > 0 ? 'MEDIUM' : 'LOW',
            action: 'SEND_SIGNATURE_REMINDER',
            reason: pendingParticipantsCount > 0
              ? 'Pending signers detected.'
              : 'No pending signers; monitor status.',
            endpoint: `/esignature/envelopes/${env.id}/resend`,
          };

      return {
        id: env.id,
        leaseId: env.leaseId,
        status: env.status,
        providerStatus: env.providerStatus,
        tenantName: env.lease?.tenant?.username,
        propertyName: env.lease?.unit?.property?.name,
        reminderCount: Number(meta.reminderCount || 0),
        retryCount: Number(meta.retryCount || 0),
        nextRetryAt: (meta.nextRetryAt as string) || null,
        pendingParticipantsCount,
        recommendation,
      };
    });

    const conversionItems = approvedNotConverted.map((app) => ({
      id: app.id,
      applicantId: app.applicantId,
      applicantName: app.fullName,
      propertyId: app.propertyId,
      propertyName: app.property?.name,
      unitId: app.unitId,
      approvedAt: app.decisionedAt,
      decisionNotes: app.decisionNotes,
      recommendation: {
        priority: 'HIGH',
        action: 'CONVERT_TO_LEASE',
        reason: 'Application approved but no lease draft has been created.',
        endpoint: `/rental-applications/${app.id}/convert-to-lease`,
      },
    }));

    const bulkActions = {
      FOLLOW_UP_APPLICANT: staleLeadItems
        .filter((item) => item.recommendation.action === 'FOLLOW_UP_APPLICANT')
        .map((item) => item.id),
      RETRY_SEND_ENVELOPE: signatureRiskItems
        .filter((item) => item.recommendation.action === 'RETRY_SEND_ENVELOPE')
        .map((item) => item.id),
      SEND_SIGNATURE_REMINDER: signatureRiskItems
        .filter((item) => item.recommendation.action === 'SEND_SIGNATURE_REMINDER')
        .map((item) => item.id),
      CONVERT_TO_LEASE: conversionItems
        .filter((item) => item.recommendation.action === 'CONVERT_TO_LEASE')
        .map((item) => item.id),
    };

    return {
      generatedAt: now.toISOString(),
      counts: {
        staleLeadApplications: staleLeadItems.length,
        signatureRiskEnvelopes: signatureRiskItems.length,
        approvedNotConvertedApplications: conversionItems.length,
      },
      bulkActions,
      staleLeadApplications: staleLeadItems,
      signatureRiskEnvelopes: signatureRiskItems,
      approvedNotConvertedApplications: conversionItems,
    };
  }

  /**
   * Get lead statistics
   */
  async getLeadStatistics(dateFrom?: Date, dateTo?: Date, orgId?: string) {
    const where: Prisma.LeadWhereInput = {};

    if (orgId) {
      where.OR = [
        { propertyInquiries: { some: { property: { organizationId: orgId } } } },
        { tours: { some: { property: { organizationId: orgId } } } },
        { applications: { some: { property: { organizationId: orgId } } } },
      ];
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = dateFrom;
      if (dateTo) where.createdAt.lte = dateTo;
    }

    const [
      totalLeads,
      newLeads,
      qualifiedLeads,
      touringLeads,
      convertedLeads,
      lostLeads,
    ] = await Promise.all([
      this.prisma.lead.count({ where }),
      this.prisma.lead.count({ where: { ...where, status: LeadStatus.NEW } }),
      this.prisma.lead.count({ where: { ...where, status: LeadStatus.QUALIFIED } }),
      this.prisma.lead.count({ where: { ...where, status: LeadStatus.TOURING } }),
      this.prisma.lead.count({ where: { ...where, status: LeadStatus.CONVERTED } }),
      this.prisma.lead.count({ where: { ...where, status: LeadStatus.LOST } }),
    ]);

    return {
      totalLeads,
      newLeads,
      qualifiedLeads,
      touringLeads,
      convertedLeads,
      lostLeads,
      conversionRate: totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0,
    };
  }

  /**
   * Helper to get unit amenities
   */
  private async assertLeadInOrg(leadId: string, orgId: string) {
    const lead = await this.prisma.lead.findFirst({
      where: {
        id: leadId,
        OR: [
          { propertyInquiries: { some: { property: { organizationId: orgId } } } },
          { tours: { some: { property: { organizationId: orgId } } } },
          { applications: { some: { property: { organizationId: orgId } } } },
        ],
      },
      select: { id: true },
    });

    if (!lead) {
      throw new BadRequestException('Lead not found');
    }
  }

  private getUnitAmenities(unit: any, property: any): string[] {
    const amenities: string[] = [];

    if (unit.hasParking || property.hasParking) amenities.push('Parking');
    if (unit.hasLaundry) amenities.push('In-unit laundry');
    if (unit.hasBalcony) amenities.push('Balcony');
    if (unit.hasAC) amenities.push('Air Conditioning');
    if (unit.isFurnished) amenities.push('Furnished');
    if (unit.petsAllowed) amenities.push('Pet-friendly');
    if (property.hasPool) amenities.push('Pool');
    if (property.hasGym) amenities.push('Gym');
    if (property.hasElevator) amenities.push('Elevator');

    return amenities;
  }

  private parseNumericId(value: string | number, field: string): string {
    if (typeof value !== 'string' || !isUUID(value)) {
      throw new BadRequestException(`Invalid ${field} id: ${value}`);
    }
    return String(value);
  }
}

