import { Injectable, Logger, Optional } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentsService } from '../payments/payments.service';
import { AIPaymentService } from '../payments/ai-payment.service';
import { AIPaymentMetricsService } from '../payments/ai-payment-metrics.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType, Invoice } from '@prisma/client';
import { subDays } from 'date-fns';
import { EsignatureService } from '../esignature/esignature.service';
import { RentOptimizationService } from '../rent-optimization/rent-optimization.service';
import { AnalyticsService } from '../reporting/analytics.service';
import { WorkflowEventService } from '../policy/workflow-event.service';
import { WorkflowEventProcessor } from '../policy/workflow-event-processor.service';

@Injectable()
export class ScheduledJobsService {
  private readonly logger = new Logger(ScheduledJobsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentsService: PaymentsService,
    private readonly aiPaymentService: AIPaymentService,
    private readonly aiMetrics: AIPaymentMetricsService,
    private readonly notificationsService: NotificationsService,
    private readonly esignatureService: EsignatureService,
    private readonly rentOptimizationService: RentOptimizationService,
    private readonly analyticsService: AnalyticsService,
    @Optional() private readonly workflowEventService?: WorkflowEventService,
    @Optional() private readonly workflowEventProcessor?: WorkflowEventProcessor,
  ) {}

  /**
   * Phase 4: Dynamic Rent Pricing & Yield Optimization (Property OS)
   * Runs daily to evaluate lease renewal churn risk and propose automated airline-style pricing
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM, { // Runs every day at 3 AM
    name: 'evaluateUpcomingRenewals',
  })
  async evaluateUpcomingRenewals() {
    this.logger.log('Beginning Predictive Churn and Dynamic Pricing scan...');

    try {
      const intents = await this.rentOptimizationService.generateRenewalOffers();
      this.logger.log(`Generated ${intents.length} renewal pricing intents.`);

    } catch (error) {
       this.logger.error('Failed to run evaluateUpcomingRenewals CRON: ', error);
    }
  }

  /**

   * Phase 5: Autonomous Financial Assessment (Property OS)
   * Evaluates all portfolios evaluating internal margin loss.
   */
  @Cron(CronExpression.EVERY_DAY_AT_4AM, { // Runs every day at 4 AM
    name: 'evaluatePortfolioPerformance',
  })
  async evaluatePortfolioPerformance() {
    this.logger.log('Executing automated internal CapEx audit...');
    try {
      await this.analyticsService.generateCapitalAllocationIntents();
    } catch (e) {
      this.logger.error('Failed to execute automated CapEx audit:', e);
    }
  }

  /**
   * Phase 7A: Daily Action Items — PM Command Center Intelligence
   * Generates ML-driven action items surfacing expiring leases, stale maintenance,
   * chronic delinquency, and vacancy gaps.
   */
  @Cron(CronExpression.EVERY_DAY_AT_6AM, {
    name: 'generateDailyActionItems',
  })
  async generateDailyActionItems() {
    this.logger.log('Generating daily PM Command Center action items...');
    try {
      // Clear stale daily action items from previous runs
      await (this.prisma as any).actionIntent.deleteMany({
        where: { type: 'DAILY_ACTION_ITEM', status: 'PENDING' },
      });
      await this.analyticsService.generateDailyActionItems();
    } catch (e) {
      this.logger.error('Failed to generate daily action items:', e);
    }
  }

