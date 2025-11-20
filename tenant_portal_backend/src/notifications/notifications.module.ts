import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { NotificationTasks } from './notifications.tasks';
import { EmailModule } from '../email/email.module';
import { PrismaModule } from '../prisma/prisma.module';
import { SmsService } from './sms.service';

@Module({
  imports: [PrismaModule, EmailModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationTasks, SmsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}

