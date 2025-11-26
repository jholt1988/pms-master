import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { LeaseStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LeaseService } from './lease.service';
import { AILeaseRenewalService } from './ai-lease-renewal.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '@prisma/client';

@Injectable()
export class LeaseTasksService {
  private readonly logger = new Logger(LeaseTasksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly leaseService: LeaseService,
    private readonly aiLeaseRenewalService: AILeaseRenewalService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Check for lease renewals and use AI to predict likelihood
   * Runs daily at 8 AM
   */
  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async checkLeaseRenewals() {
    this.logger.log('Checking for upcoming lease renewals...');

    try {
      // Get leases expiring in 90 days
      const expiringLeases = await this.leaseService.getLeasesExpiringInDays(90);
      this.logger.log(`Found ${expiringLeases.length} leases expiring in next 90 days`);

      let offersGenerated = 0;
      let vacanciesPrepared = 0;

      for (const lease of expiringLeases) {
        try {
          // Predict renewal likelihood using AI
          const startTime = Date.now();
          const prediction = await this.aiLeaseRenewalService.predictRenewalLikelihood(lease.id);
          const responseTime = Date.now() - startTime;

          this.logger.log(
            `Renewal prediction for lease ${lease.id}: ` +
            `${(prediction.renewalProbability * 100).toFixed(1)}% ` +
            `(confidence: ${prediction.confidence}) (${responseTime}ms)`,
          );

          // Only send offers if likelihood is reasonable (> 30%)
          if (prediction.renewalProbability > 0.3) {
            // Generate personalized renewal offer
            const offer = await this.aiLeaseRenewalService.generatePersonalizedRenewalOffer(lease.id);

            // Create renewal offer
            const renewalOfferDto = {
              proposedRent: offer.baseRent,
              proposedStart: lease.endDate.toISOString().split('T')[0],
              proposedEnd: this.addDays(lease.endDate, 365).toISOString().split('T')[0],
              message: offer.message,
              expiresAt: offer.expirationDate.toISOString().split('T')[0],
            };

            await this.leaseService.createRenewalOffer(lease.id, renewalOfferDto, 0); // System user

            // Send notification to tenant
            if (lease.tenant) {
              await this.notificationsService.create({
                userId: lease.tenantId,
                type: NotificationType.LEASE_RENEWAL,
                title: 'Lease Renewal Offer',
                message: offer.message,
                metadata: {
                  leaseId: lease.id,
                  renewalProbability: prediction.renewalProbability,
                  baseRent: offer.baseRent,
                  incentives: offer.incentives,
                  totalValue: offer.totalValue,
                },
                sendEmail: true,
                useAITiming: true,
                personalize: true,
                urgency: 'MEDIUM',
              });

              this.logger.log(`Sent renewal offer notification to tenant ${lease.tenant.username} for lease ${lease.id}`);
            }

            offersGenerated++;
          } else {
            // Low likelihood - prepare for vacancy
            this.logger.log(
              `Low renewal likelihood (${(prediction.renewalProbability * 100).toFixed(1)}%) ` +
              `for lease ${lease.id}, preparing for vacancy`,
            );

            await this.leaseService.prepareForVacancy(lease.id);
            vacanciesPrepared++;
          }
        } catch (error) {
          this.logger.error(
            `Error processing renewal for lease ${lease.id}:`,
            error instanceof Error ? error.message : String(error),
          );
        }
      }

      this.logger.log(
        `Lease renewal check completed: ${offersGenerated} offers generated, ${vacanciesPrepared} vacancies prepared`,
      );
    } catch (error) {
      this.logger.error('Failed to check lease renewals:', error);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async flagUpcomingRenewals() {
    const now = new Date();
    const defaultLeadDays = 60;
    const leases = await this.prisma.lease.findMany({
      where: {
        status: LeaseStatus.ACTIVE,
        renewalOfferedAt: null,
        endDate: {
          gte: now,
          lte: this.addDays(now, defaultLeadDays),
        },
      },
      select: {
        id: true,
        endDate: true,
        autoRenewLeadDays: true,
        tenantId: true,
      },
    });

    for (const lease of leases) {
      const leadDays = lease.autoRenewLeadDays ?? defaultLeadDays;
      const renewalDueAt = this.addDays(lease.endDate, -Math.min(leadDays, defaultLeadDays));

      await this.prisma.lease.update({
        where: { id: lease.id },
        data: {
          status: LeaseStatus.RENEWAL_PENDING,
          renewalOfferedAt: now,
          renewalDueAt,
        },
      });

      await this.leaseService.logHistory(lease.id, undefined, {
        fromStatus: LeaseStatus.ACTIVE,
        toStatus: LeaseStatus.RENEWAL_PENDING,
        note: 'Lease auto-flagged for renewal review',
      });
    }

    if (leases.length > 0) {
      this.logger.log(`Flagged ${leases.length} leases for renewal review.`);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async closeCompletedTerminations() {
    const now = new Date();
    const leases = await this.prisma.lease.findMany({
      where: {
        status: {
          in: [LeaseStatus.TERMINATING, LeaseStatus.NOTICE_GIVEN],
        },
        terminationEffectiveAt: {
          not: null,
          lte: now,
        },
      },
      select: { id: true, status: true },
    });

    for (const lease of leases) {
      await this.prisma.lease.update({
        where: { id: lease.id },
        data: { status: LeaseStatus.TERMINATED },
      });

      await this.leaseService.logHistory(lease.id, undefined, {
        fromStatus: lease.status,
        toStatus: LeaseStatus.TERMINATED,
        note: 'Lease auto-closed after termination effective date',
      });
    }

    if (leases.length > 0) {
      this.logger.log(`Closed ${leases.length} terminated leases.`);
    }
  }

  private addDays(date: Date, days: number) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }
}
