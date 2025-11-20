import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { LeaseStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LeaseService } from './lease.service';

@Injectable()
export class LeaseTasksService {
  private readonly logger = new Logger(LeaseTasksService.name);

  constructor(private readonly prisma: PrismaService, private readonly leaseService: LeaseService) {}

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
