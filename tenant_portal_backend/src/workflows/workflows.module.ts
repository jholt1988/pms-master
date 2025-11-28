import { Module } from '@nestjs/common';
import { WorkflowEngineService } from './workflow-engine.service';
import { WorkflowSchedulerService } from './workflow-scheduler.service';
import { WorkflowMetricsService } from './workflow-metrics.service';
import { WorkflowCacheService } from './workflow-cache.service';
import { WorkflowRateLimiterService } from './workflow-rate-limiter.service';
import { PrismaModule } from '../prisma/prisma.module';
import { MaintenanceModule } from '../maintenance/maintenance.module';
import { PaymentsModule } from '../payments/payments.module';
import { LeaseModule } from '../lease/lease.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    PrismaModule,
    MaintenanceModule,
    PaymentsModule,
    LeaseModule,
    NotificationsModule,
  ],
  providers: [
    WorkflowEngineService,
    WorkflowSchedulerService,
    WorkflowMetricsService,
    WorkflowCacheService,
    WorkflowRateLimiterService,
  ],
  exports: [
    WorkflowEngineService,
    WorkflowSchedulerService,
    WorkflowMetricsService,
    WorkflowCacheService,
    WorkflowRateLimiterService,
  ],
})
export class WorkflowsModule {}

