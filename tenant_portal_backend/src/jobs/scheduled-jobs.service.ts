import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentsService } from '../payments/payments.service';
import { AIPaymentService } from '../payments/ai-payment.service';
import { AIPaymentMetricsService } from '../payments/ai-payment-metrics.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '@prisma/client';
import { subDays } from 'date-fns';

@Injectable()
export class ScheduledJobsService {
  private readonly logger = new Logger(ScheduledJobsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentsService: PaymentsService,
    private readonly aiPaymentService: AIPaymentService,
    private readonly aiMetrics: AIPaymentMetricsService,
    private readonly notificationsService: NotificationsService,
  ) {}

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
      const dueInvoices = await this.paymentsService.getInvoicesDueToday();
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

          // Assess payment risk using AI
          const startTime = Date.now();
          let riskAssessment;
          try {
            riskAssessment = await this.aiPaymentService.assessPaymentRisk(
              invoice.leaseId,
              invoice.id,
            );
            const responseTime = Date.now() - startTime;

            // Record metric
            this.aiMetrics.recordMetric({
              operation: 'assessPaymentRisk',
              success: true,
              responseTime,
              tenantId: invoice.leaseId,
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
              tenantId: invoice.leaseId,
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
            where: { status: 'COMPLETED' }
          },
        },
      });

      let appliedCount = 0;

      for (const invoice of overdueInvoices) {
        try {
          // Check if invoice is still unpaid
          const totalPaid = invoice.payments.reduce((sum, payment) => sum + payment.amount, 0);
          
          if (totalPaid < invoice.amount) {
            // Apply late fee
            const lateFeeAmount = Math.max(50, invoice.amount * 0.05);
            
            await this.prisma.lateFee.create({
              data: {
                amount: lateFeeAmount,
                invoice: { connect: { id: invoice.id } },
              },
            });

            this.logger.log(`Applied late fee of $${lateFeeAmount} to invoice ${invoice.id}`);
            appliedCount++;
          }
        } catch (error) {
          this.logger.error(`Failed to apply late fee for invoice ${invoice.id}:`, error);
        }
      }

      this.logger.log(`Applied ${appliedCount} late fees`);
    } catch (error) {
      this.logger.error('Failed to apply late fees:', error);
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
            this.logger.log(`Lease ${lease.id} expires in ${days} days - tenant: ${lease.tenant?.username}`);
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
          amount: true,
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
          amount: true,
        },
        _count: {
          id: true,
        },
      });

      this.logger.log(`Monthly report for ${lastMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}:`);
      this.logger.log(`  • Rental Income: $${rentalIncome._sum.amount || 0} (${rentalIncome._count} payments)`);
      this.logger.log(`  • Maintenance Costs: $${maintenanceCosts._sum.amount || 0} (${maintenanceCosts._count} expenses)`);
      
    } catch (error) {
      this.logger.error('Failed to generate monthly reports:', error);
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