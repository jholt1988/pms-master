import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PaymentsModule } from '../payments/payments.module';
import { FeedController } from './feed.controller';
import { DevSeedController } from './dev.controller';
import { FeedAggregatorService } from './feed-aggregator.service';
import { RolesGuard } from '../auth/roles.guard';
import { OrgContextGuard } from '../common/org-context/org-context.guard';

@Module({
  imports: [PrismaModule, PaymentsModule],
  controllers: [FeedController, DevSeedController],
  providers: [FeedAggregatorService, RolesGuard, OrgContextGuard],
  exports: [FeedAggregatorService],
})
export class FeedModule {}
