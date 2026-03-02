import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PricingCycleSchedulerService {
  private readonly logger = new Logger(PricingCycleSchedulerService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron('15 0 1 * *', { name: 'pricing-cycle-monthly-transition' })
  async handleMonthlyCycleTransitions(): Promise<void> {
    await this.runForEachOrgWithLock('pricing-cycle-monthly-transition', async (orgId) => {
      const now = new Date();

      // Close any ACTIVE cycles that already ended.
      await this.prisma.orgPlanCycle.updateMany({
        where: {
          organizationId: orgId,
          status: 'ACTIVE',
          endsAt: { lt: now },
        },
        data: { status: 'CLOSED' },
      });

      // If there's already an ACTIVE cycle, leave it.
      const existingActive = await this.prisma.orgPlanCycle.findFirst({
        where: { organizationId: orgId, status: 'ACTIVE' },
        select: { id: true },
      });
      if (existingActive) return;

      const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0));
      const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59));

      const feeSchedule = await this.prisma.feeScheduleVersion.findFirst({
        where: {
          organizationId: orgId,
          effectiveAt: { lte: now },
        },
        orderBy: [{ effectiveAt: 'desc' }, { createdAt: 'desc' }],
        select: { id: true },
      });

      await this.prisma.orgPlanCycle.create({
        data: {
          organizationId: orgId,
          name: `${monthStart.getUTCFullYear()}-${String(monthStart.getUTCMonth() + 1).padStart(2, '0')} Billing Cycle`,
          startsAt: monthStart,
          endsAt: monthEnd,
          status: 'ACTIVE',
          activeFeeScheduleId: feeSchedule?.id,
        },
      });

      this.logger.log(`Opened monthly plan cycle for org ${orgId}`);
    });
  }

  @Cron('20 2 * * *', { name: 'pricing-cycle-nightly-projection' })
  async handleNightlyTierProjection(): Promise<void> {
    await this.runForEachOrgWithLock('pricing-cycle-nightly-projection', async (orgId) => {
      const activeCycle = await this.prisma.orgPlanCycle.findFirst({
        where: { organizationId: orgId, status: 'ACTIVE' },
        include: {
          activeFeeSchedule: true,
        },
        orderBy: { startsAt: 'desc' },
      });

      if (!activeCycle || !activeCycle.activeFeeScheduleId) {
        return;
      }

      const existingToday = await this.prisma.pricingSnapshot.findFirst({
        where: {
          organizationId: orgId,
          planCycleId: activeCycle.id,
          snapshotType: 'NIGHTLY_TIER_PROJECTION',
          createdAt: {
            gte: new Date(new Date().setUTCHours(0, 0, 0, 0)),
          },
        },
        select: { id: true },
      });

      if (existingToday) return;

      const feeConfig = (activeCycle.activeFeeSchedule?.feeConfig ?? {}) as Record<string, unknown>;
      const basePct = Number(feeConfig['baseManagementFeePct'] ?? 0);
      const expressPct = Number(feeConfig['expressFeePct'] ?? 0);

      await this.prisma.pricingSnapshot.create({
        data: {
          organizationId: orgId,
          planCycleId: activeCycle.id,
          feeScheduleVersionId: activeCycle.activeFeeScheduleId,
          snapshotType: 'NIGHTLY_TIER_PROJECTION',
          inputPayload: {
            generatedBy: 'scheduler',
            generatedAt: new Date().toISOString(),
          } as any,
          computedFees: {
            projectedBaseManagementFeePct: basePct,
            projectedExpressFeePct: expressPct,
            projectionConfidence: 'BASELINE',
          } as any,
        },
      });

      this.logger.log(`Created nightly pricing projection for org ${orgId}`);
    });
  }

  private async runForEachOrgWithLock(jobName: string, runner: (orgId: string) => Promise<void>) {
    const orgs = await this.prisma.organization.findMany({ select: { id: true } });

    for (const org of orgs) {
      const lockKey = `${jobName}:${org.id}`;
      let lockAcquired = false;
      try {
        const lockResult = await this.prisma.$queryRaw<Array<{ pg_try_advisory_lock: boolean }>>`
          SELECT pg_try_advisory_lock(hashtext(${lockKey})) as "pg_try_advisory_lock"
        `;
        lockAcquired = lockResult[0]?.pg_try_advisory_lock ?? false;
        if (!lockAcquired) {
          this.logger.debug(`Skipping ${jobName} for ${org.id}; lock held elsewhere`);
          continue;
        }

        await runner(org.id);
      } catch (error) {
        this.logger.error(`Failed ${jobName} for org ${org.id}`, error as Error);
      } finally {
        if (lockAcquired) {
          await this.prisma.$queryRaw`SELECT pg_advisory_unlock(hashtext(${lockKey}))`;
        }
      }
    }
  }
}
