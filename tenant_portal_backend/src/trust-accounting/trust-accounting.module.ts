import { Module } from '@nestjs/common';
import { TrustAccountingService } from './trust-accounting.service';
import { TrustAccountingController } from './trust-accounting.controller';

@Module({
  providers: [TrustAccountingService],
  controllers: [TrustAccountingController],
  exports: [TrustAccountingService],
})
export class TrustAccountingModule {}
