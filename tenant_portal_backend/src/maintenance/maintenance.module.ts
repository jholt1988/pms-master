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
import { MaintenanceFeatureExtractionService } from './ai/maintenance-feature-extraction.service';
import { MaintenanceDataQualityService } from './ai/maintenance-data-quality.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { EventScheduleModule } from '../schedule/schedule.module';
import { PredictiveMaintenanceService } from './predictive-maintenance.service';
import { PredictiveMaintenanceController } from './predictive-maintenance.controller';

const legacyEnabled = process.env.ENABLE_LEGACY_ROUTES === 'true';

@Module({
  imports: [PrismaModule, ConfigModule, NotificationsModule, EventScheduleModule],
  controllers: legacyEnabled
    ? [MaintenanceController, MaintenanceLegacyController, PredictiveMaintenanceController]
    : [MaintenanceController, PredictiveMaintenanceController],
  providers: [
    MaintenanceService,
    AIMaintenanceService,
    AIMaintenanceMetricsService,
    SystemUserService,
    OrgContextGuard,
    MaintenanceFeatureExtractionService,
    MaintenanceDataQualityService,
    PredictiveMaintenanceService,
  ],
  exports: [
    MaintenanceService,
    AIMaintenanceService,
    AIMaintenanceMetricsService,
    MaintenanceFeatureExtractionService,
    MaintenanceDataQualityService,
    PredictiveMaintenanceService,
  ],
})
export class MaintenanceModule {}
