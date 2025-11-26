import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { AIAnomalyDetectorService, AnomalyDetectionResult } from './ai-anomaly-detector.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType, Role } from '@prisma/client';

@Injectable()
export class AnomalyMonitoringService {
  private readonly logger = new Logger(AnomalyMonitoringService.name);
  private readonly processedAnomalies = new Set<string>(); // Track processed anomalies to avoid duplicates

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiAnomalyDetectorService: AIAnomalyDetectorService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Detect payment anomalies every 6 hours
   */
  @Cron(CronExpression.EVERY_6_HOURS, {
    name: 'detectPaymentAnomalies',
    timeZone: 'America/New_York',
  })
  async detectPaymentAnomalies() {
    this.logger.log('Starting payment anomaly detection...');

    try {
      const anomalies = await this.aiAnomalyDetectorService.detectPaymentAnomalies();

      if (anomalies.length === 0) {
        this.logger.debug('No payment anomalies detected');
        return;
      }

      this.logger.warn(`Detected ${anomalies.length} payment anomaly(ies)`);

      for (const anomaly of anomalies) {
        await this.handleAnomaly(anomaly);
      }
    } catch (error) {
      this.logger.error('Error detecting payment anomalies:', error);
    }
  }

  /**
   * Detect maintenance anomalies every hour
   */
  @Cron(CronExpression.EVERY_HOUR, {
    name: 'detectMaintenanceAnomalies',
    timeZone: 'America/New_York',
  })
  async detectMaintenanceAnomalies() {
    this.logger.log('Starting maintenance anomaly detection...');

    try {
      const anomalies = await this.aiAnomalyDetectorService.detectMaintenanceAnomalies();

      if (anomalies.length === 0) {
        this.logger.debug('No maintenance anomalies detected');
        return;
      }

      this.logger.warn(`Detected ${anomalies.length} maintenance anomaly(ies)`);

      for (const anomaly of anomalies) {
        await this.handleAnomaly(anomaly);
      }
    } catch (error) {
      this.logger.error('Error detecting maintenance anomalies:', error);
    }
  }

  /**
   * Detect performance anomalies every 5 minutes
   */
  @Cron(CronExpression.EVERY_5_MINUTES, {
    name: 'detectPerformanceAnomalies',
  })
  async detectPerformanceAnomalies() {
    this.logger.debug('Starting performance anomaly detection...');

    try {
      const anomalies = await this.aiAnomalyDetectorService.detectPerformanceAnomalies();

      if (anomalies.length === 0) {
        return;
      }

      this.logger.warn(`Detected ${anomalies.length} performance anomaly(ies)`);

      for (const anomaly of anomalies) {
        await this.handleAnomaly(anomaly);
      }
    } catch (error) {
      this.logger.error('Error detecting performance anomalies:', error);
    }
  }

  /**
   * Handle a detected anomaly
   */
  private async handleAnomaly(anomaly: AnomalyDetectionResult): Promise<void> {
    try {
      // Create unique key for this anomaly to avoid duplicate processing
      const anomalyKey = `${anomaly.type}-${anomaly.severity}-${anomaly.description.substring(0, 50)}`;
      
      // Skip if already processed recently (within last hour)
      if (this.processedAnomalies.has(anomalyKey)) {
        this.logger.debug(`Skipping duplicate anomaly: ${anomalyKey}`);
        return;
      }

      // Log the anomaly
      this.logger.warn(
        `Anomaly detected: ${anomaly.type} - ${anomaly.severity} - ${anomaly.description}`,
      );

      // Store in processed set (will be cleared periodically)
      this.processedAnomalies.add(anomalyKey);

      // Alert administrators
      await this.alertAdministrators(anomaly);

      // Take automated action for critical anomalies
      if (anomaly.severity === 'CRITICAL' || anomaly.severity === 'HIGH') {
        await this.handleCriticalAnomaly(anomaly);
      }

      // Store anomaly record in database (optional - for historical tracking)
      await this.storeAnomalyRecord(anomaly);
    } catch (error) {
      this.logger.error(`Error handling anomaly: ${anomaly.description}`, error);
    }
  }

