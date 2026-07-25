import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CapexForecastingModule } from '../capex-forecasting/capex-forecasting.module';
import { OperatorCapexController } from './operator-capex.controller';
import { OperatorCapexService } from './operator-capex.service';

@Module({
  imports: [PrismaModule, CapexForecastingModule],
  controllers: [OperatorCapexController],
  providers: [OperatorCapexService],
  exports: [OperatorCapexService],
})
export class OperatorCapexModule {}
