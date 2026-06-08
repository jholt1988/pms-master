import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { InspectionsModule } from '../inspections/inspections.module';
import { MaintenanceModule } from '../maintenance/maintenance.module';
import { AuditLogModule } from '../shared/audit-log.module';
import { OperatorInspectionEstimatesController } from './operator-inspection-estimates.controller';
import { OperatorInspectionEstimatesService } from './operator-inspection-estimates.service';

@Module({
  imports: [PrismaModule, InspectionsModule, MaintenanceModule, AuditLogModule],
  controllers: [OperatorInspectionEstimatesController],
  providers: [OperatorInspectionEstimatesService],
  exports: [OperatorInspectionEstimatesService],
})
export class OperatorInspectionEstimatesModule {}
