import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AIMetricsService } from './ai-metrics.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

interface AlertThreshold {
  errorRate: number; // percentage
  responseTime: number; // milliseconds
  fallbackUsage: number; // percentage
  costPerDay: number; // USD
}

@Injectable()
export class AIAlertingService {
  private readonly logger = new Logger(AIAlertingService.name);
  private readonly thresholds: AlertThreshold = {
    errorRate: 5, // 5%
    responseTime: 2000, // 2 seconds
    fallbackUsage: 20, // 20%
    costPerDay: 50, // $50 per day
  };
  private readonly alertCooldown = 60 * 60 * 1000; // 1 hour
  private lastAlerts: Map<string, Date> = new Map();

  constructor(
    private readonly metricsService: AIMetricsService,
    private readonly notificationsService: NotificationsService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Check AI service health and send alerts if thresholds are exceeded
   * Runs every 15 minutes
   */
  @Cron('*/15 * * * *', {
    name: 'checkAIHealthAlerts',
  })
  async checkAIHealthAlerts(): Promise<void> {
    this.logger.debug('Checking AI service health alerts...');

    try {
      const health = this.metricsService.getOverallHealth(60); // Last 60 minutes

      if (!health.healthy) {
        await this.sendAlerts(health);
      }

      // Check individual service metrics
      const serviceMetrics = this.metricsService.getAllServiceMetrics(60);
      for (const metrics of serviceMetrics) {
        await this.checkServiceThresholds(metrics);
      }

      // Check daily cost
      await this.checkDailyCost();
    } catch (error) {
      this.logger.error('Error checking AI health alerts:', error);
    }
  }

  /**
   * Send alerts for overall health issues
   */
  private async sendAlerts(health: {
    healthy: boolean;
    errorRate: number;
    averageResponseTime: number;
    fallbackUsageRate: number;
    alerts: string[];
  }): Promise<void> {
    const alertKey = 'overall-health';
    if (this.isInCooldown(alertKey)) {
      return;
    }

    try {
      const administrators = await this.prisma.user.findMany({
        where: { role: Role.PROPERTY_MANAGER },
      });

      if (administrators.length === 0) {
        this.logger.warn('No administrators found to send alerts to');
        return;
      }

      const message = `AI Service Health Alert:\n\n` +
        `Error Rate: ${health.errorRate.toFixed(1)}%\n` +
        `Average Response Time: ${health.averageResponseTime.toFixed(0)}ms\n` +
        `Fallback Usage: ${health.fallbackUsageRate.toFixed(1)}%\n\n` +
        `Issues:\n${health.alerts.map((a) => `• ${a}`).join('\n')}`;

      for (const admin of administrators) {
        await this.notificationsService.create({
          userId: admin.id,
          type: NotificationType.SYSTEM_ALERT,
          title: 'AI Service Health Degraded',
          message,
          metadata: {
            errorRate: health.errorRate,
            averageResponseTime: health.averageResponseTime,
            fallbackUsageRate: health.fallbackUsageRate,
            alerts: health.alerts,
          },
          sendEmail: true,
          useAITiming: false,
          personalize: false,
          urgency: 'HIGH',
        });
      }

      this.lastAlerts.set(alertKey, new Date());
      this.logger.warn(`Sent AI health alerts to ${administrators.length} administrators`);
    } catch (error) {
      this.logger.error('Error sending AI health alerts:', error);
    }
  }

  /**
   * Check individual service thresholds
   */
  private async checkServiceThresholds(metrics: {
    service: string;
    totalCalls: number;
    errorRate: number;
    averageResponseTime: number;
    fallbackUsageRate: number;
  }): Promise<void> {
    if (metrics.totalCalls === 0) {
      return; // No calls to check
    }

    const alerts: string[] = [];

    if (metrics.errorRate > this.thresholds.errorRate) {
      alerts.push(`Error rate: ${metrics.errorRate.toFixed(1)}% (threshold: ${this.thresholds.errorRate}%)`);
    }

    if (metrics.averageResponseTime > this.thresholds.responseTime) {
      alerts.push(
        `Response time: ${metrics.averageResponseTime.toFixed(0)}ms (threshold: ${this.thresholds.responseTime}ms)`,
      );
    }

    if (metrics.fallbackUsageRate > this.thresholds.fallbackUsage) {
      alerts.push(
        `Fallback usage: ${metrics.fallbackUsageRate.toFixed(1)}% (threshold: ${this.thresholds.fallbackUsage}%)`,
      );
    }

    if (alerts.length > 0) {
      const alertKey = `service-${metrics.service}`;
      if (this.isInCooldown(alertKey)) {
        return;
      }

      try {
        const administrators = await this.prisma.user.findMany({
          where: { role: Role.PROPERTY_MANAGER },
        });

        const message = `AI Service Alert: ${metrics.service}\n\n` +
          `Total Calls: ${metrics.totalCalls}\n` +
          `Issues:\n${alerts.map((a) => `• ${a}`).join('\n')}`;

        for (const admin of administrators) {
          await this.notificationsService.create({
            userId: admin.id,
            type: NotificationType.SYSTEM_ALERT,
            title: `AI Service Alert: ${metrics.service}`,
            message,
            metadata: {
              service: metrics.service,
              metrics,
              alerts,
            },
            sendEmail: true,
            useAITiming: false,
            personalize: false,
            urgency: 'MEDIUM',
          });
        }

        this.lastAlerts.set(alertKey, new Date());
        this.logger.warn(`Sent alert for ${metrics.service}: ${alerts.join(', ')}`);
      } catch (error) {
        this.logger.error(`Error sending alert for ${metrics.service}:`, error);
      }
    }
  }

  /**
   * Check daily cost and alert if exceeded
   */
  private async checkDailyCost(): Promise<void> {
    const alertKey = 'daily-cost';
    if (this.isInCooldown(alertKey)) {
      return;
    }

    try {
      const allMetrics = this.metricsService.getAllServiceMetrics(24 * 60); // Last 24 hours
      const totalCost = allMetrics.reduce((sum, m) => sum + m.totalCost, 0);

      if (totalCost > this.thresholds.costPerDay) {
        const administrators = await this.prisma.user.findMany({
          where: { role: Role.PROPERTY_MANAGER },
        });

        const message = `AI Service Cost Alert\n\n` +
          `Daily Cost: $${totalCost.toFixed(2)}\n` +
          `Threshold: $${this.thresholds.costPerDay}\n\n` +
          `Breakdown:\n${allMetrics
            .filter((m) => m.totalCost > 0)
            .map((m) => `• ${m.service}: $${m.totalCost.toFixed(2)}`)
            .join('\n')}`;

        for (const admin of administrators) {
          await this.notificationsService.create({
            userId: admin.id,
            type: NotificationType.SYSTEM_ALERT,
            title: 'AI Service Cost Exceeded',
            message,
            metadata: {
              totalCost,
              threshold: this.thresholds.costPerDay,
              breakdown: allMetrics,
            },
            sendEmail: true,
            useAITiming: false,
            personalize: false,
            urgency: 'MEDIUM',
          });
        }

        this.lastAlerts.set(alertKey, new Date());
        this.logger.warn(`Daily AI cost exceeded: $${totalCost.toFixed(2)}`);
      }
    } catch (error) {
      this.logger.error('Error checking daily cost:', error);
    }
  }

  /**
   * Check if alert is in cooldown period
   */
  private isInCooldown(alertKey: string): boolean {
    const lastAlert = this.lastAlerts.get(alertKey);
    if (!lastAlert) {
      return false;
    }

    const timeSinceLastAlert = Date.now() - lastAlert.getTime();
    return timeSinceLastAlert < this.alertCooldown;
  }

  /**
   * Clear old alert timestamps (run periodically)
   */
  @Cron(CronExpression.EVERY_HOUR, {
    name: 'clearOldAlerts',
  })
  clearOldAlerts(): void {
    const cutoffTime = Date.now() - this.alertCooldown * 2;
    const beforeCount = this.lastAlerts.size;

    for (const [key, timestamp] of this.lastAlerts.entries()) {
      if (timestamp.getTime() < cutoffTime) {
        this.lastAlerts.delete(key);
      }
    }

    const afterCount = this.lastAlerts.size;
    if (beforeCount !== afterCount) {
      this.logger.debug(`Cleared ${beforeCount - afterCount} old alert timestamps`);
    }
  }

  /**
   * Clean up old metrics (run daily)
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM, {
    name: 'cleanupOldMetrics',
  })
  cleanupOldMetrics(): void {
    this.metricsService.clearOldMetrics(1440 * 7); // Keep last 7 days
    this.logger.log('Cleaned up old AI metrics');
  }
}

