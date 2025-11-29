import { Injectable, Logger } from '@nestjs/common';

export interface AIMaintenanceMetric {
  operation: 'assignPriority' | 'assignTechnician' | 'predictSLABreach';
  success: boolean;
  responseTime: number; // milliseconds
  timestamp: Date;
  requestId?: number;
  fallbackUsed?: boolean;
  error?: string;
}

export interface AIMaintenanceMetrics {
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  averageResponseTime: number;
  fallbackUsageRate: number;
  operations: {
    assignPriority: {
      total: number;
      successful: number;
      averageResponseTime: number;
      fallbackRate: number;
    };
    assignTechnician: {
      total: number;
      successful: number;
      averageResponseTime: number;
    };
    predictSLABreach: {
      total: number;
      successful: number;
      averageResponseTime: number;
    };
  };
}

@Injectable()
export class AIMaintenanceMetricsService {
  private readonly logger = new Logger(AIMaintenanceMetricsService.name);
  private metrics: AIMaintenanceMetric[] = [];
  private readonly maxMetricsHistory = 10000; // Keep last 10,000 metrics

  /**
   * Record an AI maintenance operation metric
   */
  recordMetric(metric: Omit<AIMaintenanceMetric, 'timestamp'>): void {
    const fullMetric: AIMaintenanceMetric = {
      ...metric,
      timestamp: new Date(),
    };

    this.metrics.push(fullMetric);

    // Keep only recent metrics
    if (this.metrics.length > this.maxMetricsHistory) {
      this.metrics = this.metrics.slice(-this.maxMetricsHistory);
    }

    // Log structured metric
    this.logger.debug('AI maintenance metric recorded', {
      operation: fullMetric.operation,
      success: fullMetric.success,
      responseTime: fullMetric.responseTime,
      requestId: fullMetric.requestId,
      fallbackUsed: fullMetric.fallbackUsed,
    });
  }

  /**
   * Get aggregated metrics for all operations
   */
  getMetrics(): AIMaintenanceMetrics {
    const totalCalls = this.metrics.length;
    const successfulCalls = this.metrics.filter((m) => m.success).length;
    const failedCalls = this.metrics.filter((m) => !m.success).length;
    const totalResponseTime = this.metrics.reduce((sum, m) => sum + m.responseTime, 0);
    const averageResponseTime = totalCalls > 0 ? totalResponseTime / totalCalls : 0;
    const fallbackCalls = this.metrics.filter((m) => m.fallbackUsed).length;
    const fallbackUsageRate = totalCalls > 0 ? fallbackCalls / totalCalls : 0;

    // Operation-specific metrics
    const priorityMetrics = this.metrics.filter((m) => m.operation === 'assignPriority');
    const technicianMetrics = this.metrics.filter((m) => m.operation === 'assignTechnician');
    const slaMetrics = this.metrics.filter((m) => m.operation === 'predictSLABreach');

    return {
      totalCalls,
      successfulCalls,
      failedCalls,
      averageResponseTime,
      fallbackUsageRate,
      operations: {
        assignPriority: {
          total: priorityMetrics.length,
          successful: priorityMetrics.filter((m) => m.success).length,
          averageResponseTime:
            priorityMetrics.length > 0
              ? priorityMetrics.reduce((sum, m) => sum + m.responseTime, 0) / priorityMetrics.length
              : 0,
          fallbackRate:
            priorityMetrics.length > 0
              ? priorityMetrics.filter((m) => m.fallbackUsed).length / priorityMetrics.length
              : 0,
        },
        assignTechnician: {
          total: technicianMetrics.length,
          successful: technicianMetrics.filter((m) => m.success).length,
          averageResponseTime:
            technicianMetrics.length > 0
              ? technicianMetrics.reduce((sum, m) => sum + m.responseTime, 0) / technicianMetrics.length
              : 0,
        },
        predictSLABreach: {
          total: slaMetrics.length,
          successful: slaMetrics.filter((m) => m.success).length,
          averageResponseTime:
            slaMetrics.length > 0
              ? slaMetrics.reduce((sum, m) => sum + m.responseTime, 0) / slaMetrics.length
              : 0,
        },
      },
    };
  }

  /**
   * Get metrics for a specific operation
   */
  getOperationMetrics(operation: AIMaintenanceMetric['operation']): {
    total: number;
    successful: number;
    failed: number;
    averageResponseTime: number;
    fallbackRate?: number;
  } {
    const operationMetrics = this.metrics.filter((m) => m.operation === operation);
    const total = operationMetrics.length;
    const successful = operationMetrics.filter((m) => m.success).length;
    const failed = operationMetrics.filter((m) => !m.success).length;
    const averageResponseTime =
      total > 0 ? operationMetrics.reduce((sum, m) => sum + m.responseTime, 0) / total : 0;
    const fallbackRate =
      total > 0 ? operationMetrics.filter((m) => m.fallbackUsed).length / total : 0;

    return {
      total,
      successful,
      failed,
      averageResponseTime,
      ...(operation === 'assignPriority' && { fallbackRate }),
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
  getRecentMetrics(count: number = 100): AIMaintenanceMetric[] {
    return this.metrics.slice(-count);
  }
}

