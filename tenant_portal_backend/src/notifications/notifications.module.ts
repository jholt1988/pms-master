import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationTasks } from './notifications.tasks';
import { AINotificationService } from './ai-notification.service';
import { SmsService } from './sms.service';
import { PushService } from './push.service';
import { NotificationPreferencesService } from './notification-preferences.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { PaymentsModule } from '../payments/payments.module';
import { EmailService } from '../email/email.service';

@Module({
  imports: [PrismaModule, ConfigModule, PaymentsModule],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationTasks,
    AINotificationService,
    SmsService,
    PushService,
    NotificationPreferencesService,
    EmailService,
  ],
  exports: [NotificationsService, AINotificationService, NotificationPreferencesService],
})
export class NotificationsModule {}
