import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { RentalApplicationAiService } from './rental-application.ai.service';
import { ApplicationStatus } from '@prisma/client';

@Processor('ai-screening')
export class RentalApplicationProcessor extends WorkerHost {
  private readonly logger = new Logger(RentalApplicationProcessor.name);

  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly prisma: PrismaService,
    private readonly aiService: RentalApplicationAiService, // Injecting your specialized AI gateway
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    if (job.name === 'score-application') {
      const { applicationId } = job.data;

      try {
        // Attempt 1: The External "Brain" (FastAPI)
        // This method in your AI service already has built-in sanitization logic
        this.logger.log(`Attempting external AI review for Application: ${applicationId}`);
        const scoreResult = await this.aiService.getAiReview(applicationId);
        
        return await this.finalizeScoring(applicationId, scoreResult, 'EXTERNAL');

      } catch (error) {
        /**
         * FALLBACK STRATEGY:
         * If BullMQ exhausts the configured retries, we trigger the internal logic.
         * This prevents the "vulnerable time" for tenants from being extended by system downtime.
         */
        if (job.attemptsMade >= (job.opts.attempts || 3)) {
          this.logger.warn(`AI Service unreachable after ${job.attemptsMade} attempts. Executing internal fallback for ${applicationId}`);
          
          // Execute your rule-based internal review
          const fallbackResult = await this.aiService.runInternalReview(applicationId);
          
          return await this.finalizeScoring(applicationId, fallbackResult, 'INTERNAL_FALLBACK');
        }

        // Throw error to trigger BullMQ's exponential backoff retry
        throw new Error(`External AI Review failed: ${error.message}`);
      }
    }
  }

  /**
   * Finalizes the state and triggers the "Nerves" (Event Bus)
   */
  private async finalizeScoring(applicationId: string, result: any, source: string) {
    // 1. Update the record with the results from either Brain or Fallback
    const updatedApplication = await this.prisma.rentalApplication.update({
      where: { id: Number(applicationId) },
      data: { 
        // Mapping recommendation/summary from your AI service
        ai_recommendation: result.recommendation || result.decisionBand,
        ai_summary: result.summary || result.decisionExplanation,
        ai_reviewed_at: new Date(),
        status: ApplicationStatus.SCREENING, // Moving to the next lifecycle stage
      },
    });

    // 2. The Nerves: Emit event for FeedAggregator (The Synapse) and Policy Workflow
    this.eventEmitter.emit('application.scored', {
      applicationId: updatedApplication.id,
      score: result.score || result.checks_passed,
      urgency: result.urgency || (result.recommendation === 'deny' ? 'HIGH' : 'LOW'),
      source,
      metadata: {
        recommendation: updatedApplication.ai_recommendation,
        summary: updatedApplication.ai_summary
      }
    });

    this.logger.log(`Successfully finalized application ${applicationId} via ${source}`);
    return { status: 'COMPLETED', source };
  }
}