import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { LeaseController } from './lease.controller';
import { LeaseService } from './lease.service';
import { AILeaseRenewalService } from './ai-lease-renewal.service';
import { AILeaseRenewalMetricsService } from './ai-lease-renewal-metrics.service';
import { LeaseTasksService } from './lease.tasks';
import { PrismaModule } from '../prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    PrismaModule,
    ConfigModule,
    ScheduleModule.forRoot(),
    NotificationsModule,
  ],
  controllers: [LeaseController],
  providers: [
    LeaseService,
    AILeaseRenewalService,
    AILeaseRenewalMetricsService,
    LeaseTasksService,
  ],
  exports: [LeaseService, AILeaseRenewalService, AILeaseRenewalMetricsService],
})
export class LeaseModule {}
