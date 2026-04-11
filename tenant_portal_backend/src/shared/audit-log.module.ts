// src/audit/audit-log.module.ts
import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { CryptoService } from '../mil/crypto.service';
import { KeyringService } from '../mil/keyring.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditLogListener } from './audit-log.listener';
import { AuditLogProcessor } from './audit-log.processor';
import { AuditLogService } from './audit-log.service';

@Global()
@Module({
  imports: [
    PrismaModule,
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
  providers: [
    AuditLogService,
    CryptoService,
    KeyringService,
    AuditLogListener,
    AuditLogProcessor,
  ],
  exports: [AuditLogService, CryptoService, KeyringService],
})
export class AuditLogModule {}
