import { Module } from '@nestjs/common';
import { AIAnomalyDetectorService } from './ai-anomaly-detector.service';
import { HealthMonitorService } from './health-monitor.service';
import { AnomalyMonitoringService } from './anomaly-monitoring.service';
import { AIMetricsService } from './ai-metrics.service';
import { AIAlertingService } from './ai-alerting.service';
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
  ],
  exports: [
    AIAnomalyDetectorService,
    HealthMonitorService,
    AnomalyMonitoringService,
    AIMetricsService,
    AIAlertingService,
  ],
})
export class MonitoringModule {}

