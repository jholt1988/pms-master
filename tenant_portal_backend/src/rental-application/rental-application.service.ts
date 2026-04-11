
import { Injectable, BadRequestException, Optional } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import {
  ApplicationDecisionReasonCode,
  ApplicationStatus,
  LeaseStatus,
  NotificationType,
  QualificationStatus,
  Recommendation,
  Role,
  SecurityEventType,
} from '@prisma/client';
import { SubmitApplicationDto } from './dto/submit-application.dto';
import { SecurityEventsService } from '../security-events/security-events.service';
import { AddRentalApplicationNoteDto } from './dto/add-note.dto';
import { ApplicationLifecycleService, ApplicationLifecycleEventType } from './application-lifecycle.service';
import { RentalApplicationAiService } from './rental-application.ai.service';
import { AuditLogService } from '../shared/audit-log.service';
import { ScheduleService } from '../schedule/schedule.service';
import { EventPriority, EventType } from '../schedule/dto/create-schedule-event.dto';
import { RentalApplicationReviewAction, RentalApplicationReviewActionDto } from './dto/review-action.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { WorkflowEventService } from '../policy/workflow-event.service';
import { WorkflowEventProcessor } from '../policy/workflow-event-processor.service';

@Injectable()
export class RentalApplicationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly securityEvents: SecurityEventsService,
    private readonly lifecycleService: ApplicationLifecycleService,
    private readonly aiService: RentalApplicationAiService,
    private readonly auditLogService: AuditLogService,
    private readonly scheduleService: ScheduleService,
    private readonly notificationsService: NotificationsService,
    @InjectQueue('ai-screening') private readonly aiQueue: Queue,
    @Optional() private readonly workflowEventService?: WorkflowEventService,
    @Optional() private readonly workflowEventProcessor?: WorkflowEventProcessor,
  ) {}
  
  async submitApplication(data: SubmitApplicationDto, applicantId?: string) {
    const propertyId = data.propertyId;
    if (!data.termsAccepted || !data.privacyAccepted) {
      throw new BadRequestException('Terms of Service and Privacy Policy must be accepted');
    }

    if (!data.authorizeCreditCheck || !data.authorizeBackgroundCheck || !data.authorizeEmploymentVerification) {
      throw new BadRequestException('Credit, background, and employment verification authorizations are required');
    }

    if (!data.proofOfIncomeUploaded || !data.dlIdUploaded) {
      throw new BadRequestException('Proof of income and government-issued ID uploads are required');
    }

    if (!data.employments?.length && !data.additionalIncomes?.length) {
      throw new BadRequestException('At least one employment or additional income entry is required');
    }

    const acceptanceTimestamp = new Date();
    const unitId = String(data.unitId);
    const application = await this.prisma.rentalApplication.create({
      data: {
        property: { connect: { id: propertyId } },
        unit: { connect: { id: unitId } },
        applicant: applicantId ? { connect: { id: applicantId } } : undefined,
        fullName: data.fullName,
        email: data.email,
        phoneNumber: data.phoneNumber,
        income: data.income,
        previousAddress: data.previousAddress,
        employmentStatus: data.employments?.[0]?.employmentType ?? 'UNSPECIFIED',
        creditScore: data.creditScore,
        monthlyDebt: data.monthlyDebt,
        bankruptcyFiledYear: data.bankruptcyFiledYear,
        rentalHistoryComments: data.rentalHistoryComments,
        authorizeCreditCheck: data.authorizeCreditCheck,
        authorizeBackgroundCheck: data.authorizeBackgroundCheck,
        authorizeEmploymentVerification: data.authorizeEmploymentVerification,
        ssCardUploaded: data.ssCardUploaded,
        proofOfIncomeUploaded: data.proofOfIncomeUploaded,
        dlIdUploaded: data.dlIdUploaded,
        termsAcceptedAt: acceptanceTimestamp,
        termsVersion: data.termsVersion,
        privacyAcceptedAt: acceptanceTimestamp,
        privacyVersion: data.privacyVersion,
        status: ApplicationStatus.PENDING_AI_REVIEW,
      },
    });
   await this.aiQueue.add('score-application', {
      applicationId: application.id,
      tenantData: application,
    }, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: true,
    });

    // 3. Return 202 immediately
    

    // Record lifecycle event for submission
    if (applicantId) {
      const applicant = await this.prisma.user.findUnique({
        where: { id: applicantId },
      });
      
      if (applicant) {
        await this.lifecycleService.recordLifecycleEvent(
          application.id,
          ApplicationLifecycleEventType.SUBMITTED,
          null,
          ApplicationStatus.PENDING_AI_REVIEW,
          {
          userId: applicantId,
            username: applicant.username,
            role: applicant.role as Role,
          },
          {
            applicationNumber: `APP-${application.id}`,
          },
        );
      }
    }

    await this.securityEvents.logEvent({
      type: SecurityEventType.APPLICATION_LEGAL_ACCEPTED,
      success: true,
      userId: applicantId ?? null,
      username: application.email,
      metadata: {
        applicationId: application.id,
        propertyId: application.propertyId,
        unitId: application.unitId,
        termsVersion: application.termsVersion,
        privacyVersion: application.privacyVersion,
        termsAcceptedAt: application.termsAcceptedAt,
        privacyAcceptedAt: application.privacyAcceptedAt,
      },
    });

    await this.auditLogService.record({
      orgId: undefined,
      actorId: applicantId ?? null,
      module: 'rental-application',
      action: 'SUBMIT',
      entityType: 'rentalApplication',
      entityId: application.id,
      result: 'SUCCESS',
      metadata: {
        propertyId: application.propertyId,
        unitId: application.unitId,
      },
    });

    return { id: application.id, status: 'ACCEPTED' };
  }

  async getAllApplications(orgId?: string) {
    return this.prisma.rentalApplication.findMany({
      where: orgId ? { property: { organizationId: orgId } } : undefined,
      include: {
        applicant: true,
        property: true,
        unit: true,
        manualNotes: { include: { author: true }, orderBy: { createdAt: 'desc' } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getApplicationsByApplicantId(applicantId: string) {
    return this.prisma.rentalApplication.findMany({
      where: { applicantId },
      include: {
        property: true,
        unit: true,
        manualNotes: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getApplicationById(id: number, orgId?: string) {
    return this.prisma.rentalApplication.findFirst({
      where: { id, ...(orgId ? { property: { organizationId: orgId } } : {}) },
      include: {
        applicant: true,
        property: true,
        unit: true,
        manualNotes: { include: { author: true }, orderBy: { createdAt: 'desc' } },
      },
    });
  }

  async updateApplicationStatus(
    id: number,
    status: ApplicationStatus,
    actor?: { userId: string; username: string; role: Role },
    orgId?: string,
  ) {
    const application = await this.prisma.rentalApplication.findFirst({
      where: { id, ...(orgId ? { property: { organizationId: orgId } } : {}) },
    });

    if (!application) {
      throw new BadRequestException('Application not found');
    }

    // Use lifecycle service to transition status (includes validation and event recording)
    if (actor) {
      await this.lifecycleService.transitionStatus(
        id,
        status,
        actor,
        {
          applicationNumber: `APP-${id}`,
        },
      );
    } else {
      // Direct update without lifecycle tracking (for system/internal use)
      await this.prisma.rentalApplication.update({
        where: { id },
        data: { status },
      });
    }

    // Return updated application
    const updated = await this.prisma.rentalApplication.findUnique({
      where: { id },
      include: {
        applicant: true,
        property: true,
        unit: true,
        manualNotes: { include: { author: true }, orderBy: { createdAt: 'desc' } },
      },
    });

    await this.auditLogService.record({
      orgId,
      actorId: actor?.userId,
      module: 'rental-application',
      action: 'STATUS_UPDATE',
      entityType: 'rentalApplication',
      entityId: id,
      result: 'SUCCESS',
      metadata: {
        fromStatus: application.status,
        toStatus: status,
      },
    });

    return updated;
  }

  async screenApplication(
    id: number,
    actor: { userId: string; username: string; role: Role },
    orgId?: string,
  ) {
    const application = await this.prisma.rentalApplication.findFirst({
      where: { id, ...(orgId ? { property: { organizationId: orgId } } : {}) },
      include: {
        unit: {
          include: {
            lease: true,
          },
        },
      }, // Include lease to get rent amount
    });

    if (!application) {
      throw new Error('Rental application not found');
    }

    const rentAmount = application.unit.lease?.rentAmount || 0; // Assuming rent is part of an active lease
    const fairHousingInput = this.aiService.sanitizeForFairHousing({
      ...application,
      targetRent: rentAmount,
    });
    const tenancyScore = this.aiService.computeTenancySuccessScore(fairHousingInput.sanitizedInput);

    const evaluation = this.calculateScreening(application.income, rentAmount, {
      creditScore: application.creditScore ?? undefined,
      monthlyDebt: application.monthlyDebt ?? undefined,
      bankruptcyFiledYear: application.bankruptcyFiledYear ?? undefined,
    });

    // Record screening started event
    await this.lifecycleService.recordLifecycleEvent(
      id,
      ApplicationLifecycleEventType.SCREENING_STARTED,
      application.status,
      application.status,
      actor,
      {
        applicationNumber: `APP-${id}`,
      },
    );

    const updatedApplication = await this.prisma.rentalApplication.update({
      where: { id },
      data: {
        qualificationStatus: evaluation.qualificationStatus,
        recommendation: evaluation.recommendation,
        screeningDetails: `${evaluation.caption}\n\nDecision: ${tenancyScore.decisionExplanation}`,
        screeningScore: tenancyScore.score,
        screeningReasons: [
          ...evaluation.reasons,
          ...tenancyScore.traceabilityLog,
          ...fairHousingInput.redactionLog.map((entry) => `${entry.field}: ${entry.reason}`),
        ],
        screenedAt: new Date(),
        screenedBy: { connect: { id: actor.userId } },
      },
      include: {
        applicant: true,
        property: true,
        unit: true,
        manualNotes: { include: { author: true }, orderBy: { createdAt: 'desc' } },
      },
    });

    // Record screening completed event
    await this.lifecycleService.recordLifecycleEvent(
      id,
      ApplicationLifecycleEventType.SCREENING_COMPLETED,
      application.status,
      application.status,
      actor,
      {
        applicationNumber: `APP-${id}`,
        score: evaluation.score,
        tenancySuccessScore: tenancyScore.score,
        recommendation: evaluation.recommendation,
        qualificationStatus: evaluation.qualificationStatus,
        decisionBand: tenancyScore.decisionBand,
      },
    );

    await this.securityEvents.logEvent({
      type: SecurityEventType.APPLICATION_SCREENED,
      success: true,
      userId: actor.userId,
      username: actor.username,
      metadata: {
        applicationId: id,
        score: evaluation.score,
        recommendation: evaluation.recommendation,
        qualificationStatus: evaluation.qualificationStatus,
        income: application.income,
        rentAmount,
        creditScore: application.creditScore,
        fairHousingRedactions: fairHousingInput.redactionLog,
        tenancySuccessScore: tenancyScore.score,
        decisionBand: tenancyScore.decisionBand,
      },
    });

    await this.auditLogService.record({
      orgId,
      actorId: actor.userId,
      module: 'rental-application',
      action: 'SCREEN',
      entityType: 'rentalApplication',
      entityId: id,
      result: 'SUCCESS',
      metadata: {
        score: evaluation.score,
        tenancySuccessScore: tenancyScore.score,
        recommendation: evaluation.recommendation,
        qualificationStatus: evaluation.qualificationStatus,
        fairHousingRedactions: fairHousingInput.redactionLog,
        traceabilityLog: tenancyScore.traceabilityLog,
      },
    });

    if (tenancyScore.decisionBand === 'AUTO_APPROVE') {
      await (this.prisma as any).actionIntent.create({
        data: {
          type: 'ApproveTenantIntent',
          description: `Application APP-${id} exceeds auto-approval threshold.`,
          status: 'PENDING',
          priority: 'HIGH',
          organizationId: orgId,
          userId: actor.userId,
          metadata: {
            applicationId: id,
            screeningScore: tenancyScore.score,
            decisionExplanation: tenancyScore.decisionExplanation,
            traceabilityLog: tenancyScore.traceabilityLog,
          },
        },
      });
    }

    const incomeToRentRatio = rentAmount > 0 ? Number(application.income) / rentAmount : 0;
    const creditBand = this.mapCreditBand(application.creditScore ?? undefined);
    const recommendedDecision =
      tenancyScore.decisionBand === 'AUTO_APPROVE'
        ? 'APPROVE'
        : tenancyScore.decisionBand === 'REVIEW'
        ? 'CONDITIONAL_APPROVE'
        : 'DENY';
    const scoringModelVersion = 'TENANCY_SUCCESS_INTERNAL_V1';

    if (this.workflowEventService) {
      const workflowEvent = await this.workflowEventService.emitIfNotExists({
        propertyId: application.propertyId,
        aggregateType: 'Application',
        aggregateId: String(updatedApplication.id),
        eventType: 'application.scored',
        idempotencyKey: `application_scored:${updatedApplication.id}:${scoringModelVersion}:${updatedApplication.screenedAt?.toISOString() ?? 'unknown'}`,
        payload: {
          applicationId: String(updatedApplication.id),
          propertyId: application.propertyId,
          applicantId: application.applicantId ?? '',
          unitId: application.unitId,
          score: tenancyScore.score,
          incomeToRentRatio,
          creditBand,
          hasRecentEviction: false,
          thinCredit: !application.creditScore,
          recommendedDecision,
          scoredAt: updatedApplication.screenedAt?.toISOString() ?? new Date().toISOString(),
          scoringModelVersion,
          scoringSnapshot: {
            evaluationScore: evaluation.score,
            tenancySuccessScore: tenancyScore.score,
            qualificationStatus: updatedApplication.qualificationStatus,
            recommendation: updatedApplication.recommendation,
            decisionBand: tenancyScore.decisionBand,
            screeningReasons: updatedApplication.screeningReasons,
          },
        },
      });

      if (this.workflowEventProcessor) {
        try {
          await this.workflowEventProcessor.processEventById(workflowEvent.id);
        } catch (error) {
          await this.auditLogService.record({
            orgId,
            actorId: actor.userId,
            module: 'rental-application',
            action: 'POLICY_EVENT_PROCESSING_DEFERRED',
            entityType: 'policyWorkflowEvent',
            entityId: workflowEvent.id,
            result: 'FAILURE',
            metadata: {
              applicationId: updatedApplication.id,
              eventType: 'application.scored',
              error: String(error),
            },
          });
        }
      }
    }

    return updatedApplication;
  }

  calculateScreening(
    monthlyIncome: number,
    monthlyRent: number,
    extra: { creditScore?: number; monthlyDebt?: number; bankruptcyFiledYear?: number },
  ) {
    const reasons: string[] = [];
    const incomeRatio = monthlyRent > 0 ? monthlyIncome / monthlyRent : 0;
    let score = 0;

    if (incomeRatio >= 3.5) {
      score += 35;
      reasons.push(`Income covers rent ${incomeRatio.toFixed(2)}x`);
    } else if (incomeRatio >= 3) {
      score += 30;
      reasons.push(`Income covers rent ${incomeRatio.toFixed(2)}x`);
    } else if (incomeRatio >= 2.5) {
      score += 20;
      reasons.push(`Income covers rent ${incomeRatio.toFixed(2)}x (below target)`);
    } else {
      score += 10;
      reasons.push(`Income covers rent only ${incomeRatio.toFixed(2)}x`);
    }

    if (extra.creditScore) {
      const normalized = Math.min(Math.max(extra.creditScore, 300), 850);
      const creditContribution = ((normalized - 300) / 550) * 35;
      score += creditContribution;
      reasons.push(`Credit score ${extra.creditScore}`);
    } else {
      reasons.push('No credit score provided');
      score += 10;
    }

    if (extra.monthlyDebt && monthlyIncome > 0) {
      const dti = extra.monthlyDebt / monthlyIncome;
      if (dti <= 0.3) {
        score += 15;
        reasons.push(`DTI ${(dti * 100).toFixed(0)}%`);
      } else if (dti <= 0.45) {
        score += 8;
        reasons.push(`DTI ${(dti * 100).toFixed(0)}% (moderate)`);
      } else {
        score += 3;
        reasons.push(`High DTI ${(dti * 100).toFixed(0)}%`);
      }
    }

    if (extra.bankruptcyFiledYear) {
      const currentYear = new Date().getFullYear();
      if (currentYear - extra.bankruptcyFiledYear <= 7) {
        score -= 10;
        reasons.push(`Bankruptcy reported in ${extra.bankruptcyFiledYear}`);
      }
    }

    score = Math.max(0, Math.min(100, score));

    let qualificationStatus: QualificationStatus = QualificationStatus.NOT_QUALIFIED;
    let recommendation: Recommendation = Recommendation.DO_NOT_RECOMMEND_RENT;
    if (score >= 70) {
      qualificationStatus = QualificationStatus.QUALIFIED;
      recommendation = Recommendation.RECOMMEND_RENT;
    } else if (score >= 55) {
      qualificationStatus = QualificationStatus.QUALIFIED;
      recommendation = Recommendation.RECOMMEND_RENT;
      reasons.push('Score indicates marginal but acceptable risk.');
    } else {
      reasons.push('Score below recommended threshold.');
    }

    const caption = `Score ${score.toFixed(
      0,
    )}/100 — income ${incomeRatio.toFixed(2)}x rent. ${reasons.join(' ')}`;

    return { score, reasons, caption, qualificationStatus, recommendation };
  }

  private mapCreditBand(creditScore?: number): 'POOR' | 'FAIR' | 'GOOD' | 'VERY_GOOD' | 'EXCELLENT' {
    if (!creditScore || creditScore < 580) return 'POOR';
    if (creditScore < 670) return 'FAIR';
    if (creditScore < 740) return 'GOOD';
    if (creditScore < 800) return 'VERY_GOOD';
    return 'EXCELLENT';
  }

  async addNote(
    applicationId: number,
    dto: AddRentalApplicationNoteDto,
    actor: { userId: string; username: string; role: Role },
    orgId?: string,
  ) {
    const application = await this.prisma.rentalApplication.findFirst({
      where: { id: applicationId, ...(orgId ? { property: { organizationId: orgId } } : {}) },
    });

    if (!application) {
      throw new BadRequestException('Application not found');
    }

    const note = await this.prisma.rentalApplicationNote.create({
      data: {
        application: { connect: { id: applicationId } },
        author: { connect: { id: actor.userId } },
        body: dto.body,
      },
      include: { author: true },
    });

    // Record lifecycle event for note
    await this.lifecycleService.recordLifecycleEvent(
      applicationId,
      ApplicationLifecycleEventType.NOTE_ADDED,
      application.status,
      application.status,
      actor,
      {
        noteId: note.id,
        applicationNumber: `APP-${applicationId}`,
      },
    );

    await this.securityEvents.logEvent({
      type: SecurityEventType.APPLICATION_NOTE_CREATED,
      success: true,
      userId: actor.userId,
      username: actor.username,
      metadata: { applicationId },
    });

    await this.auditLogService.record({
      orgId,
      actorId: actor.userId,
      module: 'rental-application',
      action: 'ADD_NOTE',
      entityType: 'rentalApplication',
      entityId: applicationId,
      result: 'SUCCESS',
      metadata: { noteId: note.id },
    });

    return note;
  }

  /**
   * Get application lifecycle timeline
   */
  async getApplicationTimeline(applicationId: number, orgId?: string) {
    if (orgId) {
      const exists = await this.prisma.rentalApplication.findFirst({
        where: { id: applicationId, property: { organizationId: orgId } },
        select: { id: true },
      });
      if (!exists) {
        throw new BadRequestException('Application not found');
      }
    }
    return this.lifecycleService.getApplicationTimeline(applicationId);
  }

  /**
   * Get application lifecycle stage information
   */
  async getApplicationLifecycleStage(applicationId: number, orgId?: string) {
    const application = await this.getApplicationById(applicationId, orgId);
    if (!application) {
      throw new BadRequestException('Application not found');
    }
    return this.lifecycleService.getCurrentLifecycleStage(application);
  }

  /**
   * Get available status transitions for an application
   */
  async getAvailableTransitions(applicationId: number, userRole: Role, orgId?: string) {
    const application = await this.getApplicationById(applicationId, orgId);
    if (!application) {
      throw new BadRequestException('Application not found');
    }
    return this.lifecycleService.getAvailableTransitions(application.status, userRole);
  }

  async performReviewAction(
    applicationId: number,
    dto: RentalApplicationReviewActionDto,
    actor: { userId: string; username: string; role: Role },
    orgId?: string,
  ) {
    const application = await this.getApplicationById(applicationId, orgId);
    if (!application) {
      throw new BadRequestException('Application not found');
    }

    let updatedApplication = application;

    if (dto.action === RentalApplicationReviewAction.APPROVE) {
      await this.transitionUsingPath(applicationId, updatedApplication.status, ApplicationStatus.APPROVED, actor, [], {
        applicationNumber: `APP-${applicationId}`,
        note: dto.note,
      });

      await this.prisma.rentalApplication.update({
        where: { id: applicationId },
        data: {
          decisionReasonCode: null,
          decisionNotes: dto.note?.trim() || null,
          decisionedAt: new Date(),
        },
      });

      if (dto.note?.trim()) {
        await this.addNote(applicationId, { body: `Approval note: ${dto.note.trim()}` }, actor, orgId);
      }
    }

    if (dto.action === RentalApplicationReviewAction.DENY) {
      if (!dto.reasonCode) {
        throw new BadRequestException('reasonCode is required for denial actions');
      }
      if (!dto.reason?.trim()) {
        throw new BadRequestException('reason is required for denial actions');
      }

      await this.transitionUsingPath(applicationId, updatedApplication.status, ApplicationStatus.REJECTED, actor, [], {
        applicationNumber: `APP-${applicationId}`,
        reason: dto.reason,
        reasonCode: dto.reasonCode,
      });

      await this.prisma.rentalApplication.update({
        where: { id: applicationId },
        data: {
          decisionReasonCode: dto.reasonCode,
          decisionNotes: dto.reason.trim(),
          decisionedAt: new Date(),
        },
      });

      await this.addNote(
        applicationId,
        { body: `Denial reason [${dto.reasonCode}]: ${dto.reason.trim()}` },
        actor,
        orgId,
      );
    }

    if (dto.action === RentalApplicationReviewAction.REQUEST_INFO) {
      if (!dto.note?.trim()) {
        throw new BadRequestException('note is required when requesting additional information');
      }

      await this.transitionUsingPath(
        applicationId,
        updatedApplication.status,
        ApplicationStatus.DOCUMENTS_REVIEW,
        actor,
        [ApplicationStatus.UNDER_REVIEW],
        {
          applicationNumber: `APP-${applicationId}`,
          requestedInfoNote: dto.note,
          responseDeadline: dto.responseDeadline,
        },
      );

      const requestLines = ['Additional information requested from applicant.'];
      if (dto.note?.trim()) requestLines.push(`Requested details: ${dto.note.trim()}`);
      if (dto.responseDeadline) requestLines.push(`Response requested by: ${dto.responseDeadline}`);
      await this.addNote(applicationId, { body: requestLines.join(' ') }, actor, orgId);
    }

    if (dto.action === RentalApplicationReviewAction.SCHEDULE_INTERVIEW) {
      if (!dto.scheduledAt) {
        throw new BadRequestException('scheduledAt is required when scheduling an interview');
      }

      await this.transitionUsingPath(
        applicationId,
        updatedApplication.status,
        ApplicationStatus.INTERVIEW,
        actor,
        [ApplicationStatus.UNDER_REVIEW, ApplicationStatus.BACKGROUND_CHECK],
        {
          applicationNumber: `APP-${applicationId}`,
          scheduledAt: dto.scheduledAt,
        },
      );

      const scheduleEvent = await this.scheduleService.createEvent(
        {
          type: EventType.TOUR,
          title: `Application interview: ${application.fullName}`,
          date: dto.scheduledAt,
          priority: EventPriority.MEDIUM,
          description: dto.note?.trim() || `Interview for rental application APP-${application.id}`,
          propertyId: application.propertyId,
          unitId: application.unitId,
          tenantId: application.applicantId ?? undefined,
        },
        orgId,
        actor.userId,
      );

      await this.addNote(
        applicationId,
        {
          body: `Interview scheduled for ${dto.scheduledAt}. Schedule event #${scheduleEvent.id}${dto.note?.trim() ? `. Notes: ${dto.note.trim()}` : ''}`,
        },
        actor,
        orgId,
      );
    }

    updatedApplication = (await this.getApplicationById(applicationId, orgId))!;

    await this.auditLogService.record({
      orgId,
      actorId: actor.userId,
      module: 'rental-application',
      action: 'REVIEW_ACTION',
      entityType: 'rentalApplication',
      entityId: applicationId,
      result: 'SUCCESS',
      metadata: {
        action: dto.action,
        reason: dto.reason,
        scheduledAt: dto.scheduledAt,
      },
    });

    return updatedApplication;
  }

  private async transitionUsingPath(
    applicationId: number,
    currentStatus: ApplicationStatus,
    targetStatus: ApplicationStatus,
    actor: { userId: string; username: string; role: Role },
    path: ApplicationStatus[],
    metadata?: Record<string, unknown>,
  ) {
    const steps = [...path, targetStatus];
    let cursor = currentStatus;

    for (const next of steps) {
      if (cursor === next) continue;
      if (!this.lifecycleService.canTransition(cursor, next, actor.role)) {
        throw new BadRequestException(`Cannot transition application from ${cursor} to ${next} for ${actor.role}`);
      }
      await this.lifecycleService.transitionStatus(applicationId, next, actor, metadata);
      cursor = next;
    }
  }

  private buildReferences(entries?: SubmitApplicationDto['references']) {
    return (entries ?? [])
      .map((entry) => ({
        name: entry.name.trim(),
        relationship: this.normalizeString(entry.relationship),
        phone: this.normalizeString(entry.phone),
        email: this.normalizeString(entry.email),
        yearsKnown: this.normalizeString(entry.yearsKnown),
      }))
      .filter((entry) => !!entry.name);
  }

  private buildPastLandlords(entries?: SubmitApplicationDto['pastLandlords']) {
    return (entries ?? [])
      .map((entry) => ({
        name: entry.name.trim(),
        phone: this.normalizeString(entry.phone),
        email: this.normalizeString(entry.email),
        propertyAddress: this.normalizeString(entry.propertyAddress),
        startDate: this.parseDate(entry.startDate),
        endDate: this.parseDate(entry.endDate),
        monthlyRent: this.parseFloat(entry.monthlyRent),
        reasonForLeaving: this.normalizeString(entry.reasonForLeaving),
      }))
      .filter((entry) => !!entry.name);
  }

  private buildEmployments(entries?: SubmitApplicationDto['employments']) {
    return (entries ?? [])
      .map((entry) => ({
        employerName: entry.employerName.trim(),
        jobTitle: this.normalizeString(entry.jobTitle),
        supervisorName: this.normalizeString(entry.supervisorName),
        phone: this.normalizeString(entry.phone),
        email: this.normalizeString(entry.email),
        startDate: this.parseDate(entry.startDate),
        employmentType: this.normalizeString(entry.employmentType),
        monthlyIncome: this.parseFloat(entry.monthlyIncome),
      }))
      .filter((entry) => !!entry.employerName);
  }

  private buildAdditionalIncomes(entries?: SubmitApplicationDto['additionalIncomes']) {
    return (entries ?? [])
      .map((entry) => ({
        source: entry.source.trim(),
        amount: this.parseFloat(entry.amount),
        frequency: this.normalizeString(entry.frequency),
      }))
      .filter((entry) => !!entry.source);
  }

  private buildPets(entries?: SubmitApplicationDto['pets']) {
    return (entries ?? [])
      .map((entry) => ({
        type: entry.type.trim(),
        breed: this.normalizeString(entry.breed),
        name: this.normalizeString(entry.name),
        weight: this.parseFloat(entry.weight),
        age: this.parseInteger(entry.age),
        vaccinated: entry.vaccinated,
        spayedNeutered: entry.spayedNeutered,
      }))
      .filter((entry) => !!entry.type);
  }

  private buildVehicles(entries?: SubmitApplicationDto['vehicles']) {
    return (entries ?? [])
      .map((entry) => ({
        make: entry.make.trim(),
        model: this.normalizeString(entry.model),
        year: this.normalizeString(entry.year),
        color: this.normalizeString(entry.color),
        licensePlate: this.normalizeString(entry.licensePlate),
        registeredOwner: this.normalizeString(entry.registeredOwner),
      }))
      .filter((entry) => !!entry.make);
  }

  private normalizeString(value?: string): string | undefined {
    const trimmed = value?.trim();
    return trimmed && trimmed.length ? trimmed : undefined;
  }

  private parseFloat(value?: string | number): number | undefined {
    if (value === undefined || value === null) {
      return undefined;
    }

    if (typeof value === 'string' && !value.trim()) {
      return undefined;
    }

    const parsed = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  private parseInteger(value?: string | number): number | undefined {
    const parsed = this.parseFloat(value);
    if (parsed === undefined) {
      return undefined;
    }
    return Number.isInteger(parsed) ? parsed : Math.round(parsed);
  }

  private parseDate(value?: string): Date | undefined {
    const normalized = this.normalizeString(value);
    if (!normalized) {
      return undefined;
    }

    const parsed = new Date(normalized);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }

  private parseNumericId(value: string | number, field: string): string {
    return String(value);
  }

  async convertApprovedApplicationToLease(
    applicationId: number,
    actor: { userId: string; username: string; role: Role },
    payload: {
      startDate: string;
      endDate: string;
      rentAmount?: number;
      depositAmount?: number;
      moveInAt?: string;
      noticePeriodDays?: number;
    },
    orgId?: string,
  ) {
    const application = await this.prisma.rentalApplication.findFirst({
      where: { id: applicationId, ...(orgId ? { property: { organizationId: orgId } } : {}) },
      include: { applicant: true },
    });

    if (!application) {
      throw new BadRequestException('Application not found');
    }

    if (application.status !== ApplicationStatus.APPROVED) {
      throw new BadRequestException('Only approved applications can be converted to lease');
    }

    if (application.convertedLeaseId) {
      return this.prisma.lease.findUnique({ where: { id: application.convertedLeaseId } });
    }

    const startDate = new Date(payload.startDate);
    const endDate = new Date(payload.endDate);
    const moveInAt = payload.moveInAt ? new Date(payload.moveInAt) : startDate;
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || endDate <= startDate) {
      throw new BadRequestException('Invalid lease term dates provided');
    }

    const applicantId = application.applicantId;
    if (!applicantId) {
      throw new BadRequestException('Application has no linked applicant user; cannot create lease');
    }

    const existingLease = await this.prisma.lease.findUnique({ where: { tenantId: applicantId } });
    if (existingLease) {
      throw new BadRequestException('Applicant already has an existing lease');
    }

    const createdLease = await this.prisma.$transaction(async (tx) => {
      const lease = await tx.lease.create({
        data: {
          tenantId: applicantId,
          unitId: application.unitId,
          startDate,
          endDate,
          moveInAt,
          rentAmount: payload.rentAmount ?? application.income * 0.3,
          depositAmount: payload.depositAmount ?? 0,
          noticePeriodDays: payload.noticePeriodDays ?? 30,
          status: LeaseStatus.DRAFT,
        },
      });

      await tx.rentalApplication.update({
        where: { id: applicationId },
        data: {
          convertedLeaseId: lease.id,
          decisionNotes: application.decisionNotes
            ? `${application.decisionNotes}\nConverted to lease ${lease.id} at ${new Date().toISOString()}`
            : `Converted to lease ${lease.id} at ${new Date().toISOString()}`,
        },
      });

      await tx.leaseHistory.create({
        data: {
          leaseId: lease.id,
          actorId: actor.userId,
          fromStatus: LeaseStatus.DRAFT,
          toStatus: LeaseStatus.DRAFT,
          note: `Lease created from approved application APP-${applicationId}`,
          metadata: {
            sourceApplicationId: applicationId,
            sourceApplicationStatus: application.status,
            conversionActor: actor.username,
          },
        },
      });

      return lease;
    });

    await this.auditLogService.record({
      orgId,
      actorId: actor.userId,
      module: 'rental-application',
      action: 'CONVERT_TO_LEASE',
      entityType: 'rentalApplication',
      entityId: applicationId,
      result: 'SUCCESS',
      metadata: {
        leaseId: createdLease.id,
      },
    });

    await this.scheduleService.createEvent(
      {
        type: EventType.MOVE_IN,
        title: `Move-In Scheduled - ${application.fullName}`,
        date: moveInAt.toISOString(),
        priority: EventPriority.HIGH,
        description: `Move-in scheduled for lease ${createdLease.id} created from approved application APP-${applicationId}.`,
        propertyId: application.propertyId,
        unitId: application.unitId,
        tenantId: applicantId,
      },
      orgId,
      actor.userId,
    );

    await this.notificationsService.create({
      userId: applicantId,
      type: NotificationType.SYSTEM_ANNOUNCEMENT,
      title: 'Lease Draft Ready',
      message: `Your application has been converted to lease ${createdLease.id}. Your move-in is scheduled for ${moveInAt.toDateString()}. Review the upcoming lease packet and onboarding steps in your portal.`,
      metadata: {
        applicationId,
        leaseId: createdLease.id,
        moveInAt: moveInAt.toISOString(),
        propertyId: application.propertyId,
        unitId: application.unitId,
        workflow: 'APPLICATION_TO_LEASE_CONVERSION',
      },
      sendEmail: true,
      useAITiming: true,
      urgency: 'HIGH',
    });

    return createdLease;
  }

  async getAiReview(applicationId: number, orgId?: string) {
    const application = await this.getApplicationById(applicationId, orgId);
    if (!application) {
      throw new BadRequestException('Application not found');
    }

    const unitLease = await this.prisma.lease.findFirst({
      where: { unitId: application.unitId, status: LeaseStatus.ACTIVE },
      select: { rentAmount: true },
    });

    const review = await this.aiService.getAiReview(String(application.id));
    const fairHousingInput = this.aiService.sanitizeForFairHousing({
      ...application,
      targetRent: unitLease?.rentAmount ?? 0,
    });
    const tenancyScore = this.aiService.computeTenancySuccessScore(fairHousingInput.sanitizedInput);

    await this.auditLogService.record({
      orgId,
      actorId: null,
      module: 'rental-application',
      action: 'AI_REVIEW',
      entityType: 'rentalApplication',
      entityId: applicationId,
      result: 'SUCCESS',
      metadata: {
        recommendation: review.recommendation,
        tenancySuccessScore: tenancyScore.score,
        decisionBand: tenancyScore.decisionBand,
      },
    });

    // Persist review data
    await this.prisma.rentalApplication.update({
      where: { id: applicationId },
      data: {
        ai_recommendation: review.recommendation,
        ai_summary: `${review.summary}\n\n${tenancyScore.decisionExplanation}`,
        ai_reviewed_at: new Date(),
      },
    });

    await this.auditLogService.record({
      orgId,
      actorId: null,
      module: 'rental-application',
      action: 'TENANCY_OUTCOME_PREDICTION_RECORDED',
      entityType: 'rentalApplication',
      entityId: applicationId,
      result: 'SUCCESS',
      metadata: {
        predictedScore: tenancyScore.score,
        predictedBand: tenancyScore.decisionBand,
        decisionExplanation: tenancyScore.decisionExplanation,
        traceabilityLog: tenancyScore.traceabilityLog,
      },
    });

    return {
      ...review,
      fairHousingRedactions: fairHousingInput.redactionLog,
      tenancySuccessScore: tenancyScore.score,
      decisionBand: tenancyScore.decisionBand,
      decisionExplanation: tenancyScore.decisionExplanation,
      traceabilityLog: tenancyScore.traceabilityLog,
    };
  }

  async recordPredictedOutcomeFeedback(
    applicationId: number,
    outcome: {
      actualOutcome: 'LEASE_COMPLETED' | 'DELINQUENT' | 'EVICTION_FILED' | 'EARLY_MOVE_OUT' | 'UNKNOWN';
      daysToDelinquency?: number;
      notes?: string;
    },
    actor: { userId: string; username: string; role: Role },
    orgId?: string,
  ) {
    const application = await this.getApplicationById(applicationId, orgId);
    if (!application) {
      throw new BadRequestException('Application not found');
    }

    await this.auditLogService.record({
      orgId,
      actorId: actor.userId,
      module: 'rental-application',
      action: 'RECORD_TENANCY_OUTCOME',
      entityType: 'rentalApplication',
      entityId: applicationId,
      result: 'SUCCESS',
      metadata: {
        predictedScore: application.screeningScore,
        predictedRecommendation: application.recommendation,
        actualOutcome: outcome.actualOutcome,
        daysToDelinquency: outcome.daysToDelinquency,
        notes: outcome.notes,
      },
    });

    if (outcome.notes?.trim()) {
      await this.addNote(
        applicationId,
        { body: `Outcome tracking: ${outcome.actualOutcome}. ${outcome.notes.trim()}` },
        actor,
        orgId,
      );
    }

    return {
      applicationId,
      predictedScore: application.screeningScore,
      predictedRecommendation: application.recommendation,
      actualOutcome: outcome.actualOutcome,
      recorded: true,
    };
  }
}
