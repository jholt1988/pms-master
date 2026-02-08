import { Module } from '@nestjs/common';
import { MaintenanceController } from './maintenance.controller';
import { MaintenanceService } from './maintenance.service';
import { AIMaintenanceService } from './ai-maintenance.service';
import { AIMaintenanceMetricsService } from './ai-maintenance-metrics.service';
import { PrismaModule } from '../prisma/prisma.module';
import { MaintenanceLegacyController } from '../legacy/maintenance-legacy.controller';
import { ConfigModule } from '@nestjs/config';
import { SystemUserService } from '../shared/system-user.service';
import { OrgContextGuard } from '../common/org-context/org-context.guard';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [MaintenanceController, MaintenanceLegacyController],
  providers: [
    MaintenanceService,
    AIMaintenanceService,
    AIMaintenanceMetricsService,
    SystemUserService,
    OrgContextGuard,
  ],
  exports: [MaintenanceService, AIMaintenanceService, AIMaintenanceMetricsService],
})
export class MaintenanceModule {}
