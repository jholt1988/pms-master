
import { Module, HttpModule } from '@nestjs/common';
import { RentalApplicationController } from './rental-application.controller';
import { RentalApplicationService } from './rental-application.service';
import { ApplicationLifecycleService } from './application-lifecycle.service';
import { PrismaModule } from '../prisma/prisma.module';
import { SecurityEventsModule } from '../security-events/security-events.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt.guard';
import { OrgContextGuard } from '../common/org-context/org-context.guard';
import { RentalApplicationAiService } from './rental-application.ai.service';

@Module({
  imports: [PrismaModule, SecurityEventsModule, NotificationsModule, HttpModule],
  controllers: [RentalApplicationController],
  providers: [RentalApplicationService, ApplicationLifecycleService, OptionalJwtAuthGuard, OrgContextGuard, RentalApplicationAiService],
  exports: [RentalApplicationService, ApplicationLifecycleService],
})
export class RentalApplicationModule {}
