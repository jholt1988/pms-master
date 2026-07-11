import { Module } from '@nestjs/common';
import { IdempotencyModule } from '../common/idempotency/idempotency.module';
import { FoundationController } from './foundation.controller';

@Module({
  imports: [IdempotencyModule],
  controllers: [FoundationController],
  providers: [],
})
export class FoundationModule {}
