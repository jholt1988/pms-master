import { Module } from '@nestjs/common';
import { BillingService } from './billing.service';
import { BillingController } from './billing.controller';
import { PaymentsModule } from '../payments/payments.module';
import { PrismaModule } from '../prisma/prisma.module';
import { SecurityEventsService } from '../security-events/security-events.service';
import { OrgContextGuard } from '../common/org-context/org-context.guard';
@Module({
  imports: [PaymentsModule, PrismaModule],
  providers: [BillingService, SecurityEventsService, OrgContextGuard],
  controllers: [BillingController],
  exports: [BillingService],
})
export class BillingModule {}
