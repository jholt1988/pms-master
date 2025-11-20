
import { Module } from '@nestjs/common';
import { RentEstimatorController } from './rent-estimator.controller';
import { RentEstimatorService } from './rent-estimator.service';

@Module({
  controllers: [RentEstimatorController],
  providers: [RentEstimatorService],
})
export class RentEstimatorModule {}
