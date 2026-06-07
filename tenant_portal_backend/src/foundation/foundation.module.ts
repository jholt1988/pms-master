import { Module } from '@nestjs/common';
import { IdempotencyModule } from '../common/idempotency/idempotency.module';
import { OrgContextGuard } from '../common/org-context/org-context.guard';
import { FoundationController } from './foundation.controller';

@Module({
  imports: [IdempotencyModule],
  controllers: [FoundationController],
  providers: [OrgContextGuard],
})
export class FoundationModule {}