  /**
   * Alert administrators about the anomaly
   */
  private async alertAdministrators(anomaly: AnomalyDetectionResult): Promise<void> {
    try {
      // Get all property managers (they act as administrators)
      const administrators = await this.prisma.user.findMany({
        where: {
          role: Role.PROPERTY_MANAGER,
        },
      });

      if (administrators.length === 0) {
        this.logger.warn('No administrators found to notify about anomaly');
        return;
      }

      const title = `${anomaly.severity} ${anomaly.type} Anomaly Detected`;
      const message = `${anomaly.description}\n\nRecommended Actions:\n${anomaly.recommendedActions
        .map((action) => `• ${action}`)
        .join('\n')}`;

      // Notify all administrators
      for (const admin of administrators) {
        await this.notificationsService.create({
          userId: admin.id,
          type: NotificationType.SYSTEM_ALERT,
          title,
          message,
          metadata: {
            anomalyType: anomaly.type,
            severity: anomaly.severity,
            detectedAt: anomaly.detectedAt.toISOString(),
            metrics: anomaly.metrics,
            recommendedActions: anomaly.recommendedActions,
          },
          sendEmail: anomaly.severity === 'CRITICAL' || anomaly.severity === 'HIGH',
          useAITiming: true,
          personalize: false, // System alerts don't need personalization
          urgency: anomaly.severity === 'CRITICAL' ? 'HIGH' : anomaly.severity === 'HIGH' ? 'HIGH' : 'MEDIUM',
        });
      }

      this.logger.log(`Notified ${administrators.length} administrator(s) about ${anomaly.type} anomaly`);
    } catch (error) {
      this.logger.error('Error alerting administrators:', error);
    }
  }

  /**
   * Handle critical anomalies with automated responses
   */
  private async handleCriticalAnomaly(anomaly: AnomalyDetectionResult): Promise<void> {
    this.logger.error(
      `CRITICAL/HIGH anomaly detected: ${anomaly.type} - ${anomaly.description}`,
    );

    try {
      switch (anomaly.type) {
        case 'PAYMENT':
          await this.handlePaymentAnomaly(anomaly);
          break;
        case 'MAINTENANCE':
          await this.handleMaintenanceAnomaly(anomaly);
          break;
        case 'PERFORMANCE':
          await this.handlePerformanceAnomaly(anomaly);
          break;
        default:
          this.logger.warn(`No specific handler for anomaly type: ${anomaly.type}`);
      }
    } catch (error) {
      this.logger.error(`Error handling critical ${anomaly.type} anomaly:`, error);
    }
  }

  /**
   * Handle payment-related critical anomalies
   */
  private async handlePaymentAnomaly(anomaly: AnomalyDetectionResult): Promise<void> {
    // For payment anomalies, we might want to:
    // - Freeze suspicious transactions
    // - Flag accounts for review
    // - Increase monitoring

    this.logger.warn(
      `Payment anomaly requires attention: ${anomaly.description}. ` +
      `Recommended: ${anomaly.recommendedActions.join(', ')}`,
    );

    // In a production system, you might:
    // 1. Create a review ticket
    // 2. Flag related accounts
    // 3. Increase logging for affected transactions
  }

  /**
   * Handle maintenance-related critical anomalies
   */
  private async handleMaintenanceAnomaly(anomaly: AnomalyDetectionResult): Promise<void> {
    // For maintenance spikes, we might want to:
    // - Auto-assign additional technicians
    // - Escalate to property managers
    // - Create emergency response plan

    this.logger.warn(
      `Maintenance anomaly requires attention: ${anomaly.description}. ` +
      `Recommended: ${anomaly.recommendedActions.join(', ')}`,
    );

    // In a production system, you might:
    // 1. Auto-escalate high-priority requests
    // 2. Notify all available technicians
    // 3. Create a response team
  }

  /**
   * Handle performance-related critical anomalies
   */
  private async handlePerformanceAnomaly(anomaly: AnomalyDetectionResult): Promise<void> {
    // For performance issues, we might want to:
    // - Scale up resources
    // - Enable maintenance mode
    // - Alert DevOps team

    this.logger.error(
      `Performance anomaly detected: ${anomaly.description}. ` +
      `Recommended: ${anomaly.recommendedActions.join(', ')}`,
    );

    // In a production system, you might:
    // 1. Trigger auto-scaling
    // 2. Enable rate limiting
    // 3. Alert DevOps/SRE team via PagerDuty/Slack
  }

  /**
   * Store anomaly record for historical tracking
   */
  private async storeAnomalyRecord(anomaly: AnomalyDetectionResult): Promise<void> {
    try {
      // In a production system, you might have an AnomalyLog table
      // For now, we'll just log it
      this.logger.log(
        `Anomaly record: ${anomaly.type} - ${anomaly.severity} at ${anomaly.detectedAt.toISOString()}`,
      );

      // TODO: Create AnomalyLog model in Prisma and store records
      // await this.prisma.anomalyLog.create({
      //   data: {
      //     type: anomaly.type,
      //     severity: anomaly.severity,
      //     description: anomaly.description,
      //     metrics: anomaly.metrics,
      //     recommendedActions: anomaly.recommendedActions,
      //   },
      // });
    } catch (error) {
      this.logger.error('Error storing anomaly record:', error);
    }
  }

  /**
   * Clear old processed anomalies (run periodically to prevent memory leak)
   */
  @Cron(CronExpression.EVERY_HOUR, {
    name: 'clearProcessedAnomalies',
  })
  clearProcessedAnomalies() {
    // Clear the set every hour to allow re-processing of persistent anomalies
    const sizeBefore = this.processedAnomalies.size;
    this.processedAnomalies.clear();
    this.logger.debug(`Cleared ${sizeBefore} processed anomaly keys`);
  }
}

