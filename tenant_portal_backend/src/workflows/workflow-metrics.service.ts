import { Injectable, Logger } from '@nestjs/common';

export interface WorkflowMetric {
  workflowId: string;
  executionId: string;
  status: 'COMPLETED' | 'FAILED' | 'CANCELLED';
  duration: number; // milliseconds
  stepCount: number;
  failedStepCount: number;
  timestamp: Date;
  errorCode?: string;
}

export interface WorkflowMetrics {
  workflowId: string;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageDuration: number;
  averageStepCount: number;
  errorRate: number;
  mostCommonError?: string;
}

@Injectable()
export class WorkflowMetricsService {
  private readonly logger = new Logger(WorkflowMetricsService.name);
  private metrics: WorkflowMetric[] = [];
  private readonly maxMetricsHistory = 5000; // Keep last 5000 metrics

  /**
   * Record a workflow execution metric
   */
  recordMetric(metric: Omit<WorkflowMetric, 'timestamp'>): void {
    const fullMetric: WorkflowMetric = {
      ...metric,
      timestamp: new Date(),
    };

    this.metrics.push(fullMetric);

    // Keep only recent metrics
    if (this.metrics.length > this.maxMetricsHistory) {
      this.metrics = this.metrics.slice(-this.maxMetricsHistory);
    }

    // Log structured metric
    this.logger.log('Workflow metric recorded', {
      workflowId: fullMetric.workflowId,
      executionId: fullMetric.executionId,
      status: fullMetric.status,
      duration: fullMetric.duration,
      stepCount: fullMetric.stepCount,
      failedStepCount: fullMetric.failedStepCount,
      errorCode: fullMetric.errorCode,
    });
  }

  /**
   * Get metrics for a specific workflow
   */
  getWorkflowMetrics(workflowId: string, timeWindowMinutes: number = 60): WorkflowMetrics {
    const cutoffTime = new Date(Date.now() - timeWindowMinutes * 60 * 1000);
    const workflowMetrics = this.metrics.filter(
      (m) => m.workflowId === workflowId && m.timestamp >= cutoffTime,
    );

    if (workflowMetrics.length === 0) {
      return {
        workflowId,
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        averageDuration: 0,
        averageStepCount: 0,
        errorRate: 0,
      };
    }

    const successfulExecutions = workflowMetrics.filter((m) => m.status === 'COMPLETED').length;
    const failedExecutions = workflowMetrics.filter((m) => m.status === 'FAILED').length;
    const totalDuration = workflowMetrics.reduce((sum, m) => sum + m.duration, 0);
    const totalStepCount = workflowMetrics.reduce((sum, m) => sum + m.stepCount, 0);

    // Find most common error code
    const errorCodes = workflowMetrics
      .filter((m) => m.errorCode)
      .map((m) => m.errorCode!);
    const mostCommonError = this.findMostCommon(errorCodes);

    return {
      workflowId,
      totalExecutions: workflowMetrics.length,
      successfulExecutions,
      failedExecutions,
      averageDuration: totalDuration / workflowMetrics.length,
      averageStepCount: totalStepCount / workflowMetrics.length,
      errorRate: (failedExecutions / workflowMetrics.length) * 100,
      mostCommonError,
    };
  }

  /**
   * Get metrics for all workflows
   */
  getAllWorkflowMetrics(timeWindowMinutes: number = 60): WorkflowMetrics[] {
    const workflowIds = [...new Set(this.metrics.map((m) => m.workflowId))];
    return workflowIds.map((workflowId) => this.getWorkflowMetrics(workflowId, timeWindowMinutes));
  }

  /**
   * Get overall workflow health
   */
  getOverallHealth(timeWindowMinutes: number = 60): {
    healthy: boolean;
    totalExecutions: number;
    successRate: number;
    averageDuration: number;
    errorRate: number;
    alerts: string[];
  } {
    const cutoffTime = new Date(Date.now() - timeWindowMinutes * 60 * 1000);
    const recentMetrics = this.metrics.filter((m) => m.timestamp >= cutoffTime);

    if (recentMetrics.length === 0) {
      return {
        healthy: true,
        totalExecutions: 0,
        successRate: 100,
        averageDuration: 0,
        errorRate: 0,
        alerts: [],
      };
    }

    const successfulExecutions = recentMetrics.filter((m) => m.status === 'COMPLETED').length;
    const failedExecutions = recentMetrics.filter((m) => m.status === 'FAILED').length;
    const totalDuration = recentMetrics.reduce((sum, m) => sum + m.duration, 0);
    const successRate = (successfulExecutions / recentMetrics.length) * 100;
    const errorRate = (failedExecutions / recentMetrics.length) * 100;
    const averageDuration = totalDuration / recentMetrics.length;

    const alerts: string[] = [];

    // Generate alerts based on thresholds
    if (errorRate > 10) {
      alerts.push(`High error rate: ${errorRate.toFixed(2)}%`);
    }
    if (averageDuration > 30000) {
      alerts.push(`Slow average execution time: ${(averageDuration / 1000).toFixed(2)}s`);
    }
    if (successRate < 90) {
      alerts.push(`Low success rate: ${successRate.toFixed(2)}%`);
    }

    return {
      healthy: alerts.length === 0,
      totalExecutions: recentMetrics.length,
      successRate,
      averageDuration,
      errorRate,
      alerts,
    };
  }

  /**
   * Find most common value in array
   */
  private findMostCommon<T>(arr: T[]): T | undefined {
    if (arr.length === 0) return undefined;

    const frequency: Map<T, number> = new Map();
    let maxCount = 0;
    let mostCommon: T | undefined;

    for (const item of arr) {
      const count = (frequency.get(item) || 0) + 1;
      frequency.set(item, count);

      if (count > maxCount) {
        maxCount = count;
        mostCommon = item;
      }
    }

    return mostCommon;
  }

  /**
   * Clear old metrics (older than specified days)
   */
  clearOldMetrics(daysToKeep: number = 7): void {
    const cutoffTime = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
    const initialLength = this.metrics.length;
    this.metrics = this.metrics.filter((m) => m.timestamp >= cutoffTime);
    const removed = initialLength - this.metrics.length;

    if (removed > 0) {
      this.logger.log(`Cleared ${removed} old workflow metrics`);
    }
  }
}

