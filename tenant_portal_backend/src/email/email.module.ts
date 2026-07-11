import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { EmailService, EMAIL_QUEUE_NAME } from './email.service';
import { EmailProcessor } from './email.processor';

// Skip the queue (and its Redis connection) in tests / when Redis is disabled,
// matching the convention used by the other queue modules. When disabled,
// EmailService.queuePaymentConfirmation() falls back to sending inline.
const queueEnabled = process.env.NODE_ENV !== 'test' && process.env.DISABLE_REDIS !== 'true';

@Module({
  imports: [
    ConfigModule,
    ...(queueEnabled
      ? [
          BullModule.registerQueue({
            name: EMAIL_QUEUE_NAME,
            defaultJobOptions: {
              attempts: 3,
              backoff: { type: 'exponential', delay: 2000 },
              removeOnComplete: true,
              removeOnFail: false,
            },
          }),
        ]
      : []),
  ],
  providers: [EmailService, ...(queueEnabled ? [EmailProcessor] : [])],
  exports: [EmailService],
})
export class EmailModule {}

