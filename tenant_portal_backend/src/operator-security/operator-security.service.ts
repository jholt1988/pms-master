import { Injectable } from '@nestjs/common';
import { SecurityEventType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

interface WorkbenchFilters {
  userId?: string;
  username?: string;
  type?: string;
  from?: Date;
  to?: Date;
  limit?: number;
  offset?: number;
}

@Injectable()
export class OperatorSecurityService {
  constructor(private readonly prisma: PrismaService) {}

  async getWorkbench(orgId: string, filters: WorkbenchFilters = {}) {
    const {
      userId,
      username,
      type,
      from,
      to,
      limit = 100,
      offset = 0,
    } = filters;

    const where: any = {
      ...(userId ? { userId } : {}),
      ...(username ? { username } : {}),
      ...(type && Object.values(SecurityEventType).includes(type as SecurityEventType)
        ? { type: type as SecurityEventType }
        : {}),
      ...(from || to
        ? { createdAt: { gte: from, lte: to } }
        : {}),
      ...(orgId ? { user: { organizations: { some: { id: orgId } } } } : {}),
    };

    const [events, total, totalFailed, totalSuccessful] = await Promise.all([
      this.prisma.securityEvent.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: Math.min(limit, 500),
      }),
      this.prisma.securityEvent.count({ where }),
      this.prisma.securityEvent.count({ where: { ...where, success: false } }),
      this.prisma.securityEvent.count({ where: { ...where, success: true } }),
    ]);

    // Build breakdown by event type
    const typeBreakdown: Record<string, number> = {};
    for (const evt of events) {
      typeBreakdown[evt.type] = (typeBreakdown[evt.type] ?? 0) + 1;
    }

    return {
      generatedAt: new Date().toISOString(),
      metrics: {
        totalEvents: total,
        totalFailed,
        totalSuccessful,
        failureRate: total > 0 ? (totalFailed / total) * 100 : 0,
        eventsInPage: events.length,
      },
      typeBreakdown,
      events,
    };
  }
}
