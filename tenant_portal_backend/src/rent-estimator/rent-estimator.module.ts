
import { Module } from '@nestjs/common';
import { RentEstimatorController } from './rent-estimator.controller';
import { RentEstimatorService } from './rent-estimator.service';
import { OrgContextGuard } from '../common/org-context/org-context.guard';

@Module({
  controllers: [RentEstimatorController],
  providers: [RentEstimatorService, OrgContextGuard],
})
export class RentEstimatorModule {}
