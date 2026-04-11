// src/audit/audit-log.module.ts
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AuditLogListener } from './audit-log.listener';
import { AuditLogProcessor } from './audit-log.processor';

@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
    }),
    BullModule.registerQueue({
      name: 'audit-queue',
      // Configure our DLQ / Retry strategy natively
      defaultJobOptions: {
        attempts: 5,
        backoff: {
          type: 'exponential',
          delay: 2000, // 2s, 4s, 8s, 16s, 32s
        },
        removeOnComplete: true, // Keep Redis lean
        removeOnFail: false,    // THIS CREATES THE DLQ. Failed jobs stay in Redis.
      },
    }),
  ],
  providers: [AuditLogListener, AuditLogProcessor],
})
export class AuditLogModule {}