import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from './notifications.service';
import { PaymentsService } from '../payments/payments.service';
import { AIPaymentService } from '../payments/ai-payment.service';
import { SmsService } from './sms.service';
import { NotificationType } from '@prisma/client';
import { differenceInDays, addDays } from 'date-fns';

@Injectable()
export class NotificationTasks {
  private readonly logger = new Logger(NotificationTasks.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly paymentsService: PaymentsService,
    private readonly aiPaymentService: AIPaymentService,
    private readonly smsService: SmsService,
  ) {}

  /**
   * Check for upcoming rent payments and send smart reminders
   * Uses AI to determine optimal timing and channel
   * Runs every 6 hours to catch optimal send times
   */
  @Cron(CronExpression.EVERY_6_HOURS)
  async checkRentReminders() {
    this.logger.log('Checking for rent payment reminders...');

    try {
      // Get invoices due in the next 7 days
      const upcomingInvoices = await this.paymentsService.getInvoicesDueInDays(7);
      this.logger.log(`Found ${upcomingInvoices.length} invoices due in next 7 days`);

      let remindersSent = 0;

      for (const invoice of upcomingInvoices) {
        try {
          if (!invoice.leaseId) {
            continue;
          }

          // Get optimal reminder timing using AI
          const startTime = Date.now();
          const timing = await this.aiPaymentService.determineReminderTiming(
            invoice.leaseId,
            invoice.id,
          );
          const responseTime = Date.now() - startTime;

          // Check if it's time to send the reminder
          const now = new Date();
          const timeUntilOptimal = timing.optimalTime.getTime() - now.getTime();
          const hoursUntilOptimal = timeUntilOptimal / (1000 * 60 * 60);

          // Send if optimal time is within the next hour (or already passed)
          if (hoursUntilOptimal <= 1 && hoursUntilOptimal >= -1) {
            await this.sendSmartReminder(invoice, timing);
            remindersSent++;

            this.logger.log(
              `Sent ${timing.channel} reminder for invoice ${invoice.id} ` +
              `(urgency: ${timing.urgency}, ${responseTime}ms)`,
            );
          } else {
            this.logger.debug(
              `Optimal time for invoice ${invoice.id} is in ${hoursUntilOptimal.toFixed(1)} hours, ` +
              `skipping for now`,
            );
          }
        } catch (error) {
          this.logger.error(
            `Error processing reminder for invoice ${invoice.id}:`,
            error instanceof Error ? error.message : String(error),
          );
        }
      }

      this.logger.log(`Rent reminder check completed: ${remindersSent} reminders sent`);
    } catch (error) {
      this.logger.error('Failed to check rent reminders:', error);
    }
  }

  /**
   * Send smart payment reminder using AI-determined channel and message
   */
  private async sendSmartReminder(
    invoice: any,
    timing: {
      optimalTime: Date;
      channel: 'EMAIL' | 'SMS' | 'PUSH';
      urgency: 'LOW' | 'MEDIUM' | 'HIGH';
      personalizedMessage?: string;
    },
  ): Promise<void> {
    try {
      if (!invoice.lease?.tenantId) {
        return;
      }

      const message = timing.personalizedMessage ||
        `Reminder: Your payment of $${Number(invoice.amount).toFixed(2)} ` +
        `is due on ${invoice.dueDate.toLocaleDateString()}.`;

      // Send notification
      await this.notificationsService.create({
        userId: invoice.lease.tenantId,
        type: NotificationType.PAYMENT_DUE,
        title: timing.urgency === 'HIGH' ? 'Urgent: Payment Due Soon' : 'Payment Reminder',
        message,
        metadata: {
          invoiceId: invoice.id,
          channel: timing.channel,
          urgency: timing.urgency,
        },
        sendEmail: timing.channel === 'EMAIL',
      });

      // Send SMS if channel is SMS
      if (timing.channel === 'SMS') {
        try {
          const tenant = await this.prisma.user.findUnique({
            where: { id: invoice.lease.tenantId },
          });

          if (tenant) {
            // In a real implementation, you'd send SMS here
            // await this.smsService.send(tenant.phone, message);
            this.logger.log(`SMS reminder would be sent to ${tenant.username} for invoice ${invoice.id}`);
          }
        } catch (error) {
          this.logger.warn(`Failed to send SMS reminder for invoice ${invoice.id}:`, error);
        }
      }

      // Push notification would be handled by the notification service
      // if timing.channel === 'PUSH'
    } catch (error) {
      this.logger.error(`Failed to send smart reminder for invoice ${invoice.id}:`, error);
    }
  }

