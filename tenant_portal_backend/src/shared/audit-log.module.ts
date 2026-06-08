// src/audit/audit-log.module.ts
import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { CryptoService } from '../mil/crypto.service';
import { KeyringService } from '../mil/keyring.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditLogController } from './audit-log.controller';
import { AuditLogListener } from './audit-log.listener';
import { AuditLogProcessor } from './audit-log.processor';
import { AuditLogService } from './audit-log.service';
const queueEnabled = process.env.NODE_ENV !== 'test' && process.env.DISABLE_REDIS !== 'true';

@Global()
@Module({
  imports: [
    PrismaModule,
    ...(queueEnabled
      ? [
          BullModule.forRoot({
            connection: {
              host: process.env.REDIS_HOST || 'redis',
              port: parseInt(process.env.REDIS_PORT || '6379'),
            },
          }),
          BullModule.registerQueue({
            name: 'audit-queue',
            defaultJobOptions: {
              attempts: 5,
              backoff: {
                type: 'exponential',
                delay: 2000,
              },
              removeOnComplete: true,
              removeOnFail: false,
            },
          }),
        ]
      : []),
  ],
  controllers: [AuditLogController],
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
