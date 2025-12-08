import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { QueryMonitorService } from './query-monitor';

/**
 * P0-005: Performance Metrics Controller
 * Exposes performance metrics for monitoring dashboards
 * 
 * Note: Metrics are collected by PerformanceMiddleware which is registered globally.
 * In a production setup, this would integrate with an APM service (New Relic, Datadog, etc.)
 */
@Controller('api/monitoring/performance')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('ADMIN', 'PROPERTY_MANAGER')
export class PerformanceController {
  constructor(private readonly queryMonitor: QueryMonitorService) {}
  
  @Get('metrics')
  getMetrics() {
    // Return placeholder - in production, fetch from APM service
    return {
      message: 'Performance metrics are being collected. Integrate with APM service for detailed metrics.',
      note: 'Check application logs for performance metrics. Metrics are logged every 100 requests.',
      recommendation: 'Integrate with New Relic, Datadog, or Sentry Performance for production monitoring.',
    };
  }

  @Get('database/slow-queries')
  async getSlowQueries() {
    const stats = this.queryMonitor.getSlowQueryStats();
    return {
      slowQueries: stats,
      threshold: '100ms',
      note: 'Queries taking longer than 100ms are logged here.',
    };
  }

  @Get('database/n-plus-one')
  async getNPlusOnePatterns() {
    const patterns = this.queryMonitor.detectNPlusOnePatterns();
    return {
      potentialNPlusOne: patterns,
      note: 'These patterns may indicate N+1 query issues. Review and optimize with Prisma include statements.',
    };
  }

  @Get('database/connection-pool')
  async getConnectionPoolMetrics() {
    return await this.queryMonitor.getConnectionPoolMetrics();
  }
}

