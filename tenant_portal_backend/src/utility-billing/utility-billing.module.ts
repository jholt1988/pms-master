import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { UtilityBillingController } from './utility-billing.controller';
import { UtilityBillingService } from './utility-billing.service';

@Module({
  imports: [PrismaModule],
  controllers: [UtilityBillingController],
  providers: [UtilityBillingService],
  exports: [UtilityBillingService],
})
export class UtilityBillingModule {}
