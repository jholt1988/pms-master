
import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  ApplicationStatus,
  QualificationStatus,
  Recommendation,
  Role,
  SecurityEventType,
} from '@prisma/client';
import { SubmitApplicationDto } from './dto/submit-application.dto';
import { SecurityEventsService } from '../security-events/security-events.service';
import { AddRentalApplicationNoteDto } from './dto/add-note.dto';
import { ApplicationLifecycleService, ApplicationLifecycleEventType } from './application-lifecycle.service';

@Injectable()
export class RentalApplicationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly securityEvents: SecurityEventsService,
    private readonly lifecycleService: ApplicationLifecycleService,
  ) {}

  async submitApplication(data: SubmitApplicationDto, applicantId?: number) {
    const application = await this.prisma.rentalApplication.create({
      data: {
        property: { connect: { id: data.propertyId } },
        unit: { connect: { id: data.unitId } },
        applicant: applicantId ? { connect: { id: applicantId } } : undefined,
        fullName: data.fullName,
        email: data.email,
        phoneNumber: data.phoneNumber,
        income: data.income,
        employmentStatus: data.employmentStatus,
        previousAddress: data.previousAddress,
        creditScore: data.creditScore,
        monthlyDebt: data.monthlyDebt,
        bankruptcyFiledYear: data.bankruptcyFiledYear,
        rentalHistoryComments: data.rentalHistoryComments,
        status: ApplicationStatus.PENDING,
      },
    });

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
          ApplicationStatus.PENDING,
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

    return application;
  }

  async getAllApplications() {
    return this.prisma.rentalApplication.findMany({
      include: {
        applicant: true,
        property: true,
        unit: true,
        manualNotes: { include: { author: true }, orderBy: { createdAt: 'desc' } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getApplicationsByApplicantId(applicantId: number) {
    return this.prisma.rentalApplication.findMany({
      where: { applicantId },
      include: { property: true, unit: true, manualNotes: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getApplicationById(id: number) {
    return this.prisma.rentalApplication.findUnique({
      where: { id },
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
    actor?: { userId: number; username: string; role: Role },
  ) {
    const application = await this.prisma.rentalApplication.findUnique({
      where: { id },
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
    return this.prisma.rentalApplication.findUnique({
      where: { id },
      include: {
        applicant: true,
        property: true,
        unit: true,
        manualNotes: { include: { author: true }, orderBy: { createdAt: 'desc' } },
      },
    });
  }

  async screenApplication(
    id: number,
    actor: { userId: number; username: string; role: Role },
  ) {
    const application = await this.prisma.rentalApplication.findUnique({
      where: { id },
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

    // Basic screening logic: income must be at least 3x rent
    const rentAmount = application.unit.lease?.rentAmount || 0; // Assuming rent is part of an active lease
    const requiredIncome = rentAmount * 3;

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
        screeningDetails: evaluation.caption,
        screeningScore: evaluation.score,
        screeningReasons: evaluation.reasons,
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
        recommendation: evaluation.recommendation,
        qualificationStatus: evaluation.qualificationStatus,
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
      },
    });

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

  async addNote(
    applicationId: number,
    dto: AddRentalApplicationNoteDto,
    actor: { userId: number; username: string; role: Role },
  ) {
    const application = await this.prisma.rentalApplication.findUnique({
      where: { id: applicationId },
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

    return note;
  }

  /**
   * Get application lifecycle timeline
   */
  async getApplicationTimeline(applicationId: number) {
    return this.lifecycleService.getApplicationTimeline(applicationId);
  }

  /**
   * Get application lifecycle stage information
   */
  async getApplicationLifecycleStage(applicationId: number) {
    const application = await this.getApplicationById(applicationId);
    if (!application) {
      throw new BadRequestException('Application not found');
    }
    return this.lifecycleService.getCurrentLifecycleStage(application);
  }

  /**
   * Get available status transitions for an application
   */
  async getAvailableTransitions(applicationId: number, userRole: Role) {
    const application = await this.getApplicationById(applicationId);
    if (!application) {
      throw new BadRequestException('Application not found');
    }
    return this.lifecycleService.getAvailableTransitions(application.status, userRole);
  }
}




