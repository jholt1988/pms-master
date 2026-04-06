import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ScheduledJobsService } from './scheduled-jobs.service';
import { MaintenanceMonitoringService } from './maintenance-monitoring.service';
import { PricingCycleSchedulerService } from './pricing-cycle-scheduler.service';
import { PrismaModule } from '../prisma/prisma.module';
import { MaintenanceModule } from '../maintenance/maintenance.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PaymentsModule } from '../payments/payments.module';
import { EsignatureModule } from '../esignature/esignature.module';
import { RentOptimizationModule } from '../rent-optimization/rent-optimization.module';
import { ReportingModule } from '../reporting/reporting.module';
import { PolicyModule } from '../policy/policy.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule,
    MaintenanceModule,
    NotificationsModule,
    PaymentsModule,
    PolicyModule,
    EsignatureModule,
    RentOptimizationModule,
    ReportingModule,
  ],
  providers: [
    ScheduledJobsService,
    MaintenanceMonitoringService,
    PricingCycleSchedulerService,
  ],
  exports: [ScheduledJobsService, MaintenanceMonitoringService, PricingCycleSchedulerService],
})
export class JobsModule {}