  /**
   * Process due payments daily at 2 AM
   * Uses AI to assess payment risk before processing
   */
  @Cron('0 2 * * *', {
    name: 'processDuePayments',
    timeZone: 'America/New_York',
  })
  async processDuePayments() {
    this.logger.log('Checking for due payments...');

    try {
      const dueInvoices = (await this.paymentsService.getInvoicesDueToday()) as Array<
        Invoice & { lease?: { tenantId?: string } }
      >;
      this.logger.log(`Found ${dueInvoices.length} invoices due today`);

      let processedCount = 0;
      let reminderCount = 0;
      let planOfferedCount = 0;

      for (const invoice of dueInvoices) {
        try {
          if (!invoice.leaseId) {
            this.logger.warn(`Invoice ${invoice.id} has no tenant, skipping`);
            continue;
          }

          const tenantId = invoice.lease?.tenantId ?? String(invoice.leaseId);
          // Assess payment risk using AI
          const startTime = Date.now();
          let riskAssessment;
          try {
            riskAssessment = await this.aiPaymentService.assessPaymentRisk(
              tenantId,
              invoice.id,
            );
            const responseTime = Date.now() - startTime;

            // Record metric
            this.aiMetrics.recordMetric({
              operation: 'assessPaymentRisk',
              success: true,
              responseTime,
              tenantId,
              invoiceId: invoice.id,
            });

            this.logger.log(
              `Risk assessment for invoice ${invoice.id}: ` +
              `${riskAssessment.riskLevel} (${riskAssessment.riskScore.toFixed(1)}%) ` +
              `(${responseTime}ms)`,
            );
          } catch (error) {
            const responseTime = Date.now() - startTime;
            // Record failed metric
            this.aiMetrics.recordMetric({
              operation: 'assessPaymentRisk',
              success: false,
              responseTime,
              tenantId,
              invoiceId: invoice.id,
              error: error instanceof Error ? error.message : String(error),
            });
            throw error;
          }

          // Handle based on risk level
          if (riskAssessment.riskLevel === 'HIGH' || riskAssessment.riskLevel === 'CRITICAL') {
            // Don't auto-process high-risk payments
            // Send reminder instead
            await this.sendPaymentReminder(invoice, riskAssessment);
            reminderCount++;

            // Offer payment plan if suggested
            if (riskAssessment.suggestPaymentPlan && riskAssessment.paymentPlanSuggestion) {
              await this.offerPaymentPlan(invoice, riskAssessment.paymentPlanSuggestion);
              planOfferedCount++;
            }
          } else {
            // Process payment normally for LOW/MEDIUM risk
            // In a real implementation, this would trigger actual payment processing
            // For now, we'll just log it
            this.logger.log(
              `Processing payment for invoice ${invoice.id} ` +
              `(risk: ${riskAssessment.riskLevel})`,
            );
            processedCount++;
          }
        } catch (error) {
          this.logger.error(
            `Error processing invoice ${invoice.id}:`,
            error instanceof Error ? error.message : String(error),
          );
        }
      }

      this.logger.log(
        `Payment processing complete: ${processedCount} processed, ` +
        `${reminderCount} reminders sent, ${planOfferedCount} payment plans offered`,
      );
    } catch (error) {
      this.logger.error('Failed to process due payments:', error);
    }
  }

  /**
   * Send payment reminder based on AI assessment
   */
  private async sendPaymentReminder(
    invoice: any,
    riskAssessment: {
      riskLevel: string;
      recommendedActions: string[];
      factors: string[];
    },
  ): Promise<void> {
    try {
      if (!invoice.lease?.tenantId) {
        return;
      }

      const message = `Payment Reminder: Your invoice of $${Number(invoice.amount).toFixed(2)} ` +
        `is due on ${invoice.dueDate.toLocaleDateString()}. ` +
        `Please make a payment to avoid late fees.`;

      await this.notificationsService.create({
        userId: invoice.lease.tenantId,
        type: NotificationType.PAYMENT_DUE,
        title: 'Payment Due Reminder',
        message,
        metadata: {
          invoiceId: invoice.id,
          riskLevel: riskAssessment.riskLevel,
          factors: riskAssessment.factors,
          recommendedActions: riskAssessment.recommendedActions,
        },
        sendEmail: true,
        useAITiming: true,
        personalize: true,
        urgency: riskAssessment.riskLevel === 'CRITICAL' ? 'HIGH' : 'MEDIUM',
      });

      this.logger.log(`Sent payment reminder for invoice ${invoice.id}`);
    } catch (error) {
      this.logger.error(`Failed to send payment reminder for invoice ${invoice.id}:`, error);
    }
  }

  /**
   * Offer payment plan to tenant
   */
  private async offerPaymentPlan(
    invoice: any,
    planSuggestion: {
      installments: number;
      amountPerInstallment: number;
      totalAmount: number;
    },
  ): Promise<void> {
    try {
      if (!invoice.lease?.tenantId) {
        return;
      }

      const message = `We understand you may be experiencing financial difficulty. ` +
        `We're offering a payment plan: ${planSuggestion.installments} installments ` +
        `of $${planSuggestion.amountPerInstallment.toFixed(2)} each. ` +
        `Please contact us to set up this payment plan.`;

      await this.notificationsService.create({
        userId: invoice.lease.tenantId,
        type: NotificationType.PAYMENT_DUE,
        title: 'Payment Plan Available',
        message,
        metadata: {
          invoiceId: invoice.id,
          paymentPlan: planSuggestion,
        },
        sendEmail: true,
        useAITiming: true,
        personalize: true,
        urgency: 'MEDIUM',
      });

      // Store payment plan suggestion
      await this.paymentsService.createPaymentPlan(invoice.id, planSuggestion);

      this.logger.log(
        `Offered payment plan for invoice ${invoice.id}: ` +
        `${planSuggestion.installments} installments of $${planSuggestion.amountPerInstallment.toFixed(2)}`,
      );
    } catch (error) {
      this.logger.error(`Failed to offer payment plan for invoice ${invoice.id}:`, error);
    }
  }

