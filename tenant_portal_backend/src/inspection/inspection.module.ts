import { Module } from '@nestjs/common';
import { InspectionController } from './inspection.controller';
import { EstimateController } from './estimate.controller';
import { InspectionService } from './inspection.service';
import { EstimateService } from './estimate.service';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { OrgContextGuard } from '../common/org-context/org-context.guard';
import { PropertyOsModule } from '../property-os/property-os.module';

@Module({
  imports: [PropertyOsModule],
  controllers: [InspectionController, EstimateController],
  providers: [InspectionService, EstimateService, PrismaService, EmailService, OrgContextGuard],
  exports: [InspectionService, EstimateService],
})
export class InspectionModule {}