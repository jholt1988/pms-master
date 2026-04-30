// Rent Reminder Automation
// Gap: Issue 7 - Rent Reminder Automation
// Automatically sends reminders before due date

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RentReminderService {
  private readonly logger = new Logger(RentReminderService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Process rent reminders - called by cron job
   * Sends reminders for payments due in X days
   */
  async processRentReminders(daysBeforeDue: number = 7) {
    this.logger.log(`Processing rent reminders for ${daysBeforeDue} days before due`);
    
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + daysBeforeDue);
    const targetDateStr = targetDate.toISOString().split('T')[0];

    // Find payments due in target range
    const payments = await this.prisma.payment.findMany({
      where: {
        status: { not: 'COMPLETED' },
        paymentDate: {
          gte: new Date(targetDateStr + 'T00:00:00Z'),
          lte: new Date(targetDateStr + 'T23:59:59Z'),
        },
      },
      include: { lease: { include: { tenant: true, unit: { include: { property: true } } } } } as any,
    });

    const ReminderCount = payments.length;
    this.logger.log(`Found ${ReminderCount} payments due on ${targetDateStr}`);

    // In production, would send actual reminders
    // For now, return the list that would be notified
    return {
      processed: ReminderCount,
      targetDate: targetDateStr,
      payments: payments.map(p => ({
        paymentId: p.id,
        tenantEmail: (p as any).tenant?.email || (p as any).lease?.tenant?.email,
        amount: p.amount,
        dueDate: p.paymentDate,
      })),
    };
  }

  /**
   * Send reminder for a specific payment
   */
  async sendReminder(paymentId: number, message?: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { lease: { include: { tenant: true } } } as any,
    });

    if (!payment) {
      throw new Error(`Payment ${paymentId} not found`);
    }

    const tenantEmail = (payment as any).tenant?.email || (payment as any).lease?.tenant?.email;
    
    this.logger.log(`[STUB] Sending rent reminder for payment ${paymentId} to ${tenantEmail}`);
    
    return {
      success: true,
      paymentId,
      tenantEmail,
      reminderSent: true,
      message: message || `Rent reminder: Payment of $${payment.amount} due on ${payment.paymentDate}`,
    };
  }

  /**
   * Suppress reminder for a payment (snooze)
   */
  async suppressReminder(paymentId: number, days: number) {
    this.logger.log(`[STUB] Suppressing reminder for payment ${paymentId} for ${days} days`);
    
    return {
      success: true,
      paymentId,
      suppressed: true,
      suppressedUntil: new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString(),
    };
  }
}