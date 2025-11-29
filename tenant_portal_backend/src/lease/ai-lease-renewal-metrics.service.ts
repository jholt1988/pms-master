import { Injectable, Logger } from '@nestjs/common';

export interface AILeaseRenewalMetric {
  operation: 'predictRenewalLikelihood' | 'getRentAdjustment' | 'generatePersonalizedOffer';
  success: boolean;
  responseTime: number; // milliseconds
  timestamp: Date;
  leaseId?: number;
  renewalProbability?: number;
  rentAdjustmentPercentage?: number;
  mlServiceUsed?: boolean;
  cacheHit?: boolean;
  retryAttempts?: number;
  error?: string;
}

export interface AILeaseRenewalMetrics {
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  averageResponseTime: number;
  mlServiceAvailabilityRate: number;
  cacheHitRate: number;
  operations: {
    predictRenewalLikelihood: {
      total: number;
      successful: number;
      averageResponseTime: number;
      averageProbability: number;
      highProbabilityCount: number; // > 0.7
      lowProbabilityCount: number; // < 0.3
    };
    getRentAdjustment: {
      total: number;
      successful: number;
      averageResponseTime: number;
      averageAdjustmentPercentage: number;
      mlServiceUsed: number;
      fallbackUsed: number;
      cacheHits: number;
    };
    generatePersonalizedOffer: {
      total: number;
      successful: number;
      averageResponseTime: number;
    };
  };
}

@Injectable()
export class AILeaseRenewalMetricsService {
  private readonly logger = new Logger(AILeaseRenewalMetricsService.name);
  private metrics: AILeaseRenewalMetric[] = [];
  private readonly maxMetricsHistory = 10000; // Keep last 10,000 metrics

  /**
   * Record an AI lease renewal operation metric
   */
  recordMetric(metric: Omit<AILeaseRenewalMetric, 'timestamp'>): void {
    const fullMetric: AILeaseRenewalMetric = {
      ...metric,
      timestamp: new Date(),
    };

    this.metrics.push(fullMetric);

    // Keep only recent metrics
    if (this.metrics.length > this.maxMetricsHistory) {
      this.metrics = this.metrics.slice(-this.maxMetricsHistory);
    }

    // Log structured metric
    this.logger.debug('AI lease renewal metric recorded', {
      operation: fullMetric.operation,
      success: fullMetric.success,
      responseTime: fullMetric.responseTime,
      leaseId: fullMetric.leaseId,
      renewalProbability: fullMetric.renewalProbability,
      rentAdjustmentPercentage: fullMetric.rentAdjustmentPercentage,
      mlServiceUsed: fullMetric.mlServiceUsed,
      cacheHit: fullMetric.cacheHit,
    });
  }

  /**
   * Get aggregated metrics for all operations
   */
  getMetrics(): AILeaseRenewalMetrics {
    const totalCalls = this.metrics.length;
    const successfulCalls = this.metrics.filter((m) => m.success).length;
    const failedCalls = this.metrics.filter((m) => !m.success).length;
    const totalResponseTime = this.metrics.reduce((sum, m) => sum + m.responseTime, 0);
    const averageResponseTime = totalCalls > 0 ? totalResponseTime / totalCalls : 0;

    // ML service availability
    const mlServiceCalls = this.metrics.filter((m) => m.mlServiceUsed !== undefined);
    const mlServiceSuccessful = mlServiceCalls.filter((m) => m.mlServiceUsed === true).length;
    const mlServiceAvailabilityRate =
      mlServiceCalls.length > 0 ? mlServiceSuccessful / mlServiceCalls.length : 0;

    // Cache hit rate
    const cacheableCalls = this.metrics.filter((m) => m.cacheHit !== undefined);
    const cacheHits = cacheableCalls.filter((m) => m.cacheHit === true).length;
    const cacheHitRate = cacheableCalls.length > 0 ? cacheHits / cacheableCalls.length : 0;

    // Operation-specific metrics
    const predictionMetrics = this.metrics.filter(
      (m) => m.operation === 'predictRenewalLikelihood',
    );
    const rentAdjustmentMetrics = this.metrics.filter((m) => m.operation === 'getRentAdjustment');
    const offerMetrics = this.metrics.filter((m) => m.operation === 'generatePersonalizedOffer');

    // Prediction metrics
    const successfulPredictions = predictionMetrics.filter((m) => m.success);
    const probabilities = successfulPredictions
      .map((m) => m.renewalProbability)
      .filter((p): p is number => p !== undefined);
    const averageProbability =
      probabilities.length > 0
        ? probabilities.reduce((sum, p) => sum + p, 0) / probabilities.length
        : 0;
    const highProbabilityCount = probabilities.filter((p) => p > 0.7).length;
    const lowProbabilityCount = probabilities.filter((p) => p < 0.3).length;

    // Rent adjustment metrics
    const successfulRentAdjustments = rentAdjustmentMetrics.filter((m) => m.success);
    const adjustments = successfulRentAdjustments
      .map((m) => m.rentAdjustmentPercentage)
      .filter((a): a is number => a !== undefined);
    const averageAdjustmentPercentage =
      adjustments.length > 0 ? adjustments.reduce((sum, a) => sum + a, 0) / adjustments.length : 0;
    const mlServiceUsedCount = rentAdjustmentMetrics.filter((m) => m.mlServiceUsed === true).length;
    const fallbackUsedCount = rentAdjustmentMetrics.filter(
      (m) => m.mlServiceUsed === false,
    ).length;
    const rentAdjustmentCacheHits = rentAdjustmentMetrics.filter((m) => m.cacheHit === true).length;

    return {
      totalCalls,
      successfulCalls,
      failedCalls,
      averageResponseTime,
      mlServiceAvailabilityRate,
      cacheHitRate,
      operations: {
        predictRenewalLikelihood: {
          total: predictionMetrics.length,
          successful: successfulPredictions.length,
          averageResponseTime:
            predictionMetrics.length > 0
              ? predictionMetrics.reduce((sum, m) => sum + m.responseTime, 0) /
                predictionMetrics.length
              : 0,
          averageProbability,
          highProbabilityCount,
          lowProbabilityCount,
        },
        getRentAdjustment: {
          total: rentAdjustmentMetrics.length,
          successful: successfulRentAdjustments.length,
          averageResponseTime:
            rentAdjustmentMetrics.length > 0
              ? rentAdjustmentMetrics.reduce((sum, m) => sum + m.responseTime, 0) /
                rentAdjustmentMetrics.length
              : 0,
          averageAdjustmentPercentage,
          mlServiceUsed: mlServiceUsedCount,
          fallbackUsed: fallbackUsedCount,
          cacheHits: rentAdjustmentCacheHits,
        },
        generatePersonalizedOffer: {
          total: offerMetrics.length,
          successful: offerMetrics.filter((m) => m.success).length,
          averageResponseTime:
            offerMetrics.length > 0
              ? offerMetrics.reduce((sum, m) => sum + m.responseTime, 0) / offerMetrics.length
              : 0,
        },
      },
    };
  }

  /**
   * Get metrics for a specific operation
   */
  getOperationMetrics(operation: AILeaseRenewalMetric['operation']): {
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
  getRecentMetrics(count: number = 100): AILeaseRenewalMetric[] {
    return this.metrics.slice(-count);
  }
}

