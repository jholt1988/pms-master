import { Module } from '@nestjs/common';
import { RentOptimizationController } from './rent-optimization.controller';
import { RentOptimizationService } from './rent-optimization.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [RentOptimizationController],
  providers: [RentOptimizationService],
  exports: [RentOptimizationService],
})
export class RentOptimizationModule {}
