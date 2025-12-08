import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * P0-005: Performance Monitoring Middleware
 * Tracks API response times, request rates, and error rates
 */
@Injectable()
export class PerformanceMiddleware implements NestMiddleware {
  private readonly logger = new Logger(PerformanceMiddleware.name);
  private readonly metrics = {
    requestCount: 0,
    totalResponseTime: 0,
    errorCount: 0,
    requestsByEndpoint: new Map<string, { count: number; totalTime: number; errors: number }>(),
  };

  use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();
    const endpoint = `${req.method} ${req.path}`;

    // Increment request count
    this.metrics.requestCount++;

    // Track endpoint metrics
    if (!this.metrics.requestsByEndpoint.has(endpoint)) {
      this.metrics.requestsByEndpoint.set(endpoint, { count: 0, totalTime: 0, errors: 0 });
    }
    const endpointMetrics = this.metrics.requestsByEndpoint.get(endpoint)!;
    endpointMetrics.count++;

    // Track response
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      this.metrics.totalResponseTime += duration;
      endpointMetrics.totalTime += duration;

      // Track errors (4xx and 5xx)
      if (res.statusCode >= 400) {
        this.metrics.errorCount++;
        endpointMetrics.errors++;
      }

      // Log slow requests (>1 second)
      if (duration > 1000) {
        this.logger.warn(`Slow request detected: ${endpoint} took ${duration}ms`, {
          endpoint,
          duration,
          statusCode: res.statusCode,
          method: req.method,
        });
      }

      // Log performance metrics periodically (every 100 requests)
      if (this.metrics.requestCount % 100 === 0) {
        this.logPerformanceMetrics();
      }
    });

    next();
  }

  /**
   * Get current performance metrics
   */
  getMetrics() {
    const avgResponseTime = this.metrics.requestCount > 0
      ? this.metrics.totalResponseTime / this.metrics.requestCount
      : 0;

    const errorRate = this.metrics.requestCount > 0
      ? (this.metrics.errorCount / this.metrics.requestCount) * 100
      : 0;

    const endpointStats = Array.from(this.metrics.requestsByEndpoint.entries()).map(([endpoint, stats]) => ({
      endpoint,
      count: stats.count,
      avgResponseTime: stats.count > 0 ? stats.totalTime / stats.count : 0,
      errorRate: stats.count > 0 ? (stats.errors / stats.count) * 100 : 0,
    }));

    return {
      totalRequests: this.metrics.requestCount,
      averageResponseTime: avgResponseTime,
      errorRate,
      endpointStats,
    };
  }

  /**
   * Log performance metrics
   */
  private logPerformanceMetrics() {
    const metrics = this.getMetrics();
    this.logger.log('Performance Metrics', {
      totalRequests: metrics.totalRequests,
      averageResponseTime: `${metrics.averageResponseTime.toFixed(2)}ms`,
      errorRate: `${metrics.errorRate.toFixed(2)}%`,
      topEndpoints: metrics.endpointStats
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
    });
  }

  /**
   * Reset metrics (useful for testing)
   */
  resetMetrics() {
    this.metrics.requestCount = 0;
    this.metrics.totalResponseTime = 0;
    this.metrics.errorCount = 0;
    this.metrics.requestsByEndpoint.clear();
  }
}

