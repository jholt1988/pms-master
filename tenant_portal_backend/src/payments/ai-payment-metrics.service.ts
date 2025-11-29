import { Injectable, Logger } from '@nestjs/common';

export interface AIPaymentMetric {
  operation: 'assessPaymentRisk' | 'determineReminderTiming';
  success: boolean;
  responseTime: number; // milliseconds
  timestamp: Date;
  tenantId?: number;
  invoiceId?: number;
  error?: string;
}

export interface AIPaymentMetrics {
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  averageResponseTime: number;
  operations: {
    assessPaymentRisk: {
      total: number;
      successful: number;
      averageResponseTime: number;
    };
    determineReminderTiming: {
      total: number;
      successful: number;
      averageResponseTime: number;
    };
  };
}

@Injectable()
export class AIPaymentMetricsService {
  private readonly logger = new Logger(AIPaymentMetricsService.name);
  private metrics: AIPaymentMetric[] = [];
  private readonly maxMetricsHistory = 10000; // Keep last 10,000 metrics

  /**
   * Record an AI payment operation metric
   */
  recordMetric(metric: Omit<AIPaymentMetric, 'timestamp'>): void {
    const fullMetric: AIPaymentMetric = {
      ...metric,
      timestamp: new Date(),
    };

    this.metrics.push(fullMetric);

    // Keep only recent metrics
    if (this.metrics.length > this.maxMetricsHistory) {
      this.metrics = this.metrics.slice(-this.maxMetricsHistory);
    }

    // Log structured metric
    this.logger.debug('AI payment metric recorded', {
      operation: fullMetric.operation,
      success: fullMetric.success,
      responseTime: fullMetric.responseTime,
      tenantId: fullMetric.tenantId,
      invoiceId: fullMetric.invoiceId,
    });
  }

  /**
   * Get aggregated metrics for all operations
   */
  getMetrics(): AIPaymentMetrics {
    const totalCalls = this.metrics.length;
    const successfulCalls = this.metrics.filter((m) => m.success).length;
    const failedCalls = this.metrics.filter((m) => !m.success).length;
    const totalResponseTime = this.metrics.reduce((sum, m) => sum + m.responseTime, 0);
    const averageResponseTime = totalCalls > 0 ? totalResponseTime / totalCalls : 0;

    // Operation-specific metrics
    const riskMetrics = this.metrics.filter((m) => m.operation === 'assessPaymentRisk');
    const reminderMetrics = this.metrics.filter((m) => m.operation === 'determineReminderTiming');

    return {
      totalCalls,
      successfulCalls,
      failedCalls,
      averageResponseTime,
      operations: {
        assessPaymentRisk: {
          total: riskMetrics.length,
          successful: riskMetrics.filter((m) => m.success).length,
          averageResponseTime:
            riskMetrics.length > 0
              ? riskMetrics.reduce((sum, m) => sum + m.responseTime, 0) / riskMetrics.length
              : 0,
        },
        determineReminderTiming: {
          total: reminderMetrics.length,
          successful: reminderMetrics.filter((m) => m.success).length,
          averageResponseTime:
            reminderMetrics.length > 0
              ? reminderMetrics.reduce((sum, m) => sum + m.responseTime, 0) / reminderMetrics.length
              : 0,
        },
      },
    };
  }

  /**
   * Get metrics for a specific operation
   */
  getOperationMetrics(operation: AIPaymentMetric['operation']): {
    total: number;
    successful: number;
    failed: number;
    averageResponseTime: number;
  } {
    const operationMetrics = this.metrics.filter((m) => m.operation === operation);
    const total = operationMetrics.length;
    const successful = operationMetrics.filter((m) => m.success).length;
    const failed = operationMetrics.filter((m) => !m.success).length;
    const averageResponseTime =
      total > 0 ? operationMetrics.reduce((sum, m) => sum + m.responseTime, 0) / total : 0;

    return {
      total,
      successful,
      failed,
      averageResponseTime,
    };
  }

  /**
   * Clear old metrics (keep only last N)
   */
  clearOldMetrics(keepLast: number = 5000): void {
    if (this.metrics.length > keepLast) {
      this.metrics = this.metrics.slice(-keepLast);
      this.logger.log(`Cleared old metrics, keeping last ${keepLast}`);
    }
  }

  /**
   * Get recent metrics (last N)
   */
  getRecentMetrics(count: number = 100): AIPaymentMetric[] {
    return this.metrics.slice(-count);
  }
}

