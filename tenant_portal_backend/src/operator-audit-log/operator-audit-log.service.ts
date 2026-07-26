import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../shared/audit-log.service';

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
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async getWorkbench(orgId: string, filters: AuditLogFilters) {
    // Delegate to AuditLogService.query() which handles encrypted payload
    // decryption and entityId post-decrypt filtering correctly.
    const { data, total } = await this.auditLogService.query({
      entityId: filters.entityId,
      module: filters.module,
      actorId: filters.actorId,
      startDate: filters.startDate,
      endDate: filters.endDate,
      limit: filters.limit,
      skip: filters.skip,
    });

    // Build metrics from the returned logs
    const byModule = data.reduce(
      (acc: Record<string, number>, log) => {
        const event = String(log.event ?? '');
        const moduleName = event.split('.')[0] || 'UNKNOWN';
        acc[moduleName] = (acc[moduleName] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const now = new Date();
    const last24h = data.filter((log) => {
      const raw = log.createdAt;
      const createdAt = raw instanceof Date ? raw : new Date(String(raw ?? 0));
      return (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60) <= 24;
    }).length;

    const limit = filters.limit ?? 50;
    const skip = filters.skip ?? 0;

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
