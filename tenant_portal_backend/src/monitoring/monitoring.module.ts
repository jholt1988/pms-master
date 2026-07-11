import { Module } from '@nestjs/common';
import { AIAnomalyDetectorService } from './ai-anomaly-detector.service';
import { HealthMonitorService } from './health-monitor.service';
import { AnomalyMonitoringService } from './anomaly-monitoring.service';
import { AIMetricsService } from './ai-metrics.service';
import { AIAlertingService } from './ai-alerting.service';
import { PerformanceMiddleware } from './performance.middleware';
import { PerformanceController } from './performance.controller';
import { QueryMonitorService } from './query-monitor';
import { PrismaModule } from '../prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, ConfigModule, NotificationsModule],
  providers: [
    AIAnomalyDetectorService,
    HealthMonitorService,
    AnomalyMonitoringService,
    AIMetricsService,
    AIAlertingService,
    PerformanceMiddleware,
    QueryMonitorService,
  ],
  controllers: [PerformanceController],
  exports: [
    AIAnomalyDetectorService,
    HealthMonitorService,
    AnomalyMonitoringService,
    AIMetricsService,
    AIAlertingService,
    PerformanceMiddleware,
    QueryMonitorService,
  ],
})
export class MonitoringModule {}

