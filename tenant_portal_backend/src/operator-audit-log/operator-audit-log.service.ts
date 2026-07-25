import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface AuditLogFilters {
  entityId?: string;
  module?: string;
  actorId?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  skip?: number;
}

@Injectable()
export class OperatorAuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  async getWorkbench(orgId: string, filters: AuditLogFilters) {
    const where: Record<string, unknown> = {};
    if (filters.actorId) where.userId = filters.actorId;
    if (filters.module) where.event = { startsWith: filters.module.toUpperCase() + '.' };
    if (filters.startDate || filters.endDate) {
      where.createdAt = {
        ...(filters.startDate ? { gte: new Date(filters.startDate) } : {}),
        ...(filters.endDate ? { lte: new Date(filters.endDate) } : {}),
      };
    }

    const limit = filters.limit ?? 50;
    const skip = filters.skip ?? 0;

    const [total, logs] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
        include: {
          user: { select: { id: true, username: true, firstName: true, lastName: true } },
        },
      }),
    ]);

    // Build metrics from the full result set (not just the page)
    const allLogs = await this.prisma.auditLog.findMany({
      where,
      select: { event: true, createdAt: true },
    });

    const byModule = allLogs.reduce(
      (acc, log) => {
        const moduleName = log.event.split('.')[0] || 'UNKNOWN';
        acc[moduleName] = (acc[moduleName] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const now = new Date();
    const last24h = allLogs.filter(
      (log) => (now.getTime() - log.createdAt.getTime()) / (1000 * 60 * 60) <= 24,
    ).length;

    const data = logs.map((log) => ({
      id: log.id,
      event: log.event,
      createdAt: log.createdAt,
      actor: log.user
        ? {
            id: log.user.id,
            name: [log.user.firstName, log.user.lastName].filter(Boolean).join(' ') || log.user.username,
          }
        : null,
    }));

    return {
      generatedAt: now.toISOString(),
      metrics: {
        totalEvents: total,
        eventsLast24h: last24h,
        uniqueModules: Object.keys(byModule).length,
        byModule,
      },
      logs: data,
      filters: {
        entityId: filters.entityId,
        module: filters.module,
        actorId: filters.actorId,
        startDate: filters.startDate,
        endDate: filters.endDate,
        limit,
        skip,
      },
    };
  }
}
