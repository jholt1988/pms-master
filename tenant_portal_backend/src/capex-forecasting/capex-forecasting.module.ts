import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CapexForecastingController } from './capex-forecasting.controller';
import { CapexForecastingService } from './capex-forecasting.service';

@Module({
  imports: [PrismaModule],
  controllers: [CapexForecastingController],
  providers: [CapexForecastingService],
  exports: [CapexForecastingService],
})
export class CapexForecastingModule {}
