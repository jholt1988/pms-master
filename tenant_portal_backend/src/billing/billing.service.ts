import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PaymentsService } from '../payments/payments.service';
import { PrismaService } from '../prisma/prisma.service';
import { BillingFrequency, Role, SecurityEventType } from '@prisma/client';
import { addDays, addMonths, isBefore, nextDay, set } from 'date-fns';
import { UpsertScheduleDto } from './dto/upsert-schedule.dto';
import { ConfigureAutopayDto } from './dto/configure-autopay.dto';
import { SecurityEventsService } from '../security-events/security-events.service';

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentsService: PaymentsService,
    private readonly securityEvents: SecurityEventsService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async runDailyBillingCycle(): Promise<void> {
    await this.generateRecurringInvoices();
    await this.applyLateFees();
    await this.processAutopayCharges();
  }

  async generateRecurringInvoices(): Promise<void> {
    const now = new Date();
    const schedules = await this.prisma.recurringInvoiceSchedule.findMany({
      where: { active: true, nextRun: { lte: now } },
      include: { lease: true },
    });

    for (const schedule of schedules) {
      try {
        const invoice = await this.prisma.invoice.create({
          data: {
            description: schedule.description,
            amount: schedule.amount,
            dueDate: schedule.nextRun,
            lease: { connect: { id: schedule.leaseId } },
            schedule: { connect: { id: schedule.id } },
          },
        });

        const nextRun = this.calculateNextRun(schedule.frequency, schedule);
        await this.prisma.recurringInvoiceSchedule.update({
          where: { id: schedule.id },
          data: { nextRun },
        });

        this.logger.log(`Generated invoice ${invoice.id} for lease ${schedule.leaseId}`);
      } catch (error) {
        this.logger.error(`Failed to generate invoice for schedule ${schedule.id}`, error as Error);
      }
    }
  }

  async applyLateFees(): Promise<void> {
    const now = new Date();
    const overdueInvoices = await this.prisma.invoice.findMany({
      where: {
        status: 'UNPAID',
        schedule: {
          lateFeeAmount: { not: null },
          lateFeeAfterDays: { not: null },
        },
      },
      include: { schedule: true, lateFees: true },
    });

    for (const invoice of overdueInvoices) {
      if (!invoice.schedule?.lateFeeAmount || !invoice.schedule.lateFeeAfterDays) {
        continue;
      }

      const assessDate = addDays(invoice.dueDate, invoice.schedule.lateFeeAfterDays);
      const hasLateFee = invoice.lateFees.some((fee) => !fee.waived);

      if (assessDate <= now && !hasLateFee) {
        await this.prisma.lateFee.create({
          data: {
            invoice: { connect: { id: invoice.id } },
            amount: invoice.schedule.lateFeeAmount,
          },
        });

        await this.prisma.invoice.update({
          where: { id: invoice.id },
          data: { amount: invoice.amount + invoice.schedule.lateFeeAmount },
        });

        this.logger.log(`Applied late fee to invoice ${invoice.id}`);
      }
    }
  }

  async processAutopayCharges(): Promise<void> {
    const today = new Date();
    const autopayEnrollments = await this.prisma.autopayEnrollment.findMany({
      where: { active: true },
      include: {
        lease: {
          include: {
            invoices: {
              where: { status: 'UNPAID', dueDate: { lte: today } },
            },
            tenant: true,
          },
        },
        paymentMethod: true,
      },
    });

    for (const enrollment of autopayEnrollments) {
      for (const invoice of enrollment.lease.invoices) {
        if (enrollment.maxAmount && invoice.amount > enrollment.maxAmount) {
          this.logger.warn(
            `Skipping autopay for invoice ${invoice.id}: amount ${invoice.amount} exceeds cap ${enrollment.maxAmount}`,
          );
          continue;
        }

        try {
          await this.paymentsService.recordPaymentForInvoice({
            invoiceId: invoice.id,
            amount: invoice.amount,
            leaseId: enrollment.leaseId,
            userId: enrollment.lease.tenantId,
            paymentMethodId: enrollment.paymentMethodId,
            initiatedBy: 'AUTOPAY',
          });

          this.logger.log(`Autopay succeeded for invoice ${invoice.id}`);
        } catch (error) {
          this.logger.error(`Autopay failed for invoice ${invoice.id}`, error as Error);
        }
      }
    }
  }

  private calculateNextRun(
    frequency: BillingFrequency,
    schedule: { nextRun: Date; dayOfMonth?: number | null; dayOfWeek?: number | null },
  ): Date {
    if (frequency === 'WEEKLY' && schedule.dayOfWeek != null) {
      return nextDay(schedule.nextRun, schedule.dayOfWeek as 0 | 1 | 2 | 3 | 4 | 5 | 6);
    }

    if (frequency === 'MONTHLY') {
      const day = schedule.dayOfMonth ?? schedule.nextRun.getDate();
      const tentative = addMonths(schedule.nextRun, 1);
      const result = new Date(tentative.getFullYear(), tentative.getMonth(), day, tentative.getHours(), tentative.getMinutes());
      return result;
    }

    return addMonths(schedule.nextRun, 1);
  }

  async manualRun(): Promise<{ generated: number }> {
    await this.runDailyBillingCycle();
    return { generated: 1 };
  }

  async listSchedules() {
    return this.prisma.recurringInvoiceSchedule.findMany({
      include: {
        lease: {
          include: {
            tenant: true,
            unit: { include: { property: true } },
          },
        },
      },
      orderBy: { leaseId: 'asc' },
    });
  }

  async upsertSchedule(
    actor: { userId: number; username: string; role: Role },
    dto: UpsertScheduleDto,
  ) {
    const lease = await this.prisma.lease.findUnique({
      where: { id: dto.leaseId },
      include: { tenant: true, unit: true },
    });

    if (!lease) {
      throw new NotFoundException('Lease not found');
    }

    if (dto.frequency === BillingFrequency.MONTHLY && !dto.dayOfMonth) {
      dto.dayOfMonth = lease.startDate.getDate();
    }

    if (dto.frequency === BillingFrequency.WEEKLY && dto.dayOfWeek == null) {
      dto.dayOfWeek = new Date().getDay();
    }

    const nextRun = dto.nextRun
      ? new Date(dto.nextRun)
      : this.computeInitialRun(dto, lease.startDate);

    const schedule = await this.prisma.recurringInvoiceSchedule.upsert({
      where: { leaseId: dto.leaseId },
      create: {
        leaseId: dto.leaseId,
        amount: dto.amount,
        description: dto.description ?? 'Recurring Charge',
        frequency: dto.frequency,
        dayOfMonth: dto.dayOfMonth,
        dayOfWeek: dto.dayOfWeek,
        nextRun,
        lateFeeAmount: dto.lateFeeAmount,
        lateFeeAfterDays: dto.lateFeeAfterDays,
        active: dto.active ?? true,
      },
      update: {
        amount: dto.amount,
        description: dto.description ?? 'Recurring Charge',
        frequency: dto.frequency,
        dayOfMonth: dto.dayOfMonth,
        dayOfWeek: dto.dayOfWeek,
        nextRun,
        lateFeeAmount: dto.lateFeeAmount,
        lateFeeAfterDays: dto.lateFeeAfterDays,
        active: dto.active ?? true,
      },
      include: {
        lease: {
          include: {
            tenant: true,
            unit: { include: { property: true } },
          },
        },
      },
    });

    await this.securityEvents.logEvent({
      type: SecurityEventType.RECURRING_BILLING_UPDATED,
      success: true,
      userId: actor.userId,
      username: actor.username,
      metadata: {
        leaseId: dto.leaseId,
        frequency: dto.frequency,
        amount: dto.amount,
        lateFeeAmount: dto.lateFeeAmount,
        lateFeeAfterDays: dto.lateFeeAfterDays,
      },
    });

    return schedule;
  }

  async deactivateSchedule(actor: { userId: number; username: string; role: Role }, leaseId: number) {
    await this.prisma.recurringInvoiceSchedule.updateMany({
      where: { leaseId },
      data: { active: false },
    });

    await this.securityEvents.logEvent({
      type: SecurityEventType.RECURRING_BILLING_UPDATED,
      success: true,
      userId: actor.userId,
      username: actor.username,
      metadata: { leaseId, action: 'DEACTIVATE_SCHEDULE' },
    });

    return { leaseId, active: false };
  }

  async getAutopayForTenant(userId: number) {
    const lease = await this.prisma.lease.findUnique({
      where: { tenantId: userId },
      include: {
        autopayEnrollment: {
          include: { paymentMethod: true },
        },
      },
    });

    if (!lease) {
      throw new NotFoundException('Lease not found for tenant');
    }

    return {
      leaseId: lease.id,
      enrollment: lease.autopayEnrollment,
    };
  }

  async getAutopayForLease(leaseId: number) {
    const lease = await this.prisma.lease.findUnique({
      where: { id: leaseId },
      include: {
        autopayEnrollment: {
          include: { paymentMethod: true },
        },
        tenant: true,
        unit: { include: { property: true } },
      },
    });

    if (!lease) {
      throw new NotFoundException('Lease not found');
    }

    return lease;
  }

  async configureAutopay(
    actor: { userId: number; username: string; role: Role },
    dto: ConfigureAutopayDto,
  ) {
    const lease = await this.prisma.lease.findUnique({
      where: { id: dto.leaseId },
      include: { tenant: true },
    });

    if (!lease) {
      throw new NotFoundException('Lease not found');
    }

    if (actor.role === Role.TENANT && lease.tenantId !== actor.userId) {
      throw new BadRequestException('You can only configure autopay for your lease');
    }

    const paymentMethod = await this.prisma.paymentMethod.findUnique({
      where: { id: dto.paymentMethodId },
    });

    if (!paymentMethod || paymentMethod.userId !== lease.tenantId) {
      throw new BadRequestException('Payment method must belong to the lease tenant');
    }

    const enrollment = await this.prisma.autopayEnrollment.upsert({
      where: { leaseId: dto.leaseId },
      create: {
        leaseId: dto.leaseId,
        paymentMethodId: dto.paymentMethodId,
        active: dto.active ?? true,
        maxAmount: dto.maxAmount,
      },
      update: {
        paymentMethodId: dto.paymentMethodId,
        active: dto.active ?? true,
        maxAmount: dto.maxAmount,
      },
      include: {
        paymentMethod: true,
        lease: {
          include: {
            tenant: true,
            unit: { include: { property: true } },
          },
        },
      },
    });

    await this.securityEvents.logEvent({
      type: SecurityEventType.AUTOPAY_ENABLED,
      success: true,
      userId: actor.userId,
      username: actor.username,
      metadata: {
        leaseId: dto.leaseId,
        paymentMethodId: dto.paymentMethodId,
        maxAmount: dto.maxAmount,
      },
    });

    return enrollment;
  }

  async disableAutopay(
    actor: { userId: number; username: string; role: Role },
    leaseId: number,
  ) {
    const lease = await this.prisma.lease.findUnique({
      where: { id: leaseId },
    });

    if (!lease) {
      throw new NotFoundException('Lease not found');
    }

    if (actor.role === Role.TENANT && lease.tenantId !== actor.userId) {
      throw new BadRequestException('You can only modify autopay for your lease');
    }

    const result = await this.prisma.autopayEnrollment.updateMany({
      where: { leaseId },
      data: { active: false },
    });

    if (result.count > 0) {
      await this.securityEvents.logEvent({
        type: SecurityEventType.AUTOPAY_DISABLED,
        success: true,
        userId: actor.userId,
        username: actor.username,
        metadata: { leaseId },
      });
    }

    return { leaseId, active: false };
  }

  private computeInitialRun(dto: UpsertScheduleDto, leaseStart: Date): Date {
    const now = new Date();

    if (dto.frequency === BillingFrequency.MONTHLY) {
      const day = dto.dayOfMonth ?? leaseStart.getDate();
      let candidate = set(now, { date: day, hours: 9, minutes: 0, seconds: 0, milliseconds: 0 });
      if (isBefore(candidate, now)) {
        candidate = addMonths(candidate, 1);
      }
      return candidate;
    }

    if (dto.frequency === BillingFrequency.WEEKLY) {
      const targetDay = dto.dayOfWeek ?? now.getDay();
      const candidate = nextDay(now, targetDay as 0 | 1 | 2 | 3 | 4 | 5 | 6);
      return set(candidate, { hours: 9, minutes: 0, seconds: 0, milliseconds: 0 });
    }

    return addMonths(now, 1);
  }
}

