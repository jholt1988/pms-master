import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { UtilityBillingModule } from '../utility-billing/utility-billing.module';
import { OperatorUtilityBillingController } from './operator-utility-billing.controller';
import { OperatorUtilityBillingService } from './operator-utility-billing.service';

@Module({
  imports: [PrismaModule, UtilityBillingModule],
  controllers: [OperatorUtilityBillingController],
  providers: [OperatorUtilityBillingService],
  exports: [OperatorUtilityBillingService],
})
export class OperatorUtilityBillingModule {}
