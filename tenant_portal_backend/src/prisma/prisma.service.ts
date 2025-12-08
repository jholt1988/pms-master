import { Injectable, OnModuleDestroy, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  PasswordResetToken: any;
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      // P0-005: Enable query logging for performance monitoring
      // Use event-based logging for query monitoring service
      log: process.env.ENABLE_QUERY_LOGGING === 'true' || process.env.NODE_ENV === 'development'
        ? [
            { emit: 'event', level: 'query' },
            { emit: 'stdout', level: 'error' },
            { emit: 'stdout', level: 'warn' },
          ]
        : [{ emit: 'stdout', level: 'error' }],
    });

    // Subscribe to query events for performance monitoring
    // QueryMonitorService will handle the actual monitoring
    if (process.env.ENABLE_QUERY_LOGGING === 'true' || process.env.NODE_ENV === 'development') {
      // Event subscription will be set up by QueryMonitorService
      this.logger.log('Query event logging enabled for performance monitoring');
    }
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
