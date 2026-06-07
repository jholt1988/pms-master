import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { MaintenanceModule } from '../maintenance/maintenance.module';
import { ContractorBiddingModule } from '../contractor-bidding/contractor-bidding.module';
import { AuditLogModule } from '../shared/audit-log.module';
import { OperatorMaintenanceDispatchController } from './operator-maintenance-dispatch.controller';
import { OperatorMaintenanceDispatchService } from './operator-maintenance-dispatch.service';

@Module({
  imports: [PrismaModule, MaintenanceModule, ContractorBiddingModule, AuditLogModule],
  controllers: [OperatorMaintenanceDispatchController],
  providers: [OperatorMaintenanceDispatchService],
  exports: [OperatorMaintenanceDispatchService],
})
export class OperatorMaintenanceDispatchModule {}
