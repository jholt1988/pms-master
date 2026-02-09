import { Module } from '@nestjs/common';
import { MessagingController } from './messaging.controller';
import { MessagingService } from './messaging.service';
import { BulkMessagingService } from './bulk-messaging.service';
import { PrismaModule } from '../prisma/prisma.module';
@Module({
  imports: [PrismaModule],
  // NOTE: We intentionally register a single MessagingController for /api/messaging/*.
  // The legacy controller used the same routes but returned different response shapes,
  // which made the API non-deterministic for clients.
  controllers: [MessagingController],
  providers: [MessagingService, BulkMessagingService],
  exports: [MessagingService, BulkMessagingService],
})
export class MessagingModule {}
