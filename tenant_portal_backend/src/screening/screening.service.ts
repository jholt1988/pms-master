import { Injectable, Logger, NotFoundException, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ScreeningProvider, ScreeningApplicant } from './screening-provider.interface';
import { ApplicationStatus } from '@prisma/client';
import { SCREENING_PROVIDER } from './screening.constants';

/**
 * ScreeningService — orchestrates tenant screening requests through
 * the configured provider (stub in dev/CI, real provider in production).
 *
 * Lifecycle:
 * 1. requestScreening() → creates ScreeningRequest, sets app status to SCREENING
 * 2. Provider processes async (or stub returns sync)
 * 3. processResult() → stores ScreeningReport, updates app status to SCORED
 */
@Injectable()
export class ScreeningService {
  private readonly logger = new Logger(ScreeningService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(SCREENING_PROVIDER) private readonly provider: ScreeningProvider,
  ) {}

  /**
   * Initiate a screening request for a rental application.
   */
  async requestScreening(applicationId: number): Promise<{ requestId: string }> {
    const application = await this.prisma.rentalApplication.findUnique({
      where: { id: applicationId },
    });

    if (!application) {
      throw new NotFoundException(`Application #${applicationId} not found`);
    }

    const applicant: ScreeningApplicant = {
      applicationId,
      fullName: application.fullName,
      email: application.email,
      phoneNumber: application.phoneNumber ?? undefined,
    };

    // Create the request record
    const screeningRequest = await this.prisma.screeningRequest.create({
      data: {
        applicationId,
        provider: this.provider.id,
        status: 'IN_PROGRESS',
        requestedAt: new Date(),
      },
    });

    try {
      // Submit to provider
      const { externalId } = await this.provider.submit(applicant);

      // Update with provider's external reference
      await this.prisma.screeningRequest.update({
        where: { id: screeningRequest.id },
        data: { externalId },
      });

      // Transition application to SCREENING status
      await this.prisma.rentalApplication.update({
        where: { id: applicationId },
        data: { status: ApplicationStatus.SCREENING },
      });

      // Record lifecycle event
      await this.prisma.applicationLifecycleEvent.create({
        data: {
          applicationId,
          eventType: 'SCREENING_STARTED',
          toStatus: ApplicationStatus.SCREENING,
          metadata: { requestId: screeningRequest.id, provider: this.provider.id },
        },
      });

      // For synchronous providers (stub), process immediately
      const result = await this.provider.getResult(externalId);
      if (result) {
        await this.processResult(externalId, result);
      }

      return { requestId: screeningRequest.id };
    } catch (error) {
      this.logger.error(
        `Screening submission failed for app #${applicationId}: ${error}`,
      );

      await this.prisma.screeningRequest.update({
        where: { id: screeningRequest.id },
        data: {
          status: 'FAILED',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          completedAt: new Date(),
        },
      });

      throw error;
    }
  }

  /**
   * Process a screening result (called by webhook handler or polling).
   */
  async processResult(
    externalId: string,
    result: Awaited<ReturnType<ScreeningProvider['getResult']>>,
  ): Promise<void> {
    if (!result) {
      this.logger.warn(`No result available — skipping`);
      return;
    }

    const request = await this.prisma.screeningRequest.findFirst({
      where: { externalId },
      include: { report: true },
    });

    if (!request) {
      this.logger.warn(`No screening request found for externalId=${externalId}`);
      return;
    }

    // Store report
    const report = await this.prisma.screeningReport.create({
      data: {
        requestId: request.id,
        creditScore: result.creditScore,
        incomeVerified: result.incomeVerified,
        identityVerified: result.identityVerified,
        backgroundClear: result.backgroundClear,
        evictionHistory: result.evictionHistory,
        criminalHistory: result.criminalHistory,
        recommendation: result.recommendation,
        riskFlags: result.riskFlags as any,
        rawReport: result.rawReport as any,
      },
    });

    // Update request status
    await this.prisma.screeningRequest.update({
      where: { id: request.id },
      data: {
        status: result.status === 'FAILED' ? 'FAILED' : 'COMPLETE',
        completedAt: result.completedAt ?? new Date(),
        errorMessage: result.errorMessage,
      },
    });

    // Update application with screening results
    const scoredStatus =
      result.status === 'FAILED' ? ApplicationStatus.SCREENING : ApplicationStatus.SCORED;

    await this.prisma.rentalApplication.update({
      where: { id: request.applicationId },
      data: {
        status: scoredStatus,
        screeningScore: result.creditScore,
        screeningReasons: result.riskFlags as any,
        screenedAt: result.completedAt ?? new Date(),
        qualificationStatus: result.recommendation === 'DECLINE' ? 'NOT_QUALIFIED' : 'QUALIFIED',
        recommendation:
          result.recommendation === 'DECLINE'
            ? 'DO_NOT_RECOMMEND_RENT'
            : 'RECOMMEND_RENT',
      },
    });

    // Record lifecycle event
    await this.prisma.applicationLifecycleEvent.create({
      data: {
        applicationId: request.applicationId,
        eventType: 'SCREENING_COMPLETED',
        toStatus: scoredStatus,
        metadata: {
          requestId: request.id,
          reportId: report.id,
          provider: request.provider,
          recommendation: result.recommendation,
        },
      },
    });

    this.logger.log(
      `Screening completed for app #${request.applicationId}: ${result.recommendation}`,
    );
  }

  /**
   * Get the latest screening result for an application.
   */
  async getLatestForApplication(applicationId: number) {
    return this.prisma.screeningRequest.findFirst({
      where: { applicationId },
      orderBy: { requestedAt: 'desc' },
      include: { report: true },
    });
  }
}
