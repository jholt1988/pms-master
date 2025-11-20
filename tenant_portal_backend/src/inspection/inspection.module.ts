import { Module } from '@nestjs/common';
import { InspectionController } from './inspection.controller';
import { EstimateController } from './estimate.controller';
import { InspectionService } from './inspection.service';
import { EstimateService } from './estimate.service';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';

@Module({
  controllers: [InspectionController, EstimateController],
  providers: [InspectionService, EstimateService, PrismaService, EmailService],
  exports: [InspectionService, EstimateService],
})
export class InspectionModule {}