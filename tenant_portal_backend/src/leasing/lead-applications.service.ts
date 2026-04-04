/**
 * Lead Applications Service
 * Handles rental application submission and processing for leads
 */

import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { ApplicationDecisionReasonCode, LeadApplicationStatus, SecurityEventType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { SecurityEventsService } from '../security-events/security-events.service';

@Injectable()
export class LeadApplicationsService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private securityEvents: SecurityEventsService,
  ) {}

  /**
   * Submit a rental application
   */
  async submitApplication(data: any) {
    const normalizedStatus = this.normalizeLeadApplicationStatus(data?.status);
    const {
      termsAccepted,
      privacyAccepted,
      termsVersion,
      privacyVersion,
      ...rest
    } = data ?? {};

    if (!termsAccepted || !privacyAccepted) {
      throw new BadRequestException('Terms of Service and Privacy Policy must be accepted');
    }

    const acceptanceTimestamp = new Date();

    const followUpDueAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

    const application = await this.prisma.leadApplication.create({
      data: {
        ...rest,
        status: normalizedStatus,
        submittedAt: new Date(),
        lastActivityAt: new Date(),
        followUpDueAt,
        termsAcceptedAt: acceptanceTimestamp,
        termsVersion: termsVersion ?? 'unknown',
        privacyAcceptedAt: acceptanceTimestamp,
        privacyVersion: privacyVersion ?? 'unknown',
      },
      include: {
        lead: true,
        property: true,
        unit: true,
      },
    });

    // Send confirmation email to lead
    if (application.lead.email) {
      await this.emailService.sendApplicationReceivedEmail(
        application,
        application.lead,
        application.property,
      ).catch(err => console.error('Failed to send application confirmation:', err));
    }

    await this.securityEvents.logEvent({
      type: SecurityEventType.APPLICATION_LEGAL_ACCEPTED,
      success: true,
      userId: null,
      username: application.lead?.email ?? application.lead?.name ?? null,
      metadata: {
        applicationId: application.id,
        propertyId: application.propertyId,
        unitId: application.unitId,
        termsVersion: application.termsVersion,
        privacyVersion: application.privacyVersion,
        termsAcceptedAt: application.termsAcceptedAt,
        privacyAcceptedAt: application.privacyAcceptedAt,
        leadId: application.leadId,
      },
    });

    return application;
  }

  /**
   * Get application by ID
   */
  async getApplicationById(id: string) {
    return this.prisma.leadApplication.findUnique({
      where: { id },
      include: {
        lead: true,
        property: true,
        unit: true,
        reviewedBy: true,
      },
    });
  }

  /**
   * Get applications for a lead
   */
  async getApplicationsForLead(leadId: string) {
    return this.prisma.leadApplication.findMany({
      where: { leadId },
      include: {
        property: true,
        unit: true,
        reviewedBy: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get all applications with filtering
   */
  async getApplications(filters?: {
    propertyId?: string;
    status?: string;
    dateFrom?: Date;
    dateTo?: Date;
    limit?: number;
    offset?: number;
  }) {
    const where: any = {};

    if (filters?.propertyId) {
      where.propertyId = filters.propertyId;
    }

      if (filters?.status) {
        where.status = this.normalizeLeadApplicationStatus(filters.status);
      }

    if (filters?.dateFrom || filters?.dateTo) {
      where.submittedAt = {};
      if (filters.dateFrom) where.submittedAt.gte = filters.dateFrom;
      if (filters.dateTo) where.submittedAt.lte = filters.dateTo;
    }

    const [applications, total] = await Promise.all([
      this.prisma.leadApplication.findMany({
        where,
        include: {
          lead: true,
          property: true,
          unit: true,
          reviewedBy: true,
        },
        orderBy: { submittedAt: 'desc' },
        take: filters?.limit || 50,
        skip: filters?.offset || 0,
      }),
      this.prisma.leadApplication.count({ where }),
    ]);

    return { applications, total };
  }

  /**
   * Update application status
   */
  async updateApplicationStatus(
    id: string,
    status: string,
    reviewedById?: string,
    reviewNotes?: string,
    reasonCode?: ApplicationDecisionReasonCode,
  ) {
    const normalizedStatus = this.normalizeLeadApplicationStatus(status);

    const existing = await this.prisma.leadApplication.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Application not found');
    }

    if (!this.canTransition(existing.status, normalizedStatus)) {
      throw new BadRequestException(`Invalid status transition: ${existing.status} -> ${normalizedStatus}`);
    }

    const updates: any = {
      status: normalizedStatus,
      lastActivityAt: new Date(),
    };

    const decisionStatuses: LeadApplicationStatus[] = [
      LeadApplicationStatus.APPROVED,
      LeadApplicationStatus.CONDITIONALLY_APPROVED,
      LeadApplicationStatus.DENIED,
      LeadApplicationStatus.REJECTED,
    ];
    const requiresReviewer = decisionStatuses.includes(normalizedStatus);

    if (requiresReviewer && !reviewedById) {
      throw new BadRequestException('reviewedById is required for decision statuses');
    }

    if (
      normalizedStatus === LeadApplicationStatus.APPROVED ||
      normalizedStatus === LeadApplicationStatus.CONDITIONALLY_APPROVED
    ) {
      updates.approvedAt = new Date();
      updates.followUpDueAt = null;
      updates.decisionReasonCode = null;
      updates.decisionNotes = reviewNotes?.trim() || null;
    }

    if (
      normalizedStatus === LeadApplicationStatus.DENIED ||
      normalizedStatus === LeadApplicationStatus.REJECTED
    ) {
      if (!reviewNotes?.trim()) {
        throw new BadRequestException('reviewNotes are required for denied/rejected applications');
      }
      if (!reasonCode) {
        throw new BadRequestException('reasonCode is required for denied/rejected applications');
      }

      updates.rejectedAt = new Date();
      updates.followUpDueAt = null;
      updates.decisionReasonCode = reasonCode;
      updates.decisionNotes = reviewNotes.trim();
    }

    if (
      normalizedStatus === LeadApplicationStatus.SUBMITTED ||
      normalizedStatus === LeadApplicationStatus.PENDING ||
      normalizedStatus === LeadApplicationStatus.CONDITIONALLY_APPROVED
    ) {
      updates.followUpDueAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
    }

    if (reviewedById) {
      updates.reviewedById = reviewedById;
      updates.reviewedAt = new Date();
    }

    if (reviewNotes && !updates.decisionNotes) {
      updates.reviewNotes = reviewNotes;
    } else if (reviewNotes) {
      updates.reviewNotes = reviewNotes;
    }

    const application = await this.prisma.leadApplication.update({
      where: { id },
      data: updates,
      include: {
        lead: true,
        property: true,
      },
    });

    // Send status update email for major status changes
    const notifyStatuses = [
      LeadApplicationStatus.APPROVED,
      LeadApplicationStatus.CONDITIONALLY_APPROVED,
      LeadApplicationStatus.DENIED,
      LeadApplicationStatus.SUBMITTED,
      LeadApplicationStatus.PENDING,
      LeadApplicationStatus.REJECTED,
    ];

    if (application.lead.email && notifyStatuses.includes(normalizedStatus)) {
      await this.emailService.sendApplicationStatusEmail(
        application,
        application.lead,
        application.property,
        normalizedStatus 
      ).catch(err => console.error('Failed to send application status email:', err));
    }

    return application;
  }

  /**
   * Update application screening results
   */
  async updateScreeningResults(
    id: string,
    creditScore?: number,
    backgroundCheckStatus?: string,
    creditCheckStatus?: string,
  ) {
    const updates: any = {
      lastActivityAt: new Date(),
    };

    if (creditScore !== undefined) updates.creditScore = creditScore;
    if (backgroundCheckStatus) updates.backgroundCheckStatus = backgroundCheckStatus;
    if (creditCheckStatus) updates.creditCheckStatus = creditCheckStatus;

    return this.prisma.leadApplication.update({
      where: { id },
      data: updates,
    });
  }

  /**
   * Record application fee payment
   */
  async recordFeePayment(id: string, amount: number) {
    return this.prisma.leadApplication.update({
      where: { id },
      data: {
        applicationFee: amount,
        feePaid: true,
        feePaidAt: new Date(),
        lastActivityAt: new Date(),
      },
    });
  }

  async getStaleApplications(olderThanHours = 48, limit = 100) {
    const safeHours = Number.isFinite(olderThanHours) ? Math.max(1, olderThanHours) : 48;
    const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(1, limit), 500) : 100;
    const cutoff = new Date(Date.now() - safeHours * 60 * 60 * 1000);

    const stale = await this.prisma.leadApplication.findMany({
      where: {
        status: {
          in: [
            LeadApplicationStatus.SUBMITTED,
            LeadApplicationStatus.PENDING,
            LeadApplicationStatus.CONDITIONALLY_APPROVED,
          ],
        },
        OR: [
          { followUpDueAt: { lte: new Date() } },
          { lastActivityAt: { lte: cutoff } },
        ],
      },
      include: {
        lead: true,
        property: true,
        unit: true,
      },
      orderBy: [
        { followUpDueAt: 'asc' },
        { lastActivityAt: 'asc' },
      ],
      take: safeLimit,
    });

    return {
      generatedAt: new Date(),
      olderThanHours: safeHours,
      count: stale.length,
      items: stale.map((app) => ({
        ...app,
        suggestedAction:
          app.status === LeadApplicationStatus.CONDITIONALLY_APPROVED
            ? 'Follow up on pending conditions and documents'
            : 'Contact applicant and move to review decision',
      })),
    };
  }

  private canTransition(from: LeadApplicationStatus, to: LeadApplicationStatus): boolean {
    if (from === to) return true;

    const allowed: Record<LeadApplicationStatus, LeadApplicationStatus[]> = {
      SUBMITTED: [
        LeadApplicationStatus.PENDING,
        LeadApplicationStatus.APPROVED,
        LeadApplicationStatus.CONDITIONALLY_APPROVED,
        LeadApplicationStatus.DENIED,
        LeadApplicationStatus.REJECTED,
      ],
      PENDING: [
        LeadApplicationStatus.APPROVED,
        LeadApplicationStatus.CONDITIONALLY_APPROVED,
        LeadApplicationStatus.DENIED,
        LeadApplicationStatus.REJECTED,
      ],
      CONDITIONALLY_APPROVED: [
        LeadApplicationStatus.APPROVED,
        LeadApplicationStatus.REJECTED,
      ],
      APPROVED: [],
      DENIED: [],
      REJECTED: [],
    };

    return (allowed[from] ?? []).includes(to);
  }

  private normalizeLeadApplicationStatus(status?: string): LeadApplicationStatus {
    if (!status) {
      return LeadApplicationStatus.SUBMITTED;
    }

    const normalized = status.trim().toUpperCase();
    const allowed = Object.values(LeadApplicationStatus) as string[];

    if (allowed.includes(normalized)) {
      return normalized as LeadApplicationStatus;
    }

    return LeadApplicationStatus.SUBMITTED;
  }
}