  /**
   * Apply late fees daily at 3 AM
   */
  @Cron('0 3 * * *', {
    name: 'applyLateFees',
    timeZone: 'America/New_York',
  })
  async applyLateFees() {
    this.logger.log('Checking for overdue invoices to apply late fees...');

    try {
      const gracePeriodDays = 5;
      const cutoffDate = subDays(new Date(), gracePeriodDays);
      cutoffDate.setHours(0, 0, 0, 0);

      // Find overdue invoices without late fees
      const overdueInvoices = await this.prisma.invoice.findMany({
        where: {
          dueDate: {
            lt: cutoffDate,
          },
          status: 'PENDING',
          lateFees: {
            none: {},
          },
        },
        include: {
          payments: {
            where: { status: { in: ['COMPLETED', 'PENDING'] } }
          },
        },
      });

      let processedCount = 0;

      for (const invoice of overdueInvoices) {
        try {
          // Check if invoice is still unpaid
          const completedPaid = invoice.payments
            .filter(p => p.status === 'COMPLETED')
            .reduce((sum, payment) => sum + payment.amountCents, 0);
          
          const hasPendingPayment = invoice.payments.some(p => p.status === 'PENDING');
          if (completedPaid < invoice.amountCents && !hasPendingPayment) {
            const lease = await this.prisma.lease.findUnique({
              where: { id: invoice.leaseId },
              include: {
                unit: { include: { property: true } },
              },
            });

            if (!lease?.tenantId || !lease.unit?.propertyId) {
              this.logger.warn(`Invoice ${invoice.id} missing lease/property context for late fee event`);
              continue;
            }

            const dueDate = new Date(invoice.dueDate);
            const daysLate = Math.max(0, Math.floor((Date.now() - dueDate.getTime()) / (1000 * 60 * 60 * 24)));
            const outstandingBalance = Number(invoice.amountCents) - completedPaid;
            const ledgerPeriod = dueDate.toISOString().slice(0, 7);

            if (this.workflowEventService) {
              const workflowEvent = await this.workflowEventService.emitIfNotExists({
                propertyId: lease.unit.propertyId,
                aggregateType: 'TenantLedger',
                aggregateId: lease.tenantId,
                eventType: 'late_fee.check',
                idempotencyKey: `late_fee:${invoice.id}:${ledgerPeriod}:DEFAULT_RULE_V1`,
                payload: {
                  propertyId: lease.unit.propertyId,
                  tenantId: lease.tenantId,
                  leaseId: lease.id,
                  ledgerPeriod,
                  rentChargeId: String(invoice.id),
                  outstandingBalance,
                  daysLate,
                  dueDate: dueDate.toISOString(),
                  evaluatedAt: new Date().toISOString(),
                  priorLateFeeApplied: false,
                },
              });

              if (this.workflowEventProcessor) {
                try {
                  await this.workflowEventProcessor.processEventById(workflowEvent.id);
                } catch (error) {
                  this.logger.warn(`Deferred late fee policy processing for event ${workflowEvent.id}: ${String(error)}`);
                }
              }

              this.logger.log(`Processed late fee policy event ${workflowEvent.id} for invoice ${invoice.id}`);
              processedCount++;
            }
          }
        } catch (error) {
          this.logger.error(`Failed to apply late fee for invoice ${invoice.id}:`, error);
        }
      }

      this.logger.log(`Processed ${processedCount} late fee policy events`);
    } catch (error) {
      this.logger.error('Failed to apply late fees:', error);
    }
  }

  @Cron(CronExpression.EVERY_MINUTE, {
    name: 'processPolicyWorkflowEvents',
  })
  async processPolicyWorkflowEvents() {
    if (!this.workflowEventProcessor) {
      return;
    }

    try {
      await this.workflowEventProcessor.processPending(25);
    } catch (error) {
      this.logger.error('Failed to process policy workflow events', error as Error);
    }
  }

