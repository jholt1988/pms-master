
import { Module } from '@nestjs/common';
import { RentalApplicationController } from './rental-application.controller';
import { RentalApplicationService } from './rental-application.service';
import { ApplicationLifecycleService } from './application-lifecycle.service';
import { PrismaModule } from '../prisma/prisma.module';
import { SecurityEventsModule } from '../security-events/security-events.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt.guard';
import { OrgContextGuard } from '../common/org-context/org-context.guard';

@Module({
  imports: [PrismaModule, SecurityEventsModule, NotificationsModule],
  controllers: [RentalApplicationController],
  providers: [RentalApplicationService, ApplicationLifecycleService, OptionalJwtAuthGuard, OrgContextGuard],
  exports: [RentalApplicationService, ApplicationLifecycleService],
})
export class RentalApplicationModule {}
