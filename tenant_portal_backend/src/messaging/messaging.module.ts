import { Module } from '@nestjs/common';
import { MessagingController } from './messaging.controller';
import { MessagingService } from './messaging.service';
import { BulkMessagingService } from './bulk-messaging.service';
import { PrismaModule } from '../prisma/prisma.module';
import { SentimentAnalysisService } from './sentiment-analysis.service';

@Module({
  imports: [PrismaModule],
  // NOTE: We intentionally register a single MessagingController for /api/messaging/*.
  // The legacy controller used the same routes but returned different response shapes,
  // which made the API non-deterministic for clients.
  controllers: [MessagingController],
  providers: [MessagingService, BulkMessagingService, SentimentAnalysisService],
  exports: [MessagingService, BulkMessagingService, SentimentAnalysisService],
})
export class MessagingModule {}
