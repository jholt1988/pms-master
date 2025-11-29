import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { AIAnomalyDetectorService, AnomalyDetectionResult } from './ai-anomaly-detector.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType, Role } from '@prisma/client';

@Injectable()
export class AnomalyMonitoringService {
  private readonly logger = new Logger(AnomalyMonitoringService.name);
  private readonly duplicateCheckWindowHours = 24; // Check for duplicates within last 24 hours

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
      // Check for duplicate anomalies in database (within last 24 hours)
      const duplicateAnomaly = await this.findDuplicateAnomaly(anomaly);
      
      if (duplicateAnomaly) {
        this.logger.debug(
          `Skipping duplicate anomaly: ${anomaly.type} - ${anomaly.severity} - ${anomaly.description.substring(0, 50)}. ` +
          `Similar anomaly found: ID ${duplicateAnomaly.id}`,
        );
        return;
      }

      // Log the anomaly
      this.logger.warn(
        `Anomaly detected: ${anomaly.type} - ${anomaly.severity} - ${anomaly.description}`,
      );

      // Store anomaly record in database first
      const anomalyLog = await this.storeAnomalyRecord(anomaly);

      // Alert administrators
      await this.alertAdministrators(anomaly, anomalyLog.id);

      // Take automated action for critical anomalies
      if (anomaly.severity === 'CRITICAL' || anomaly.severity === 'HIGH') {
        await this.handleCriticalAnomaly(anomaly, anomalyLog.id);
      }
    } catch (error) {
      this.logger.error(`Error handling anomaly: ${anomaly.description}`, error);
    }
  }

  /**
   * Find duplicate anomalies in database
   */
  private async findDuplicateAnomaly(anomaly: AnomalyDetectionResult) {
    const windowStart = new Date();
    windowStart.setHours(windowStart.getHours() - this.duplicateCheckWindowHours);

    // Find similar anomalies (same type, severity, and similar description)
    const similarAnomalies = await this.prisma.anomalyLog.findMany({
      where: {
        type: anomaly.type,
        severity: anomaly.severity,
        status: { not: 'FALSE_POSITIVE' }, // Don't match false positives
        detectedAt: {
          gte: windowStart,
        },
      },
      orderBy: {
        detectedAt: 'desc',
      },
      take: 10,
    });

    // Check if any similar anomaly exists (simple string matching on description)
    const descriptionPrefix = anomaly.description.substring(0, 50).toLowerCase();
    for (const existing of similarAnomalies) {
      const existingPrefix = existing.description.substring(0, 50).toLowerCase();
      // If descriptions are very similar (80% match), consider it a duplicate
      if (this.calculateSimilarity(descriptionPrefix, existingPrefix) > 0.8) {
        return existing;
      }
    }

    return null;
  }

  /**
   * Calculate similarity between two strings (simple Jaccard similarity)
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const words1 = new Set(str1.split(/\s+/));
    const words2 = new Set(str2.split(/\s+/));
    
    const intersection = new Set([...words1].filter((x) => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
  }

  /**
   * Store anomaly record in database
   */
  private async storeAnomalyRecord(anomaly: AnomalyDetectionResult) {
    return this.prisma.anomalyLog.create({
      data: {
        type: anomaly.type,
        severity: anomaly.severity,
        description: anomaly.description,
        metrics: anomaly.metrics as any,
        recommendedActions: anomaly.recommendedActions as any,
        detectedAt: anomaly.detectedAt,
        status: 'DETECTED',
      },
    });
  }

  /**
   * Alert administrators about the anomaly
   */
  private async alertAdministrators(anomaly: AnomalyDetectionResult, anomalyLogId: number): Promise<void> {
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
            anomalyLogId,
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
  private async handleCriticalAnomaly(anomaly: AnomalyDetectionResult, anomalyLogId: number): Promise<void> {
    this.logger.error(
      `CRITICAL/HIGH anomaly detected: ${anomaly.type} - ${anomaly.description}`,
    );

    try {
      switch (anomaly.type) {
        case 'PAYMENT':
          await this.handlePaymentAnomaly(anomaly, anomalyLogId);
          break;
        case 'MAINTENANCE':
          await this.handleMaintenanceAnomaly(anomaly, anomalyLogId);
          break;
        case 'PERFORMANCE':
          await this.handlePerformanceAnomaly(anomaly, anomalyLogId);
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
  private async handlePaymentAnomaly(anomaly: AnomalyDetectionResult, anomalyLogId: number): Promise<void> {
    this.logger.warn(
      `Payment anomaly requires attention: ${anomaly.description}. ` +
      `Recommended: ${anomaly.recommendedActions.join(', ')}`,
    );

    try {
      // Extract payment ID from metrics if available
      const paymentId = anomaly.metrics?.paymentId as number | undefined;
      
      if (paymentId) {
        // Mark payment for review (add a flag or status)
        await this.prisma.payment.update({
          where: { id: paymentId },
          data: {
            // Add metadata flag for review
            metadata: {
              ...((anomaly.metrics as any)?.paymentMetadata || {}),
              flaggedForReview: true,
              flaggedAt: new Date().toISOString(),
              flaggedReason: 'Anomaly detection',
              anomalyLogId,
            },
          },
        });
        
        this.logger.log(`Payment ${paymentId} flagged for review due to anomaly ${anomalyLogId}`);
      }

      // In a production system, you might also:
      // 1. Create a review ticket
      // 2. Flag related accounts
      // 3. Increase logging for affected transactions
    } catch (error) {
      this.logger.error(`Error handling payment anomaly ${anomalyLogId}:`, error);
    }
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
  private async handlePerformanceAnomaly(anomaly: AnomalyDetectionResult, anomalyLogId: number): Promise<void> {
    this.logger.error(
      `Performance anomaly detected: ${anomaly.description}. ` +
      `Recommended: ${anomaly.recommendedActions.join(', ')}`,
    );

    try {
      // Update anomaly log with performance metrics
      await this.prisma.anomalyLog.update({
        where: { id: anomalyLogId },
        data: {
          status: 'INVESTIGATING',
        },
      });

      // In a production system, you might:
      // 1. Trigger auto-scaling (via API call to cloud provider)
      // 2. Enable rate limiting (via configuration update)
      // 3. Alert DevOps/SRE team via PagerDuty/Slack
      // 4. Enable maintenance mode for non-critical endpoints
      
      this.logger.warn(
        `Performance anomaly ${anomalyLogId} requires manual intervention. ` +
        `Consider: ${anomaly.recommendedActions.join(', ')}`,
      );
    } catch (error) {
      this.logger.error(`Error handling performance anomaly ${anomalyLogId}:`, error);
    }
  }

}

