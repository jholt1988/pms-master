
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
  
  async submitApplication(data: SubmitApplicationDto, applicantId?: string) {
    const propertyId = data.propertyId
    if (!data.termsAccepted || !data.privacyAccepted) {
      throw new BadRequestException('Terms of Service and Privacy Policy must be accepted');
    }
    const acceptanceTimestamp = new Date();
    const unitId = this.parseNumericId(data.unitId, 'unit');
    const references = this.buildReferences(data.references);
    const pastLandlords = this.buildPastLandlords(data.pastLandlords);
    const employments = this.buildEmployments(data.employments);
    const additionalIncomes = this.buildAdditionalIncomes(data.additionalIncomes);
    const pets = this.buildPets(data.pets);
    const vehicles = this.buildVehicles(data.vehicles);
    const negativeAspects = this.normalizeString(data.negativeAspectsExplanation);

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
        creditScore: data.creditScore,
        monthlyDebt: data.monthlyDebt,
        authorizeCreditCheck: data.authorizeCreditCheck,
        authorizeBackgroundCheck: data.authorizeBackgroundCheck,
        authorizeEmploymentVerification: data.authorizeEmploymentVerification,
        negativeAspectsExplanation: negativeAspects,
        ssCardUploaded: data.ssCardUploaded,
        dlIdUploaded: data.dlIdUploaded,
        bankruptcyFiledYear: data.bankruptcyFiledYear,
        rentalHistoryComments: data.rentalHistoryComments,
        termsAcceptedAt: acceptanceTimestamp,
        termsVersion: data.termsVersion,
        privacyAcceptedAt: acceptanceTimestamp,
        privacyVersion: data.privacyVersion,
        references: { create: references },
        pastLandlords: { create: pastLandlords },
        employments: { create: employments },
        additionalIncomes: { create: additionalIncomes },
        pets: { create: pets },
        vehicles: { create: vehicles },
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

    return application;
  }

  async getAllApplications(orgId?: string) {
    return this.prisma.rentalApplication.findMany({
      where: orgId ? { property: { organizationId: orgId } } : undefined,
      include: {
        applicant: true,
        property: true,
        unit: true,
        references: true,
        pastLandlords: true,
        employments: true,
        additionalIncomes: true,
        pets: true,
        vehicles: true,
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
        references: true,
        pastLandlords: true,
        employments: true,
        additionalIncomes: true,
        pets: true,
        vehicles: true,
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
        references: true,
        pastLandlords: true,
        employments: true,
        additionalIncomes: true,
        pets: true,
        vehicles: true,
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

  private parseNumericId(value: string | number, field: string): number {
    const parsed = typeof value === 'string' ? Number(value) : value;
    if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
      throw new BadRequestException(`Invalid ${field} identifier provided.`);
    }
    return parsed;
  }
}