  // Run daily to check for overdue rent
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async checkOverdueRent() {
    this.logger.log('Checking for overdue rent payments...');

    const overdueInvoices = await this.prisma.invoice.findMany({
      where: {
        status: 'UNPAID',
        dueDate: {
          lt: new Date(),
        },
      },
      include: {
        lease: {
          include: {
            tenant: true,
          },
        },
      },
    });

    for (const invoice of overdueInvoices) {
      await this.notificationsService.create({
        userId: invoice.lease.tenantId,
        type: NotificationType.RENT_OVERDUE,
        title: 'Overdue Rent Payment',
        message: `Your rent payment of $${invoice.amount.toFixed(2)} is overdue. Please make a payment as soon as possible.`,
        sendEmail: true,
        useAITiming: true,
        personalize: true,
        urgency: 'HIGH',
      });
    }

    this.logger.log('Overdue rent check completed');
  }

  // Run daily to check for lease renewals
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async checkLeaseRenewals() {
    this.logger.log('Checking for upcoming lease renewals...');

    const activeLeases = await this.prisma.lease.findMany({
      where: {
        status: 'ACTIVE',
      },
      include: {
        tenant: true,
      },
    });

    const today = new Date();
    for (const lease of activeLeases) {
      const daysUntilEnd = differenceInDays(lease.endDate, today);

      // Send reminder 30 days before lease ends
      if (daysUntilEnd === 30) {
        await this.notificationsService.create({
          userId: lease.tenantId,
          type: NotificationType.LEASE_RENEWAL,
          title: 'Lease Renewal Reminder',
          message: `Your lease is ending in 30 days (${lease.endDate.toLocaleDateString()}). Please contact your property manager about renewal options.`,
          sendEmail: true,
          useAITiming: true,
          personalize: true,
          urgency: 'MEDIUM',
        });
      }
    }

    this.logger.log('Lease renewal check completed');
  }

  // Run hourly to check for maintenance SLA breaches
  @Cron(CronExpression.EVERY_HOUR)
  async checkMaintenanceSLABreaches() {
    this.logger.log('Checking for maintenance SLA breaches...');

    const pendingRequests = await this.prisma.maintenanceRequest.findMany({
      where: {
        status: 'PENDING',
        responseDueAt: {
          lte: new Date(),
        },
      },
      include: {
        author: true,
        property: true,
        unit: true,
      },
    });

    for (const request of pendingRequests) {
      await this.notificationsService.create({
        userId: request.authorId,
        type: NotificationType.MAINTENANCE_SLA_BREACH,
        title: 'Maintenance Request SLA Breach',
        message: `Your maintenance request "${request.title}" has exceeded the response time SLA. We apologize for the delay.`,
        sendEmail: true,
        useAITiming: true,
        personalize: true,
        urgency: 'HIGH',
      });
    }

    const inProgressRequests = await this.prisma.maintenanceRequest.findMany({
      where: {
        status: 'IN_PROGRESS',
        dueAt: {
          lte: new Date(),
        },
      },
      include: {
        author: true,
      },
    });

    for (const request of inProgressRequests) {
      await this.notificationsService.create({
        userId: request.authorId,
        type: NotificationType.MAINTENANCE_SLA_BREACH,
        title: 'Maintenance Request Resolution SLA Breach',
        message: `Your maintenance request "${request.title}" has exceeded the resolution time SLA.`,
        sendEmail: true,
        useAITiming: true,
        personalize: true,
        urgency: 'HIGH',
      });
    }

    this.logger.log('Maintenance SLA breach check completed');
  }

  /**
   * Process scheduled notifications that are ready to be sent
   * Runs every 5 minutes to check for notifications that should be sent
   */
  @Cron('*/5 * * * *', {
    name: 'processScheduledNotifications',
  })
  async processScheduledNotifications() {
    try {
      const processedCount = await this.notificationsService.processScheduledNotifications();
      if (processedCount > 0) {
        this.logger.log(`Processed ${processedCount} scheduled notifications`);
      }
    } catch (error) {
      this.logger.error('Failed to process scheduled notifications:', error);
    }
  }
}

