import { Test, TestingModule } from '@nestjs/testing';
import { AIPaymentMetricsService } from './ai-payment-metrics.service';

describe('AIPaymentMetricsService', () => {
  let service: AIPaymentMetricsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AIPaymentMetricsService],
    }).compile();

    service = module.get<AIPaymentMetricsService>(AIPaymentMetricsService);
  });

  describe('recordMetric', () => {
    it('should record a metric with timestamp', () => {
      const beforeTime = Date.now();
      service.recordMetric({
        operation: 'assessPaymentRisk',
        success: true,
        responseTime: 500,
        tenantId: 1,
        invoiceId: 10,
      });
      const afterTime = Date.now();

      const metrics = service.getRecentMetrics(1);
      expect(metrics).toHaveLength(1);
      expect(metrics[0].operation).toBe('assessPaymentRisk');
      expect(metrics[0].success).toBe(true);
      expect(metrics[0].responseTime).toBe(500);
      expect(metrics[0].tenantId).toBe(1);
      expect(metrics[0].invoiceId).toBe(10);
      expect(metrics[0].timestamp).toBeInstanceOf(Date);
      expect(metrics[0].timestamp.getTime()).toBeGreaterThanOrEqual(beforeTime);
      expect(metrics[0].timestamp.getTime()).toBeLessThanOrEqual(afterTime);
    });

    it('should record multiple metrics', () => {
      service.recordMetric({
        operation: 'assessPaymentRisk',
        success: true,
        responseTime: 500,
        tenantId: 1,
        invoiceId: 10,
      });
      service.recordMetric({
        operation: 'determineReminderTiming',
        success: true,
        responseTime: 1200,
        tenantId: 2,
        invoiceId: 20,
      });
      service.recordMetric({
        operation: 'assessPaymentRisk',
        success: false,
        responseTime: 0,
        tenantId: 3,
        invoiceId: 30,
        error: 'API timeout',
      });

      const metrics = service.getMetrics();
      expect(metrics.totalCalls).toBe(3);
      expect(metrics.successfulCalls).toBe(2);
      expect(metrics.failedCalls).toBe(1);
    });

    it('should record failed metrics', () => {
      service.recordMetric({
        operation: 'assessPaymentRisk',
        success: false,
        responseTime: 0,
        error: 'API timeout',
      });

      const metrics = service.getMetrics();
      expect(metrics.totalCalls).toBe(1);
      expect(metrics.successfulCalls).toBe(0);
      expect(metrics.failedCalls).toBe(1);
    });

    it('should limit metrics history to maxMetricsHistory', () => {
      // Record more than maxMetricsHistory metrics
      for (let i = 0; i < 10050; i++) {
        service.recordMetric({
          operation: 'assessPaymentRisk',
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
      // Clear any existing metrics
      service.clearOldMetrics(0);
    });

    it('should return empty metrics when no metrics recorded', () => {
      const metrics = service.getMetrics();

      expect(metrics.totalCalls).toBe(0);
      expect(metrics.successfulCalls).toBe(0);
      expect(metrics.failedCalls).toBe(0);
      expect(metrics.averageResponseTime).toBe(0);
    });

    it('should calculate correct aggregate metrics', () => {
      // Record various metrics
      service.recordMetric({
        operation: 'assessPaymentRisk',
        success: true,
        responseTime: 500,
        tenantId: 1,
        invoiceId: 10,
      });
      service.recordMetric({
        operation: 'assessPaymentRisk',
        success: true,
        responseTime: 600,
        tenantId: 2,
        invoiceId: 20,
      });
      service.recordMetric({
        operation: 'determineReminderTiming',
        success: true,
        responseTime: 1200,
        tenantId: 3,
        invoiceId: 30,
      });
      service.recordMetric({
        operation: 'determineReminderTiming',
        success: false,
        responseTime: 0,
        tenantId: 4,
        invoiceId: 40,
        error: 'Error',
      });

      const metrics = service.getMetrics();

      expect(metrics.totalCalls).toBe(4);
      expect(metrics.successfulCalls).toBe(3);
      expect(metrics.failedCalls).toBe(1);
      expect(metrics.averageResponseTime).toBe((500 + 600 + 1200 + 0) / 4);
    });

    it('should calculate operation-specific metrics correctly', () => {
      // Record risk assessment metrics
      service.recordMetric({
        operation: 'assessPaymentRisk',
        success: true,
        responseTime: 500,
        tenantId: 1,
        invoiceId: 10,
      });
      service.recordMetric({
        operation: 'assessPaymentRisk',
        success: true,
        responseTime: 600,
        tenantId: 2,
        invoiceId: 20,
      });
      service.recordMetric({
        operation: 'assessPaymentRisk',
        success: false,
        responseTime: 0,
        tenantId: 3,
        invoiceId: 30,
        error: 'Error',
      });

      // Record reminder timing metrics
      service.recordMetric({
        operation: 'determineReminderTiming',
        success: true,
        responseTime: 1200,
        tenantId: 4,
        invoiceId: 40,
      });
      service.recordMetric({
        operation: 'determineReminderTiming',
        success: true,
        responseTime: 1500,
        tenantId: 5,
        invoiceId: 50,
      });

      const metrics = service.getMetrics();

      // Risk assessment metrics
      expect(metrics.operations.assessPaymentRisk.total).toBe(3);
      expect(metrics.operations.assessPaymentRisk.successful).toBe(2);
      expect(metrics.operations.assessPaymentRisk.averageResponseTime).toBe((500 + 600 + 0) / 3);

      // Reminder timing metrics
      expect(metrics.operations.determineReminderTiming.total).toBe(2);
      expect(metrics.operations.determineReminderTiming.successful).toBe(2);
      expect(metrics.operations.determineReminderTiming.averageResponseTime).toBe((1200 + 1500) / 2);
    });
  });

  describe('getOperationMetrics', () => {
    beforeEach(() => {
      service.clearOldMetrics(0);
    });

    it('should return metrics for assessPaymentRisk operation', () => {
      service.recordMetric({
        operation: 'assessPaymentRisk',
        success: true,
        responseTime: 500,
        tenantId: 1,
        invoiceId: 10,
      });
      service.recordMetric({
        operation: 'assessPaymentRisk',
        success: false,
        responseTime: 0,
        tenantId: 2,
        invoiceId: 20,
        error: 'Error',
      });

      const metrics = service.getOperationMetrics('assessPaymentRisk');

      expect(metrics.total).toBe(2);
      expect(metrics.successful).toBe(1);
      expect(metrics.failed).toBe(1);
      expect(metrics.averageResponseTime).toBe(250);
    });

    it('should return metrics for determineReminderTiming operation', () => {
      service.recordMetric({
        operation: 'determineReminderTiming',
        success: true,
        responseTime: 1200,
        tenantId: 1,
        invoiceId: 10,
      });
      service.recordMetric({
        operation: 'determineReminderTiming',
        success: true,
        responseTime: 1500,
        tenantId: 2,
        invoiceId: 20,
      });

      const metrics = service.getOperationMetrics('determineReminderTiming');

      expect(metrics.total).toBe(2);
      expect(metrics.successful).toBe(2);
      expect(metrics.failed).toBe(0);
      expect(metrics.averageResponseTime).toBe(1350);
    });

    it('should return empty metrics for operation with no data', () => {
      const metrics = service.getOperationMetrics('assessPaymentRisk');

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
          operation: 'assessPaymentRisk',
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
          operation: 'assessPaymentRisk',
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
          operation: 'assessPaymentRisk',
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
          operation: 'assessPaymentRisk',
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

