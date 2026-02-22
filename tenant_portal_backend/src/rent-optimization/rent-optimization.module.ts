import { Module } from '@nestjs/common';
import { RentOptimizationController } from './rent-optimization.controller';
import { RentOptimizationService } from './rent-optimization.service';
import { PrismaModule } from '../prisma/prisma.module';
import { OrgContextGuard } from '../common/org-context/org-context.guard';

@Module({
  imports: [PrismaModule],
  controllers: [RentOptimizationController],
  providers: [RentOptimizationService, OrgContextGuard],
  exports: [RentOptimizationService],
})
export class RentOptimizationModule {}
