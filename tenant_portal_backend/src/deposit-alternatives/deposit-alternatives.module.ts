import { Module } from '@nestjs/common';
import { DepositAlternativesService } from './deposit-alternatives.service';
import { DepositAlternativesController } from './deposit-alternatives.controller';

@Module({
  providers: [DepositAlternativesService],
  controllers: [DepositAlternativesController],
  exports: [DepositAlternativesService],
})
export class DepositAlternativesModule {}
