import { Module } from '@nestjs/common';
import { InspectionsService } from './inspections.service';
import { InspectionsController } from './inspections.controller';
import { EstimatesController } from './estimates.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailModule } from '../email/email.module';
import { OrgContextGuard } from '../common/org-context/org-context.guard';
import { PropertyOsModule } from '../property-os/property-os.module';

@Module({
  imports: [PrismaModule, EmailModule, PropertyOsModule],
  controllers: [InspectionsController, EstimatesController],
  providers: [InspectionsService, OrgContextGuard],
  exports: [InspectionsService],
})
export class InspectionsModule {}