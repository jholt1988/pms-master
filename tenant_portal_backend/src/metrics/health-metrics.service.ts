import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrometheusService } from './prometheus.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class HealthMetricsService {
  private readonly logger = new Logger(HealthMetricsService.name);
  private redis: Redis | null = null;

  constructor(
    private readonly prometheus: PrometheusService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    try {
      this.redis = new Redis({
        host: this.config.get('REDIS_HOST', 'localhost'),
        port: this.config.get('REDIS_PORT', 6379),
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        connectTimeout: 2000,
      });
    } catch {
      this.redis = null;
    }
  }

  @Cron(CronExpression.EVERY_30_SECONDS)
  async syncHealthToMetrics() {
    await this.checkDatabase();
    await this.checkRedis();
  }

  private async checkDatabase() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      this.prometheus.serviceHealth.set({ service: 'database' }, 1);
    } catch {
      this.prometheus.serviceHealth.set({ service: 'database' }, 0);
      this.logger.error('Database health check failed');
    }
  }

  private async checkRedis() {
    if (!this.redis) {
      this.prometheus.serviceHealth.set({ service: 'redis' }, 0);
      return;
    }
    try {
      await this.redis.ping();
      this.prometheus.serviceHealth.set({ service: 'redis' }, 1);
    } catch {
      this.prometheus.serviceHealth.set({ service: 'redis' }, 0);
      this.logger.error('Redis health check failed');
    }
  }
}
