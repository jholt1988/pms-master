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
import { AuditLogService } from '../shared/audit-log.service';
import { MaintenanceFeatureExtractionService } from './ai/maintenance-feature-extraction.service';
import { MaintenanceDataQualityService } from './ai/maintenance-data-quality.service';

const legacyEnabled = process.env.ENABLE_LEGACY_ROUTES === 'true';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: legacyEnabled ? [MaintenanceController, MaintenanceLegacyController] : [MaintenanceController],
  providers: [
    MaintenanceService,
    AIMaintenanceService,
    AIMaintenanceMetricsService,
    SystemUserService,
    OrgContextGuard,
    AuditLogService,
    MaintenanceFeatureExtractionService,
    MaintenanceDataQualityService,
  ],
  exports: [
    MaintenanceService,
    AIMaintenanceService,
    AIMaintenanceMetricsService,
    MaintenanceFeatureExtractionService,
    MaintenanceDataQualityService,
  ],
})
export class MaintenanceModule {}
