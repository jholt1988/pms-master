import { Test, TestingModule } from '@nestjs/testing';
import { AILeaseRenewalMetricsService } from './ai-lease-renewal-metrics.service';

describe('AILeaseRenewalMetricsService', () => {
  let service: AILeaseRenewalMetricsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AILeaseRenewalMetricsService],
    }).compile();

    service = module.get<AILeaseRenewalMetricsService>(AILeaseRenewalMetricsService);
  });

  describe('recordMetric', () => {
    it('should record a metric with timestamp', () => {
      const beforeTime = Date.now();
      service.recordMetric({
        operation: 'predictRenewalLikelihood',
        success: true,
        responseTime: 500,
        leaseId: 1,
        renewalProbability: 0.75,
      });
      const afterTime = Date.now();

      const metrics = service.getRecentMetrics(1);
      expect(metrics).toHaveLength(1);
      expect(metrics[0].operation).toBe('predictRenewalLikelihood');
      expect(metrics[0].success).toBe(true);
      expect(metrics[0].responseTime).toBe(500);
      expect(metrics[0].leaseId).toBe(1);
      expect(metrics[0].renewalProbability).toBe(0.75);
      expect(metrics[0].timestamp).toBeInstanceOf(Date);
      expect(metrics[0].timestamp.getTime()).toBeGreaterThanOrEqual(beforeTime);
      expect(metrics[0].timestamp.getTime()).toBeLessThanOrEqual(afterTime);
    });

    it('should record multiple metrics', () => {
      service.recordMetric({
        operation: 'predictRenewalLikelihood',
        success: true,
        responseTime: 500,
        leaseId: 1,
        renewalProbability: 0.75,
      });
      service.recordMetric({
        operation: 'getRentAdjustment',
        success: true,
        responseTime: 1200,
        leaseId: 2,
        rentAdjustmentPercentage: 3.5,
        mlServiceUsed: true,
      });
      service.recordMetric({
        operation: 'generatePersonalizedOffer',
        success: false,
        responseTime: 0,
        leaseId: 3,
        error: 'Lease not found',
      });

      const metrics = service.getMetrics();
      expect(metrics.totalCalls).toBe(3);
      expect(metrics.successfulCalls).toBe(2);
      expect(metrics.failedCalls).toBe(1);
    });

    it('should limit metrics history to maxMetricsHistory', () => {
      // Record more than maxMetricsHistory metrics
      for (let i = 0; i < 10050; i++) {
        service.recordMetric({
          operation: 'predictRenewalLikelihood',
          success: true,
          responseTime: 500,
        });
      }

      const metrics = service.getMetrics();
      expect(metrics.totalCalls).toBe(10000); // Should be capped at maxMetricsHistory
    });
  });

  describe('getMetrics', () => {
    beforeEach(() => {
      service.clearOldMetrics(0);
    });

    it('should return empty metrics when no metrics recorded', () => {
      const metrics = service.getMetrics();

      expect(metrics.totalCalls).toBe(0);
      expect(metrics.successfulCalls).toBe(0);
      expect(metrics.failedCalls).toBe(0);
      expect(metrics.averageResponseTime).toBe(0);
      expect(metrics.mlServiceAvailabilityRate).toBe(0);
      expect(metrics.cacheHitRate).toBe(0);
    });

    it('should calculate correct aggregate metrics', () => {
      // Record various metrics
      service.recordMetric({
        operation: 'predictRenewalLikelihood',
        success: true,
        responseTime: 500,
        leaseId: 1,
        renewalProbability: 0.75,
      });
      service.recordMetric({
        operation: 'getRentAdjustment',
        success: true,
        responseTime: 1200,
        leaseId: 2,
        rentAdjustmentPercentage: 3.5,
        mlServiceUsed: true,
      });
      service.recordMetric({
        operation: 'getRentAdjustment',
        success: true,
        responseTime: 800,
        leaseId: 3,
        rentAdjustmentPercentage: 2.0,
        mlServiceUsed: false,
        cacheHit: true,
      });
      service.recordMetric({
        operation: 'generatePersonalizedOffer',
        success: false,
        responseTime: 0,
        leaseId: 4,
        error: 'Error',
      });

      const metrics = service.getMetrics();

      expect(metrics.totalCalls).toBe(4);
      expect(metrics.successfulCalls).toBe(3);
      expect(metrics.failedCalls).toBe(1);
      expect(metrics.averageResponseTime).toBe((500 + 1200 + 800 + 0) / 4);
      expect(metrics.mlServiceAvailabilityRate).toBe(1.0); // 1 out of 1 ML service calls succeeded
      expect(metrics.cacheHitRate).toBe(0.5); // 1 out of 2 cacheable calls hit cache
    });

    it('should calculate operation-specific metrics correctly', () => {
      // Record prediction metrics
      service.recordMetric({
        operation: 'predictRenewalLikelihood',
        success: true,
        responseTime: 500,
        leaseId: 1,
        renewalProbability: 0.85,
      });
      service.recordMetric({
        operation: 'predictRenewalLikelihood',
        success: true,
        responseTime: 600,
        leaseId: 2,
        renewalProbability: 0.25,
      });
      service.recordMetric({
        operation: 'predictRenewalLikelihood',
        success: false,
        responseTime: 0,
        leaseId: 3,
        error: 'Error',
      });

      // Record rent adjustment metrics
      service.recordMetric({
        operation: 'getRentAdjustment',
        success: true,
        responseTime: 1200,
        leaseId: 4,
        rentAdjustmentPercentage: 3.5,
        mlServiceUsed: true,
      });
      service.recordMetric({
        operation: 'getRentAdjustment',
        success: true,
        responseTime: 100,
        leaseId: 5,
        rentAdjustmentPercentage: 2.0,
        mlServiceUsed: false,
        cacheHit: true,
      });

      const metrics = service.getMetrics();

      // Prediction metrics
      expect(metrics.operations.predictRenewalLikelihood.total).toBe(3);
      expect(metrics.operations.predictRenewalLikelihood.successful).toBe(2);
      expect(metrics.operations.predictRenewalLikelihood.averageResponseTime).toBe((500 + 600 + 0) / 3);
      expect(metrics.operations.predictRenewalLikelihood.averageProbability).toBe((0.85 + 0.25) / 2);
      expect(metrics.operations.predictRenewalLikelihood.highProbabilityCount).toBe(1); // > 0.7
      expect(metrics.operations.predictRenewalLikelihood.lowProbabilityCount).toBe(1); // < 0.3

      // Rent adjustment metrics
      expect(metrics.operations.getRentAdjustment.total).toBe(2);
      expect(metrics.operations.getRentAdjustment.successful).toBe(2);
      expect(metrics.operations.getRentAdjustment.averageResponseTime).toBe((1200 + 100) / 2);
      expect(metrics.operations.getRentAdjustment.averageAdjustmentPercentage).toBe((3.5 + 2.0) / 2);
      expect(metrics.operations.getRentAdjustment.mlServiceUsed).toBe(1);
      expect(metrics.operations.getRentAdjustment.fallbackUsed).toBe(1);
      expect(metrics.operations.getRentAdjustment.cacheHits).toBe(1);
    });
  });

  describe('getOperationMetrics', () => {
    beforeEach(() => {
      service.clearOldMetrics(0);
    });

    it('should return metrics for predictRenewalLikelihood operation', () => {
      service.recordMetric({
        operation: 'predictRenewalLikelihood',
        success: true,
        responseTime: 500,
        leaseId: 1,
        renewalProbability: 0.75,
      });
      service.recordMetric({
        operation: 'predictRenewalLikelihood',
        success: false,
        responseTime: 0,
        leaseId: 2,
        error: 'Error',
      });

      const metrics = service.getOperationMetrics('predictRenewalLikelihood');

      expect(metrics.total).toBe(2);
      expect(metrics.successful).toBe(1);
      expect(metrics.failed).toBe(1);
      expect(metrics.averageResponseTime).toBe(250);
    });

    it('should return empty metrics for operation with no data', () => {
      const metrics = service.getOperationMetrics('generatePersonalizedOffer');

      expect(metrics.total).toBe(0);
      expect(metrics.successful).toBe(0);
      expect(metrics.failed).toBe(0);
      expect(metrics.averageResponseTime).toBe(0);
    });
  });

  describe('clearOldMetrics', () => {
    it('should clear metrics when count exceeds keepLast', () => {
      // Record 10 metrics
      for (let i = 0; i < 10; i++) {
        service.recordMetric({
          operation: 'predictRenewalLikelihood',
          success: true,
          responseTime: 500,
        });
      }

      expect(service.getMetrics().totalCalls).toBe(10);

      // Clear to keep only last 5
      service.clearOldMetrics(5);

      expect(service.getMetrics().totalCalls).toBe(5);
    });

    it('should not clear metrics when count is below keepLast', () => {
      // Record 3 metrics
      for (let i = 0; i < 3; i++) {
        service.recordMetric({
          operation: 'predictRenewalLikelihood',
          success: true,
          responseTime: 500,
        });
      }

      expect(service.getMetrics().totalCalls).toBe(3);

      // Try to clear to keep last 5 (should do nothing)
      service.clearOldMetrics(5);

      expect(service.getMetrics().totalCalls).toBe(3);
    });
  });

  describe('getRecentMetrics', () => {
    beforeEach(() => {
      service.clearOldMetrics(0);
    });

    it('should return recent metrics up to count', () => {
      // Record 10 metrics
      for (let i = 0; i < 10; i++) {
        service.recordMetric({
          operation: 'predictRenewalLikelihood',
          success: true,
          responseTime: 500 + i,
        });
      }

      const recent = service.getRecentMetrics(5);

      expect(recent).toHaveLength(5);
      // Should return last 5 (indices 5-9)
      expect(recent[0].responseTime).toBe(505);
      expect(recent[4].responseTime).toBe(509);
    });

    it('should return all metrics if count exceeds total', () => {
      // Record 3 metrics
      for (let i = 0; i < 3; i++) {
        service.recordMetric({
          operation: 'predictRenewalLikelihood',
          success: true,
          responseTime: 500,
        });
      }

      const recent = service.getRecentMetrics(10);

      expect(recent).toHaveLength(3);
    });

    it('should return empty array when no metrics', () => {
      const recent = service.getRecentMetrics(10);

      expect(recent).toHaveLength(0);
    });
  });
});

