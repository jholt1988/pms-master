import { Module } from '@nestjs/common';
import { InspectionService } from '../inspection/inspection.service';
import { EstimateService } from '../inspection/estimate.service';
import { InspectionController } from '../inspection/inspection.controller';
import { EstimateController } from '../inspection/estimate.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailModule } from '../email/email.module';
import { OrgContextGuard } from '../common/org-context/org-context.guard';
import { PropertyOsModule } from '../property-os/property-os.module';

@Module({
  imports: [PrismaModule, EmailModule, PropertyOsModule],
  controllers: [InspectionController, EstimateController],
  providers: [InspectionService, EstimateService, OrgContextGuard],
  exports: [InspectionService, EstimateService],
})
export class InspectionsModule {}

