import { BadRequestException, Injectable } from '@nestjs/common';
import { ApplicationDecisionReasonCode, ApplicationStatus, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RentalApplicationService } from '../rental-application/rental-application.service';
import {
  RentalApplicationReviewAction,
  RentalApplicationReviewActionDto,
} from '../rental-application/dto/review-action.dto';
import { AuditLogService } from '../shared/audit-log.service';
import {
  ConvertApplicationToLeasePayload,
  OperatorApplicationDetail,
  OperatorApplicationItem,
  OperatorApplicationLeaseHandoff,
  OperatorApplicationsActor,
  OperatorApplicationsWorkbench,
} from './operator-applications.types';

type ApplicationWithRelations = Awaited<ReturnType<RentalApplicationService['getAllApplications']>>[number];

@Injectable()
export class OperatorApplicationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rentalApplicationService: RentalApplicationService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async getWorkbench(
    orgId: string,
    _actor: OperatorApplicationsActor,
    options: { propertyId?: string; status?: ApplicationStatus; limit?: number } = {},
  ): Promise<OperatorApplicationsWorkbench> {
    const limit = Math.min(Math.max(options.limit ?? 50, 1), 100);
    const applications = await this.prisma.rentalApplication.findMany({
      where: {
        property: { organizationId: orgId },
        ...(options.propertyId ? { propertyId: options.propertyId } : {}),
        ...(options.status ? { status: options.status } : {}),
      },
      include: {
        property: true,
        unit: true,
        applicant: true,
        manualNotes: { include: { author: true }, orderBy: { createdAt: 'desc' }, take: 3 },
      },
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
      take: limit,
    });
    const items = applications.map((application) => this.mapApplicationItem(application));
    const leaseHandoffs = applications
      .filter((application) => application.status === ApplicationStatus.APPROVED && !application.convertedLeaseId)
      .map((application) => this.mapLeaseHandoff(application));

    return {
      generatedAt: new Date().toISOString(),
      metrics: {
        totalApplications: applications.length,
        pendingReview: items.filter((item) => ['review', 'screen'].includes(item.nextAction)).length,
        needsScreening: items.filter((item) => item.nextAction === 'screen').length,
        approvedReadyForLease: leaseHandoffs.length,
        conditionallyApproved: items.filter((item) => item.status === ApplicationStatus.CONDITIONALLY_APPROVED).length,
        denied: items.filter((item) => item.status === ApplicationStatus.REJECTED).length,
        convertedToLease: items.filter((item) => Boolean(item.convertedLeaseId)).length,
      },
      applications: items,
      leaseHandoffs,
      reviewActions: Object.values(RentalApplicationReviewAction),
      denialReasonCodes: Object.values(ApplicationDecisionReasonCode),
      sourceLinks: [
        {
          label: 'Canonical rental application API',
          href: '/api/rental-applications',
          entityType: 'RentalApplication',
        },
        {
          label: 'Operator lease conversion API',
          href: '/api/operator-applications/{id}/convert-to-lease',
          entityType: 'Lease',
        },
      ],
    };
  }

  async getDetail(orgId: string, actor: OperatorApplicationsActor, applicationId: number): Promise<OperatorApplicationDetail> {
    const application = await this.rentalApplicationService.getApplicationById(applicationId, orgId);
    if (!application) {
      throw new BadRequestException('Application not found');
    }
    const [policyEvaluation, lifecycle, transitions, timeline] = await Promise.all([
      this.rentalApplicationService.getPolicyEvaluation(applicationId, orgId).catch((error) => ({
        unavailable: true,
        reason: error?.message ?? 'Policy evaluation unavailable',
      })),
      this.rentalApplicationService.getApplicationLifecycleStage(applicationId, orgId).catch((error) => ({
        unavailable: true,
        reason: error?.message ?? 'Lifecycle unavailable',
      })),
      this.rentalApplicationService.getAvailableTransitions(applicationId, actor.role, orgId).catch((error) => ({
        unavailable: true,
        reason: error?.message ?? 'Transitions unavailable',
      })),
      this.rentalApplicationService.getApplicationTimeline(applicationId, orgId).catch(() => []),
    ]);

    return {
      generatedAt: new Date().toISOString(),
      application: {
        ...this.mapApplicationItem(application),
        applicantId: application.applicantId ?? null,
        decisionNotes: application.decisionNotes ?? null,
        screeningDetails: application.screeningDetails ?? null,
        screeningReasons: application.screeningReasons ?? null,
      },
      policyEvaluation,
      lifecycle,
      transitions,
      timeline: Array.isArray(timeline) ? timeline : [],
      leaseHandoff:
        application.status === ApplicationStatus.APPROVED && !application.convertedLeaseId
          ? this.mapLeaseHandoff(application)
          : null,
      sourceLinks: [
        {
          label: 'Application record',
          href: `/api/rental-applications/${applicationId}`,
          entityType: 'RentalApplication',
          entityId: String(applicationId),
        },
        {
          label: 'Policy evaluation',
          href: `/api/rental-applications/${applicationId}/policy-evaluation`,
          entityType: 'PolicyEvaluation',
          entityId: String(applicationId),
        },
        {
          label: 'Lease conversion',
          href: `/api/operator-applications/${applicationId}/convert-to-lease`,
          entityType: 'Lease',
          entityId: application.convertedLeaseId ?? 'draft',
        },
      ],
    };
  }

  async screen(orgId: string, actor: Required<Pick<OperatorApplicationsActor, 'userId' | 'role' | 'username'>>, applicationId: number) {
    const result = await this.rentalApplicationService.screenApplication(applicationId, actor, orgId);
    await this.recordOperatorAudit(orgId, actor.userId, 'APPLICATION_SCREENED', applicationId, {
      screeningScore: result.screeningScore,
      recommendation: result.recommendation,
    });
    return result;
  }

  async reviewAction(
    orgId: string,
    actor: Required<Pick<OperatorApplicationsActor, 'userId' | 'role' | 'username'>>,
    applicationId: number,
    dto: RentalApplicationReviewActionDto,
  ) {
    const result = await this.rentalApplicationService.performReviewAction(applicationId, dto, actor, orgId);
    await this.recordOperatorAudit(orgId, actor.userId, 'APPLICATION_REVIEW_ACTION', applicationId, {
      action: dto.action,
      reasonCode: dto.reasonCode,
    });
    return result;
  }

  async convertToLease(
    orgId: string,
    actor: Required<Pick<OperatorApplicationsActor, 'userId' | 'role' | 'username'>>,
    applicationId: number,
    payload: ConvertApplicationToLeasePayload,
  ) {
    const lease = await this.rentalApplicationService.convertApprovedApplicationToLease(
      applicationId,
      actor,
      payload,
      orgId,
    );
    await this.recordOperatorAudit(orgId, actor.userId, 'APPLICATION_CONVERTED_TO_LEASE', applicationId, {
      leaseId: lease?.id,
    });
    return lease;
  }

  private mapApplicationItem(application: ApplicationWithRelations): OperatorApplicationItem {
    return {
      id: application.id,
      applicantName: application.fullName,
      email: application.email,
      phoneNumber: application.phoneNumber,
      status: application.status,
      propertyId: application.propertyId,
      propertyName: application.property?.name ?? null,
      unitId: application.unitId,
      unitLabel: this.getUnitLabel(application.unit),
      income: Number(application.income ?? 0),
      creditScore: application.creditScore ?? null,
      qualificationStatus: application.qualificationStatus ?? null,
      recommendation: application.recommendation ?? null,
      screeningScore: application.screeningScore ?? null,
      screenedAt: application.screenedAt?.toISOString() ?? null,
      decisionedAt: application.decisionedAt?.toISOString() ?? null,
      convertedLeaseId: application.convertedLeaseId ?? null,
      submittedAt: application.applicationDate.toISOString(),
      updatedAt: application.updatedAt.toISOString(),
      nextAction: this.getNextAction(application),
      canonicalRoute: `/api/operator-applications/${application.id}`,
    };
  }

  private mapLeaseHandoff(application: ApplicationWithRelations): OperatorApplicationLeaseHandoff {
    const monthlyIncome = Number(application.income ?? 0);
    const recommendedRentAmount = Math.round(monthlyIncome * 0.3);
    const recommendedDepositAmount = recommendedRentAmount;
    const readinessWarnings = [
      application.applicantId ? null : 'No linked tenant user; lease conversion requires applicant account.',
      application.convertedLeaseId ? 'Application already converted to lease.' : null,
    ].filter(Boolean) as string[];

    return {
      applicationId: application.id,
      applicantName: application.fullName,
      propertyName: application.property?.name ?? null,
      unitLabel: this.getUnitLabel(application.unit),
      recommendedRentAmount,
      recommendedDepositAmount,
      readinessWarnings,
    };
  }

  private getNextAction(application: ApplicationWithRelations) {
    if (application.convertedLeaseId) return 'complete';
    if (application.status === ApplicationStatus.APPROVED) return 'convert_to_lease';
    if (application.status === ApplicationStatus.CONDITIONALLY_APPROVED) return 'resolve_conditions';
    if (application.status === ApplicationStatus.REJECTED) return 'none';
    if (!application.screenedAt) return 'screen';
    return 'review';
  }

  private getUnitLabel(unit: ApplicationWithRelations['unit']) {
    if (!unit) return null;
    return unit.unitNumber ?? unit.name ?? unit.id;
  }

  private async recordOperatorAudit(
    orgId: string,
    actorId: string,
    action: string,
    applicationId: number,
    metadata: Record<string, unknown>,
  ) {
    await this.auditLogService.record({
      orgId,
      actorId,
      module: 'operator-applications',
      action,
      entityType: 'RentalApplication',
      entityId: applicationId,
      result: 'SUCCESS',
      metadata,
    });
  }
}
