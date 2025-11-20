import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from './notifications.service';
import { NotificationType } from '@prisma/client';
import { differenceInDays, addDays } from 'date-fns';

@Injectable()
export class NotificationTasks {
  private readonly logger = new Logger(NotificationTasks.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  // Run daily at 9 AM to check for upcoming rent payments
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async checkRentReminders() {
    this.logger.log('Checking for rent payment reminders...');

    const activeLeases = await this.prisma.lease.findMany({
      where: {
        status: 'ACTIVE',
      },
      include: {
        tenant: true,
        recurringSchedule: true,
      },
    });

    const today = new Date();
    for (const lease of activeLeases) {
      if (!lease.recurringSchedule) continue;

      const nextDueDate = new Date(lease.recurringSchedule.nextRun);
      const daysUntilDue = differenceInDays(nextDueDate, today);

      // Send reminder 3 days before rent is due
      if (daysUntilDue === 3) {
        await this.notificationsService.create({
          userId: lease.tenantId,
          type: NotificationType.RENT_REMINDER,
          title: 'Rent Payment Reminder',
          message: `Your rent payment of $${lease.recurringSchedule.amount.toFixed(2)} is due in 3 days (${nextDueDate.toLocaleDateString()}).`,
          sendEmail: true,
        });
      }
    }

    this.logger.log('Rent reminder check completed');
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
      });
    }

    this.logger.log('Maintenance SLA breach check completed');
  }
}

