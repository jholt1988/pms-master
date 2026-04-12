import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CapexForecastingController } from './capex-forecasting.controller';
import { CapexForecastingService } from './capex-forecasting.service';
import { OrgContextGuard } from '../common/org-context/org-context.guard';

@Module({
  imports: [PrismaModule],
  controllers: [CapexForecastingController],
  providers: [CapexForecastingService, OrgContextGuard],
  exports: [CapexForecastingService],
})
export class CapexForecastingModule {}
