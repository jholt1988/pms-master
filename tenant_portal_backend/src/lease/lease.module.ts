import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { LeaseController } from './lease.controller';
import { LeaseService } from './lease.service';
import { AILeaseRenewalService } from './ai-lease-renewal.service';
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
  providers: [LeaseService, AILeaseRenewalService, LeaseTasksService],
  exports: [LeaseService, AILeaseRenewalService],
})
export class LeaseModule {}
