import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { LeaseController } from './lease.controller';
import { LegacyLeaseController } from './legacy-lease.controller';
import { LeaseService } from './lease.service';
import { AILeaseRenewalService } from './ai-lease-renewal.service';
import { AILeaseRenewalMetricsService } from './ai-lease-renewal-metrics.service';
import { LeaseTasksService } from './lease.tasks';
import { PrismaModule } from '../prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { NotificationsModule } from '../notifications/notifications.module';
import { OrgContextGuard } from '../common/org-context/org-context.guard';
import { AuditLogService } from '../shared/audit-log.service';

const legacyEnabled = process.env.ENABLE_LEGACY_ROUTES === 'true';

@Module({
  imports: [
    PrismaModule,
    ConfigModule,
    ScheduleModule.forRoot(),
    NotificationsModule,
  ],
  controllers: legacyEnabled ? [LeaseController, LegacyLeaseController] : [LeaseController],
  providers: [
    LeaseService,
    AILeaseRenewalService,
    AILeaseRenewalMetricsService,
    LeaseTasksService,
    OrgContextGuard,
    AuditLogService,
  ],
  exports: [LeaseService, AILeaseRenewalService, AILeaseRenewalMetricsService],
})
export class LeaseModule {}
