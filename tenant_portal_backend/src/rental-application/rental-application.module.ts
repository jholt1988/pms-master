
import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bullmq';
import { RentalApplicationController } from './rental-application.controller';
import { RentalApplicationService } from './rental-application.service';
import { ApplicationLifecycleService } from './application-lifecycle.service';
import { PrismaModule } from '../prisma/prisma.module';
import { SecurityEventsModule } from '../security-events/security-events.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt.guard';
import { OrgContextGuard } from '../common/org-context/org-context.guard';
import { RentalApplicationAiService } from './rental-application.ai.service';
import { RentalApplicationProcessor } from './rental-application.processor';
import { EventScheduleModule } from '../schedule/schedule.module';
import { PolicyModule } from '../policy/policy.module';

@Module({
  imports: [
    PrismaModule,
    SecurityEventsModule,
    NotificationsModule,
    HttpModule,
    EventScheduleModule,
    PolicyModule,
    BullModule.registerQueue({
      name: 'ai-screening',
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: true,
      },
    }),
  ],
  controllers: [RentalApplicationController],
  providers: [
    RentalApplicationService,
    ApplicationLifecycleService,
    OptionalJwtAuthGuard,
    OrgContextGuard,
    RentalApplicationAiService,
    RentalApplicationProcessor,
  ],
  exports: [RentalApplicationService, ApplicationLifecycleService],
})
export class RentalApplicationModule {}
