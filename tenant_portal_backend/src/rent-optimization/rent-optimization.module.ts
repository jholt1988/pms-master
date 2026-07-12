import { Module } from '@nestjs/common';
import { RentOptimizationController } from './rent-optimization.controller';
import { RentOptimizationService } from './rent-optimization.service';
import { PrismaModule } from '../prisma/prisma.module';
import { MilModule } from '../mil/mil.module';

@Module({
  imports: [PrismaModule, MilModule],
  controllers: [RentOptimizationController],
  providers: [RentOptimizationService],
  exports: [RentOptimizationService],
})
export class RentOptimizationModule {}
