import { Module } from '@nestjs/common';
import { InspectionsService } from './inspections.service';
import { InspectionsController } from './inspections.controller';
import { InspectionRequestsController } from './inspection-requests.controller';
import { EstimatesController } from './estimates.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailModule } from '../email/email.module';
import { PropertyOsModule } from '../property-os/property-os.module';

@Module({
  imports: [PrismaModule, EmailModule, PropertyOsModule],
  controllers: [InspectionsController, InspectionRequestsController, EstimatesController],
  providers: [InspectionsService],
  exports: [InspectionsService],
})
export class InspectionsModule {}
