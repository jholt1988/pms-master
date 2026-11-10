import { Module } from '@nestjs/common';
import { DepositItemizationService } from './deposit-itemization.service';
import { DepositItemizationController } from './deposit-itemization.controller';

@Module({
  providers: [DepositItemizationService],
  controllers: [DepositItemizationController],
  exports: [DepositItemizationService],
})
export class DepositItemizationModule {}
