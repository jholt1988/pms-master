import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

export interface AnomalyDetectionResult {
  type: 'PAYMENT' | 'MAINTENANCE' | 'PERFORMANCE' | 'DATABASE';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  detectedAt: Date;
  description: string;
  metrics: Record<string, any>;
  recommendedActions: string[];
}

@Injectable()
export class AIAnomalyDetectorService {
  private readonly logger = new Logger(AIAnomalyDetectorService.name);
  private readonly anomalyDetectionEnabled: boolean;
  private readonly detectionHistory: Map<string, number[]> = new Map();

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.anomalyDetectionEnabled =
      this.configService.get<string>('ANOMALY_DETECTION_ENABLED', 'true') === 'true';
  }

  /**
   * Detect payment anomalies
   */
  async detectPaymentAnomalies(): Promise<AnomalyDetectionResult[]> {
    if (!this.anomalyDetectionEnabled) {
      return [];
    }

    const anomalies: AnomalyDetectionResult[] = [];

    try {
      // Get payment statistics for last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const recentPayments = await this.prisma.payment.findMany({
        where: {
          createdAt: { gte: sevenDaysAgo },
        },
        include: {
          invoice: true,
        },
      });

      // Calculate average payment amount
      const paymentAmounts = recentPayments.map((p) => Number(p.amount));
      const avgAmount = paymentAmounts.reduce((a, b) => a + b, 0) / paymentAmounts.length;
      const stdDev = this.calculateStandardDeviation(paymentAmounts);

      // Detect unusually large payments (Z-score > 3)
      for (const payment of recentPayments) {
        const amount = Number(payment.amount);
        const zScore = (amount - avgAmount) / stdDev;

        if (zScore > 3) {
          anomalies.push({
            type: 'PAYMENT',
            severity: 'MEDIUM',
            detectedAt: new Date(),
            description: `Unusually large payment detected: $${amount.toFixed(2)} (Z-score: ${zScore.toFixed(2)})`,
            metrics: {
              amount,
              zScore,
              averageAmount: avgAmount,
              standardDeviation: stdDev,
            },
            recommendedActions: [
              'Verify payment legitimacy',
              'Check for duplicate payments',
              'Review tenant payment history',
            ],
          });
        }
      }

      // Detect payment pattern changes
      const dailyPayments = this.groupByDay(recentPayments);
      const dailyCounts = Array.from(dailyPayments.values()).map((payments) => payments.length);
      const avgDailyCount = dailyCounts.reduce((a, b) => a + b, 0) / dailyCounts.length;

      // Check for sudden drop in payments (potential issue)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayPayments = recentPayments.filter(
        (p) => p.createdAt >= today,
      ).length;

      if (todayPayments < avgDailyCount * 0.5 && avgDailyCount > 5) {
        anomalies.push({
          type: 'PAYMENT',
          severity: 'LOW',
          detectedAt: new Date(),
          description: `Payment volume drop detected: ${todayPayments} payments today vs average of ${avgDailyCount.toFixed(1)}`,
          metrics: {
            todayPayments,
            averageDailyPayments: avgDailyCount,
            dropPercentage: ((1 - todayPayments / avgDailyCount) * 100).toFixed(1),
          },
          recommendedActions: [
            'Check payment processing system',
            'Verify no system outages',
            'Monitor for next few hours',
          ],
        });
      }
    } catch (error) {
      this.logger.error('Error detecting payment anomalies', error);
    }

    return anomalies;
  }

  /**
   * Detect maintenance request spikes
   */
  async detectMaintenanceAnomalies(): Promise<AnomalyDetectionResult[]> {
    if (!this.anomalyDetectionEnabled) {
      return [];
    }

    const anomalies: AnomalyDetectionResult[] = [];

    try {
      // Get maintenance requests for last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const recentRequests = await this.prisma.maintenanceRequest.findMany({
        where: {
          createdAt: { gte: thirtyDaysAgo },
        },
      });

      // Group by day
      const dailyRequests = this.groupByDay(recentRequests);
      const dailyCounts = Array.from(dailyRequests.values()).map(
        (requests) => requests.length,
      );
      const avgDailyCount = dailyCounts.reduce((a, b) => a + b, 0) / dailyCounts.length;
      const stdDev = this.calculateStandardDeviation(dailyCounts);

      // Check today's requests
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayRequests = recentRequests.filter((r) => r.createdAt >= today).length;

      // Detect spike (Z-score > 2.5)
      const zScore = (todayRequests - avgDailyCount) / stdDev;

      if (zScore > 2.5 && todayRequests > 5) {
        anomalies.push({
          type: 'MAINTENANCE',
          severity: zScore > 4 ? 'HIGH' : 'MEDIUM',
          detectedAt: new Date(),
          description: `Maintenance request spike detected: ${todayRequests} requests today vs average of ${avgDailyCount.toFixed(1)} (Z-score: ${zScore.toFixed(2)})`,
          metrics: {
            todayRequests,
            averageDailyRequests: avgDailyCount,
            zScore,
            standardDeviation: stdDev,
          },
          recommendedActions: [
            'Review property conditions',
            'Check for systemic issues',
            'Allocate additional technician resources',
            'Notify property managers',
          ],
        });
      }

      // Detect high-priority request spike
      const todayHighPriority = recentRequests.filter(
        (r) => r.createdAt >= today && r.priority === 'HIGH',
      ).length;

      const avgHighPriority = recentRequests.filter((r) => r.priority === 'HIGH').length / 30;

      if (todayHighPriority > avgHighPriority * 3 && todayHighPriority > 2) {
        anomalies.push({
          type: 'MAINTENANCE',
          severity: 'HIGH',
          detectedAt: new Date(),
          description: `High-priority maintenance request spike: ${todayHighPriority} HIGH priority requests today`,
          metrics: {
            todayHighPriority,
            averageDailyHighPriority: avgHighPriority,
          },
          recommendedActions: [
            'Immediate review of high-priority requests',
            'Check for emergency situations',
            'Escalate to property managers',
          ],
        });
      }
    } catch (error) {
      this.logger.error('Error detecting maintenance anomalies', error);
    }

    return anomalies;
  }

  /**
   * Detect system performance anomalies
   */
  async detectPerformanceAnomalies(): Promise<AnomalyDetectionResult[]> {
    if (!this.anomalyDetectionEnabled) {
      return [];
    }

    const anomalies: AnomalyDetectionResult[] = [];

    try {
      // Monitor database query performance
      // This is a simplified version - in production, you'd use actual query metrics
      const slowQueryThreshold = 1000; // 1 second

      // Check for slow queries (this would typically come from a monitoring system)
      // For now, we'll use a placeholder
      const slowQueries = 0; // Would be fetched from monitoring system

      if (slowQueries > 5) {
        anomalies.push({
          type: 'PERFORMANCE',
          severity: 'MEDIUM',
          detectedAt: new Date(),
          description: `Multiple slow database queries detected: ${slowQueries} queries exceeding ${slowQueryThreshold}ms`,
          metrics: {
            slowQueries,
            threshold: slowQueryThreshold,
          },
          recommendedActions: [
            'Review database indexes',
            'Check for missing query optimizations',
            'Monitor database load',
          ],
        });
      }

      // Monitor API response times (placeholder)
      const avgResponseTime = 150; // Would come from actual metrics
      const responseTimeThreshold = 500; // 500ms

      if (avgResponseTime > responseTimeThreshold) {
        anomalies.push({
          type: 'PERFORMANCE',
          severity: 'LOW',
          detectedAt: new Date(),
          description: `API response time degradation: ${avgResponseTime}ms average (threshold: ${responseTimeThreshold}ms)`,
          metrics: {
            averageResponseTime: avgResponseTime,
            threshold: responseTimeThreshold,
          },
          recommendedActions: [
            'Check server resources',
            'Review recent code changes',
            'Monitor for memory leaks',
          ],
        });
      }
    } catch (error) {
      this.logger.error('Error detecting performance anomalies', error);
    }

    return anomalies;
  }

  /**
   * Calculate standard deviation
   */
  private calculateStandardDeviation(values: number[]): number {
    if (values.length === 0) return 0;

    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map((value) => Math.pow(value - mean, 2));
    const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
    return Math.sqrt(avgSquaredDiff);
  }

  /**
   * Group items by day
   */
  private groupByDay<T extends { createdAt: Date }>(items: T[]): Map<string, T[]> {
    const grouped = new Map<string, T[]>();

    for (const item of items) {
      const dateKey = item.createdAt.toISOString().split('T')[0];
      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, []);
      }
      grouped.get(dateKey)!.push(item);
    }

    return grouped;
  }

  /**
   * Log and alert on anomalies
   */
  async handleAnomalies(anomalies: AnomalyDetectionResult[]): Promise<void> {
    for (const anomaly of anomalies) {
      this.logger.warn(`Anomaly detected: ${anomaly.type} - ${anomaly.description}`);

      // In production, you would:
      // 1. Store anomaly in database
      // 2. Send alerts (Slack, email, etc.)
      // 3. Trigger automated responses for critical anomalies

      if (anomaly.severity === 'CRITICAL' || anomaly.severity === 'HIGH') {
        // Send immediate alert
        this.logger.error(`CRITICAL/HIGH anomaly: ${anomaly.description}`);
      }
    }
  }
}