  /**
   * Check for lease expirations daily at 8 AM
   */
  @Cron('0 8 * * *', {
    name: 'checkLeaseExpirations',
    timeZone: 'America/New_York',
  })
  async checkLeaseExpirations() {
    this.logger.log('Checking for upcoming lease expirations...');

    try {
      const alertDays = [90, 60, 30, 14, 7];
      
      for (const days of alertDays) {
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + days);
        targetDate.setHours(0, 0, 0, 0);
        
        const nextDay = new Date(targetDate);
        nextDay.setDate(nextDay.getDate() + 1);

        // Find leases expiring on the target date
        const expiringLeases = await this.prisma.lease.findMany({
          where: {
            endDate: {
              gte: targetDate,
              lt: nextDay,
            },
            status: 'ACTIVE',
          },
          include: {
            tenant: true,
            unit: {
              include: { property: true }
            }
          },
        });

        if (expiringLeases.length > 0) {
          this.logger.log(`Found ${expiringLeases.length} leases expiring in ${days} days`);
          
          // Here you would send expiration alerts
          for (const lease of expiringLeases) {
            this.logger.log(`Lease ${lease.id} expires in ${days} days - tenant: ${lease.tenant?.email}`);
          }
        }
      }
    } catch (error) {
      this.logger.error('Failed to check lease expirations:', error);
    }
  }

  /**
   * Clean up old security events weekly
   */
  @Cron('0 1 * * 0', {
    name: 'weeklyCleanup',
    timeZone: 'America/New_York',
  })
  async weeklyCleanup() {
    this.logger.log('Starting weekly cleanup...');

    try {
      // Clean up old security events (keep last 90 days)
      const ninetyDaysAgo = subDays(new Date(), 90);
      
      const deletedEvents = await this.prisma.securityEvent.deleteMany({
        where: {
          createdAt: {
            lt: ninetyDaysAgo,
          },
        },
      });

      this.logger.log(`Deleted ${deletedEvents.count} old security events`);

    } catch (error) {
      this.logger.error('Weekly cleanup failed:', error);
    }
  }

  /**
   * Generate monthly reports on the 1st of each month at 6 AM
   */
  @Cron('0 6 1 * *', {
    name: 'generateMonthlyReports',
    timeZone: 'America/New_York',
  })
  async generateMonthlyReports() {
    this.logger.log('Generating monthly reports...');

    try {
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      const startOfMonth = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1);
      const endOfMonth = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0);

      // Generate rental income report
      const rentalIncome = await this.prisma.payment.aggregate({
        where: {
          status: 'COMPLETED',
          paymentDate: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
        },
        _sum: {
          amountCents: true,
        },
        _count: {
          id: true,
        },
      });

      // Generate maintenance costs report
      const maintenanceCosts = await this.prisma.expense.aggregate({
        where: {
          category: 'MAINTENANCE',
          date: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
        },
        _sum: {
          amountCents: true,
        },
        _count: {
          id: true,
        },
      });

      this.logger.log(`Monthly report for ${lastMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}:`);
      this.logger.log(`  • Rental Income: $${rentalIncome._sum.amountCents || 0} (${rentalIncome._count} payments)`);
      this.logger.log(`  • Maintenance Costs: $${maintenanceCosts._sum.amountCents || 0} (${maintenanceCosts._count} expenses)`);
      
    } catch (error) {
      this.logger.error('Failed to generate monthly reports:', error);
    }
  }

  /**
   * Send reminders for pending e-signature envelopes daily at 10 AM
   */
  @Cron('0 10 * * *', {
    name: 'sendEsignatureReminders',
    timeZone: 'America/New_York',
  })
  async sendEsignatureReminders() {
    this.logger.log('Checking for pending e-signature envelopes to send reminders...');

    try {
      const result = await this.esignatureService.sendRemindersForPendingEnvelopes();
      this.logger.log(
        `E-signature reminders sent: ${result.sent} notifications sent, ${result.skipped} envelopes skipped`,
      );
    } catch (error) {
      this.logger.error('Failed to send e-signature reminders:', error);
    }
  }

  /**
   * Health check job - runs every 5 minutes to ensure cron jobs are working
   */
  @Cron('*/5 * * * *', {
    name: 'healthCheck',
  })
  async healthCheck() {
    // Just log that the job system is working
    // Only log this once per hour to avoid spam
    const now = new Date();
    if (now.getMinutes() === 0) {
      this.logger.log('Scheduled jobs system is healthy');
    }
  }
}
