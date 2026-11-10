import { Module } from '@nestjs/common';
import { AffordableHousingService } from './affordable-housing.service';
import { AffordableHousingController } from './affordable-housing.controller';

@Module({
  providers: [AffordableHousingService],
  controllers: [AffordableHousingController],
  exports: [AffordableHousingService],
})
export class AffordableHousingModule {}
