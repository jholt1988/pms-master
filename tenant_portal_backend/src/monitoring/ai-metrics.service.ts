import { Injectable, Logger } from '@nestjs/common';

export interface AIMetric {
  service: string;
  method: string;
  timestamp: Date;
  responseTime: number;
  success: boolean;
  cached: boolean;
  errorType?: string;
  cost?: number; // Estimated cost in USD
}

export interface AIServiceMetrics {
  service: string;
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  averageResponseTime: number;
  cacheHitRate: number;
  totalCost: number;
  fallbackUsageRate: number;
  errorRate: number;
}

@Injectable()
export class AIMetricsService {
  private readonly logger = new Logger(AIMetricsService.name);
  private metrics: AIMetric[] = [];
  private readonly maxMetricsHistory = 1000; // Keep last 1000 metrics

  /**
   * Record an AI service call metric
   */
  recordMetric(metric: Omit<AIMetric, 'timestamp'>): void {
    const fullMetric: AIMetric = {
      ...metric,
      timestamp: new Date(),
    };

    this.metrics.push(fullMetric);

    // Keep only recent metrics
    if (this.metrics.length > this.maxMetricsHistory) {
      this.metrics = this.metrics.slice(-this.maxMetricsHistory);
    }

    // Log structured metric
    this.logger.log('AI service metric recorded', {
      service: fullMetric.service,
      method: fullMetric.method,
      responseTime: fullMetric.responseTime,
      success: fullMetric.success,
      cached: fullMetric.cached,
      errorType: fullMetric.errorType,
      cost: fullMetric.cost,
    });
  }

  /**
   * Get metrics for a specific service
   */
  getServiceMetrics(serviceName: string, timeWindowMinutes: number = 60): AIServiceMetrics {
    const cutoffTime = new Date(Date.now() - timeWindowMinutes * 60 * 1000);
    const serviceMetrics = this.metrics.filter(
      (m) => m.service === serviceName && m.timestamp >= cutoffTime,
    );

    if (serviceMetrics.length === 0) {
      return {
        service: serviceName,
        totalCalls: 0,
        successfulCalls: 0,
        failedCalls: 0,
        averageResponseTime: 0,
        cacheHitRate: 0,
        totalCost: 0,
        fallbackUsageRate: 0,
        errorRate: 0,
      };
    }

    const successfulCalls = serviceMetrics.filter((m) => m.success).length;
    const failedCalls = serviceMetrics.filter((m) => !m.success).length;
    const cachedCalls = serviceMetrics.filter((m) => m.cached).length;
    const totalResponseTime = serviceMetrics.reduce((sum, m) => sum + m.responseTime, 0);
    const totalCost = serviceMetrics.reduce((sum, m) => sum + (m.cost || 0), 0);
    const fallbackCalls = serviceMetrics.filter((m) => m.errorType === 'FALLBACK').length;

    return {
      service: serviceName,
      totalCalls: serviceMetrics.length,
      successfulCalls,
      failedCalls,
      averageResponseTime: totalResponseTime / serviceMetrics.length,
      cacheHitRate: (cachedCalls / serviceMetrics.length) * 100,
      totalCost,
      fallbackUsageRate: (fallbackCalls / serviceMetrics.length) * 100,
      errorRate: (failedCalls / serviceMetrics.length) * 100,
    };
  }

  /**
   * Get metrics for all services
   */
  getAllServiceMetrics(timeWindowMinutes: number = 60): AIServiceMetrics[] {
    const services = new Set(this.metrics.map((m) => m.service));
    return Array.from(services).map((service) => this.getServiceMetrics(service, timeWindowMinutes));
  }

  /**
   * Get overall AI service health
   */
  getOverallHealth(timeWindowMinutes: number = 60): {
    healthy: boolean;
    errorRate: number;
    averageResponseTime: number;
    fallbackUsageRate: number;
    alerts: string[];
  } {
    const allMetrics = this.getAllServiceMetrics(timeWindowMinutes);
    const totalCalls = allMetrics.reduce((sum, m) => sum + m.totalCalls, 0);
    const totalErrors = allMetrics.reduce((sum, m) => sum + m.failedCalls, 0);
    const totalFallbacks = allMetrics.reduce((sum, m) => sum + (m.fallbackUsageRate * m.totalCalls) / 100, 0);
    const totalResponseTime = allMetrics.reduce((sum, m) => sum + m.averageResponseTime * m.totalCalls, 0);

    const errorRate = totalCalls > 0 ? (totalErrors / totalCalls) * 100 : 0;
    const fallbackUsageRate = totalCalls > 0 ? (totalFallbacks / totalCalls) * 100 : 0;
    const averageResponseTime = totalCalls > 0 ? totalResponseTime / totalCalls : 0;

    const alerts: string[] = [];

    if (errorRate > 5) {
      alerts.push(`High error rate: ${errorRate.toFixed(1)}% (threshold: 5%)`);
    }

    if (averageResponseTime > 2000) {
      alerts.push(`Slow response time: ${averageResponseTime.toFixed(0)}ms (threshold: 2000ms)`);
    }

    if (fallbackUsageRate > 20) {
      alerts.push(`High fallback usage: ${fallbackUsageRate.toFixed(1)}% (threshold: 20%)`);
    }

    return {
      healthy: alerts.length === 0,
      errorRate,
      averageResponseTime,
      fallbackUsageRate,
      alerts,
    };
  }

  /**
   * Clear old metrics (run periodically)
   */
  clearOldMetrics(olderThanMinutes: number = 1440): void {
    const cutoffTime = new Date(Date.now() - olderThanMinutes * 60 * 1000);
    const beforeCount = this.metrics.length;
    this.metrics = this.metrics.filter((m) => m.timestamp >= cutoffTime);
    const afterCount = this.metrics.length;

    if (beforeCount !== afterCount) {
      this.logger.log(`Cleared ${beforeCount - afterCount} old metrics`);
    }
  }

  /**
   * Get all metrics (for export/analysis)
   */
  getAllMetrics(): AIMetric[] {
    return [...this.metrics];
  }

  /**
   * Get metrics count
   */
  getMetricsCount(): number {
    return this.metrics.length;
  }

  /**
   * Get cost estimate for OpenAI API call
   * Based on model and token usage
   */
  estimateOpenAICost(model: string, inputTokens: number, outputTokens: number): number {
    // Pricing as of 2024 (approximate)
    const pricing: Record<string, { input: number; output: number }> = {
      'gpt-4o-mini': { input: 0.15 / 1_000_000, output: 0.6 / 1_000_000 }, // per token
      'gpt-4': { input: 30 / 1_000_000, output: 60 / 1_000_000 },
      'gpt-3.5-turbo': { input: 0.5 / 1_000_000, output: 1.5 / 1_000_000 },
    };

    const modelPricing = pricing[model] || pricing['gpt-4o-mini'];
    const inputCost = inputTokens * modelPricing.input;
    const outputCost = outputTokens * modelPricing.output;

    return inputCost + outputCost;
  }
}

