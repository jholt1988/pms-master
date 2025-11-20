import { Module } from '@nestjs/common';
import { MessagingController } from './messaging.controller';
import { MessagingService } from './messaging.service';
import { BulkMessagingService } from './bulk-messaging.service';
import { PrismaModule } from '../prisma/prisma.module';
import { MessagingLegacyController } from '../legacy/messaging-legacy.controller';

@Module({
  imports: [PrismaModule],
  controllers: [MessagingController, MessagingLegacyController],
  providers: [MessagingService, BulkMessagingService],
  exports: [MessagingService, BulkMessagingService],
})
export class MessagingModule {}
