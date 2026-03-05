import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PaymentsService } from '../payments/payments.service';
import { PrismaService } from '../prisma/prisma.service';
import { BillingFrequency, Role, SecurityEventType } from '@prisma/client';
import { addDays, addMonths, isBefore, nextDay, set } from 'date-fns';
import { isUUID } from 'class-validator';
import { UpsertScheduleDto } from './dto/upsert-schedule.dto';
import { ConfigureAutopayDto } from './dto/configure-autopay.dto';
import { SecurityEventsService } from '../security-events/security-events.service';
import { StripeService } from '../payments/stripe.service';

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentsService: PaymentsService,
    private readonly securityEvents: SecurityEventsService,
    private readonly stripeService: StripeService,
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
            unit: { include: { property: true } },
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
      const orgId = enrollment.lease.unit?.property?.organizationId;
      const lockKey = `autopay-worker:${orgId ?? 'no-org'}:${enrollment.id}`;
      let lockAcquired = false;

      try {
        const lockResult = await this.prisma.$queryRaw<Array<{ pg_try_advisory_lock: boolean }>>`
          SELECT pg_try_advisory_lock(hashtext(${lockKey})) as "pg_try_advisory_lock"
        `;
        lockAcquired = lockResult[0]?.pg_try_advisory_lock ?? false;
        if (!lockAcquired) continue;

        for (const invoice of enrollment.lease.invoices) {
          if (enrollment.maxAmount && invoice.amount > enrollment.maxAmount) {
            await this.prisma.paymentAttempt.create({
              data: {
                autopayEnrollmentId: enrollment.id,
                invoiceId: invoice.id,
                status: 'FAILED',
                failureReason: `Amount ${invoice.amount} exceeds cap ${enrollment.maxAmount}`,
                scheduledFor: new Date(),
                attemptedAt: new Date(),
                completedAt: new Date(),
              },
            });
            continue;
          }

          const attempt = await this.prisma.paymentAttempt.create({
            data: {
              autopayEnrollmentId: enrollment.id,
              invoiceId: invoice.id,
              status: 'SCHEDULED',
              scheduledFor: new Date(),
            },
          });

          await this.prisma.paymentAttempt.update({
            where: { id: attempt.id },
            data: {
              status: 'ATTEMPTING',
              attemptedAt: new Date(),
            },
          });

          try {
            const payment = await this.paymentsService.recordPaymentForInvoice({
              invoiceId: invoice.id,
              amount: invoice.amount,
              leaseId: enrollment.leaseId,
              userId: enrollment.lease.tenantId,
              paymentMethodId: enrollment.paymentMethodId,
              initiatedBy: 'AUTOPAY',
            });

            await this.prisma.paymentAttempt.update({
              where: { id: attempt.id },
              data: {
                status: 'SUCCEEDED',
                externalAttemptId: payment.externalId ?? undefined,
                completedAt: new Date(),
              },
            });

            this.logger.log(`Autopay succeeded for invoice ${invoice.id}`);
          } catch (error) {
            const reason = error instanceof Error ? error.message : String(error);
            const needsAuth = /authentication|required|3d secure|requires_action/i.test(reason);
            await this.prisma.paymentAttempt.update({
              where: { id: attempt.id },
              data: {
                status: needsAuth ? 'NEEDS_AUTH' : 'FAILED',
                failureReason: reason,
                completedAt: new Date(),
              },
            });

            this.logger.error(`Autopay failed for invoice ${invoice.id}`, error as Error);
          }
        }
      } finally {
        if (lockAcquired) {
          await this.prisma.$queryRaw`SELECT pg_advisory_unlock(hashtext(${lockKey}))`;
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

  async getConnectedAccount(orgId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: {
        id: true,
        name: true,
        stripeConnectedAccountId: true,
        stripeOnboardingStatus: true,
        stripeChargesEnabled: true,
        stripePayoutsEnabled: true,
        stripeDetailsSubmitted: true,
        stripeCapabilities: true,
        stripeOnboardingCompletedAt: true,
        stripeLastOnboardingCheckAt: true,
      },
    });

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    return org;
  }

  async upsertConnectedAccount(
    orgId: string,
    input: {
      stripeConnectedAccountId?: string;
      stripeOnboardingStatus?: 'NOT_STARTED' | 'PENDING' | 'IN_REVIEW' | 'COMPLETED' | 'RESTRICTED';
      stripeChargesEnabled?: boolean;
      stripePayoutsEnabled?: boolean;
      stripeDetailsSubmitted?: boolean;
      stripeCapabilities?: Record<string, unknown>;
      stripeOnboardingCompletedAt?: string;
    },
  ) {
    const updated = await this.prisma.organization.update({
      where: { id: orgId },
      data: {
        stripeConnectedAccountId: input.stripeConnectedAccountId,
        stripeOnboardingStatus: input.stripeOnboardingStatus,
        stripeChargesEnabled: input.stripeChargesEnabled,
        stripePayoutsEnabled: input.stripePayoutsEnabled,
        stripeDetailsSubmitted: input.stripeDetailsSubmitted,
        stripeCapabilities: input.stripeCapabilities as any,
        stripeOnboardingCompletedAt: input.stripeOnboardingCompletedAt
          ? new Date(input.stripeOnboardingCompletedAt)
          : undefined,
        stripeLastOnboardingCheckAt: new Date(),
      },
      select: {
        id: true,
        stripeConnectedAccountId: true,
        stripeOnboardingStatus: true,
        stripeChargesEnabled: true,
        stripePayoutsEnabled: true,
        stripeDetailsSubmitted: true,
        stripeCapabilities: true,
        stripeOnboardingCompletedAt: true,
        stripeLastOnboardingCheckAt: true,
      },
    });

    return updated;
  }

  async createOnboardingLink(orgId: string, input: { refreshUrl: string; returnUrl: string }) {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: { id: true, name: true, stripeConnectedAccountId: true },
    });
    if (!org) throw new NotFoundException('Organization not found');

    let accountId = org.stripeConnectedAccountId ?? undefined;
    if (!accountId) {
      const created = await this.stripeService.createConnectedAccount({
        organizationId: org.id,
      });
      accountId = created.accountId;
      await this.prisma.organization.update({
        where: { id: org.id },
        data: {
          stripeConnectedAccountId: accountId,
          stripeOnboardingStatus: 'PENDING',
          stripeLastOnboardingCheckAt: new Date(),
        },
      });
    }

    const link = await this.stripeService.createConnectedAccountOnboardingLink({
      accountId,
      refreshUrl: input.refreshUrl,
      returnUrl: input.returnUrl,
    });

    return {
      accountId,
      onboardingUrl: link.url,
      expiresAt: link.expiresAt,
    };
  }

  async refreshConnectedAccountStatus(orgId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: { id: true, stripeConnectedAccountId: true },
    });
    if (!org || !org.stripeConnectedAccountId) {
      throw new NotFoundException('Connected account not found for organization');
    }

    const status = await this.stripeService.getConnectedAccountStatus(org.stripeConnectedAccountId);
    return this.upsertConnectedAccount(orgId, {
      stripeConnectedAccountId: status.accountId,
      stripeOnboardingStatus: status.onboardingStatus,
      stripeChargesEnabled: status.chargesEnabled,
      stripePayoutsEnabled: status.payoutsEnabled,
      stripeDetailsSubmitted: status.detailsSubmitted,
      stripeCapabilities: status.capabilities,
      stripeOnboardingCompletedAt: status.onboardingStatus === 'COMPLETED' ? new Date().toISOString() : undefined,
    });
  }

  async createFeeScheduleVersion(orgId: string, actorUserId: string, input: { versionLabel: string; effectiveAt: string; feeConfig: Record<string, unknown> }) {
    return this.prisma.feeScheduleVersion.create({
      data: {
        organizationId: orgId,
        versionLabel: input.versionLabel,
        effectiveAt: new Date(input.effectiveAt),
        feeConfig: input.feeConfig as any,
        createdById: actorUserId,
      },
    });
  }

  async createPlanCycle(orgId: string, input: { name: string; startsAt: string; endsAt: string; status?: 'DRAFT' | 'ACTIVE' | 'CLOSED'; activeFeeScheduleId?: string }) {
    return this.prisma.orgPlanCycle.create({
      data: {
        organizationId: orgId,
        name: input.name,
        startsAt: new Date(input.startsAt),
        endsAt: new Date(input.endsAt),
        status: input.status ?? 'DRAFT',
        activeFeeScheduleId: input.activeFeeScheduleId,
      },
    });
  }

  async createPricingSnapshot(orgId: string, input: { planCycleId: string; feeScheduleVersionId: string; snapshotType?: string; inputPayload?: Record<string, unknown>; computedFees: Record<string, unknown> }) {
    return this.prisma.pricingSnapshot.create({
      data: {
        organizationId: orgId,
        planCycleId: input.planCycleId,
        feeScheduleVersionId: input.feeScheduleVersionId,
        snapshotType: input.snapshotType ?? 'BILLING_PREVIEW',
        inputPayload: (input.inputPayload as any) ?? undefined,
        computedFees: input.computedFees as any,
      },
    });
  }

  async listPricingSnapshots(orgId: string, planCycleId?: string) {
    return this.prisma.pricingSnapshot.findMany({
      where: {
        organizationId: orgId,
        ...(planCycleId ? { planCycleId } : {}),
      },
      include: {
        planCycle: true,
        feeScheduleVersion: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async listSchedules(orgId: string) {
    return this.prisma.recurringInvoiceSchedule.findMany({
      where: { lease: { unit: { property: { organizationId: orgId } } } },
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
    actor: { userId: string; username: string; role: Role },
    dto: UpsertScheduleDto,
    orgId: string,
  ) {
    const leaseId = this.parseLeaseId(dto.leaseId);
    const lease = await this.prisma.lease.findFirst({
      where: { id: leaseId, unit: { property: { organizationId: orgId } } },
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
      where: { leaseId },
      create: {
        leaseId,
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
        leaseId,
        frequency: dto.frequency,
        amount: dto.amount,
        lateFeeAmount: dto.lateFeeAmount,
        lateFeeAfterDays: dto.lateFeeAfterDays,
      },
    });

    return schedule;
  }

  async deactivateSchedule(actor: { userId: string; username: string; role: Role }, leaseId: string | number, orgId: string) {
    const leaseIdStr = typeof leaseId === 'number' ? leaseId.toString() : leaseId;

    const lease = await this.prisma.lease.findFirst({
      where: { id: leaseIdStr, unit: { property: { organizationId: orgId } } },
      select: { id: true },
    });

    if (!lease) {
      throw new NotFoundException('Lease not found');
    }

    await this.prisma.recurringInvoiceSchedule.updateMany({
      where: { leaseId: leaseIdStr },
      data: { active: false },
    });

    await this.securityEvents.logEvent({
      type: SecurityEventType.RECURRING_BILLING_UPDATED,
      success: true,
      userId: actor.userId,
      username: actor.username,
      metadata: { leaseId: leaseIdStr, action: 'DEACTIVATE_SCHEDULE' },
    });

    return { leaseId: leaseIdStr, active: false };
  }

  async getAutopayForTenant(userId: string) {
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

  async getAutopayForLease(leaseId: string | number, orgId?: string) {
    const leaseIdNum = this.parseLeaseId(leaseId);
    const lease = await this.prisma.lease.findFirst({
      where: {
        id: leaseIdNum,
        ...(orgId ? { unit: { property: { organizationId: orgId } } } : {}),
      },
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
    actor: { userId: string; username: string; role: Role },
    dto: ConfigureAutopayDto,
    orgId?: string,
  ) {
    const leaseId = this.parseLeaseId(dto.leaseId);
    const lease = await this.prisma.lease.findFirst({
      where: {
        id: leaseId,
        ...(actor.role === Role.PROPERTY_MANAGER && orgId
          ? { unit: { property: { organizationId: orgId } } }
          : {}),
      },
      include: { tenant: true, unit: { include: { property: true } } },
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
      where: { leaseId },
      create: {
        leaseId,
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
        leaseId,
        paymentMethodId: dto.paymentMethodId,
        maxAmount: dto.maxAmount,
      },
    });

    return enrollment;
  }

  async listNeedsAuthAttemptsForTenant(userId: string) {
    const lease = await this.prisma.lease.findUnique({
      where: { tenantId: userId },
      select: { id: true },
    });
    if (!lease) throw new NotFoundException('Lease not found for tenant');

    return this.prisma.paymentAttempt.findMany({
      where: {
        autopayEnrollment: { leaseId: lease.id },
        status: 'NEEDS_AUTH',
      },
      include: {
        invoice: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }

  async recoverNeedsAuthAttempt(
    actor: { userId: string; username: string; role: Role },
    attemptId: string,
    orgId?: string,
  ) {
    const attempt = await this.prisma.paymentAttempt.findUnique({
      where: { id: attemptId },
      include: {
        autopayEnrollment: {
          include: {
            lease: {
              include: { tenant: true, unit: { include: { property: true } } },
            },
          },
        },
        invoice: true,
      },
    });

    if (!attempt) throw new NotFoundException('Payment attempt not found');
    const lease = attempt.autopayEnrollment.lease;

    if (actor.role === Role.TENANT && lease.tenantId !== actor.userId) {
      throw new BadRequestException('You can only recover your own payment attempt');
    }
    if (actor.role === Role.PROPERTY_MANAGER && orgId && lease.unit?.property?.organizationId !== orgId) {
      throw new BadRequestException('Attempt does not belong to your organization');
    }

    if (attempt.status !== 'NEEDS_AUTH') {
      return attempt;
    }

    await this.prisma.paymentAttempt.update({
      where: { id: attempt.id },
      data: { status: 'ATTEMPTING', attemptedAt: new Date() },
    });

    try {
      const payment = await this.paymentsService.recordPaymentForInvoice({
        invoiceId: attempt.invoiceId,
        amount: attempt.invoice.amount,
        leaseId: lease.id,
        userId: lease.tenantId,
        paymentMethodId: attempt.autopayEnrollment.paymentMethodId,
        initiatedBy: 'TENANT_RECOVERY',
      });

      return this.prisma.paymentAttempt.update({
        where: { id: attempt.id },
        data: {
          status: 'SUCCEEDED',
          externalAttemptId: payment.externalId ?? undefined,
          completedAt: new Date(),
          failureReason: null,
        },
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      return this.prisma.paymentAttempt.update({
        where: { id: attempt.id },
        data: { status: 'FAILED', failureReason: reason, completedAt: new Date() },
      });
    }
  }

  async disableAutopay(
    actor: { userId: string; username: string; role: Role },
    leaseId: string | number,
    orgId?: string,
  ) {
    const leaseIdNum = this.parseLeaseId(leaseId);
    const lease = await this.prisma.lease.findFirst({
      where: {
        id: leaseIdNum,
        ...(actor.role === Role.PROPERTY_MANAGER && orgId
          ? { unit: { property: { organizationId: orgId } } }
          : {}),
      },
      include: { tenant: true },
    });

    if (!lease) {
      throw new NotFoundException('Lease not found');
    }

    if (actor.role === Role.TENANT && lease.tenantId !== actor.userId) {
      throw new BadRequestException('You can only modify autopay for your lease');
    }

    const result = await this.prisma.autopayEnrollment.updateMany({
      where: { leaseId: leaseIdNum },
      data: { active: false },
    });

    if (result.count > 0) {
      await this.securityEvents.logEvent({
        type: SecurityEventType.AUTOPAY_DISABLED,
        success: true,
        userId: actor.userId,
        username: actor.username,
        metadata: { leaseId: leaseIdNum },
      });
    }

    return { leaseId: leaseIdNum, active: false };
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

  private parseLeaseId(value: string | number): string {
    if (typeof value !== 'string') {
      throw new BadRequestException('Invalid lease identifier provided.');
    }
    if (!isUUID(value)) {
      throw new BadRequestException('Invalid lease identifier provided.');
    }
    return value;
  }
}
