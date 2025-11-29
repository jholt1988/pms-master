import { Test, TestingModule } from '@nestjs/testing';
import { AIMaintenanceMetricsService } from './ai-maintenance-metrics.service';

describe('AIMaintenanceMetricsService', () => {
  let service: AIMaintenanceMetricsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AIMaintenanceMetricsService],
    }).compile();

    service = module.get<AIMaintenanceMetricsService>(AIMaintenanceMetricsService);
  });

  describe('recordMetric', () => {
    it('should record a metric with timestamp', () => {
      const beforeTime = Date.now();
      service.recordMetric({
        operation: 'assignPriority',
        success: true,
        responseTime: 500,
        fallbackUsed: false,
      });
      const afterTime = Date.now();

      const metrics = service.getRecentMetrics(1);
      expect(metrics).toHaveLength(1);
      expect(metrics[0].operation).toBe('assignPriority');
      expect(metrics[0].success).toBe(true);
      expect(metrics[0].responseTime).toBe(500);
      expect(metrics[0].fallbackUsed).toBe(false);
      expect(metrics[0].timestamp).toBeInstanceOf(Date);
      expect(metrics[0].timestamp.getTime()).toBeGreaterThanOrEqual(beforeTime);
      expect(metrics[0].timestamp.getTime()).toBeLessThanOrEqual(afterTime);
    });

    it('should record multiple metrics', () => {
      service.recordMetric({
        operation: 'assignPriority',
        success: true,
        responseTime: 500,
      });
      service.recordMetric({
        operation: 'assignTechnician',
        success: true,
        responseTime: 1200,
        requestId: 1,
      });
      service.recordMetric({
        operation: 'predictSLABreach',
        success: true,
        responseTime: 800,
        requestId: 2,
      });

      const metrics = service.getMetrics();
      expect(metrics.totalCalls).toBe(3);
      expect(metrics.successfulCalls).toBe(3);
      expect(metrics.failedCalls).toBe(0);
    });

    it('should record failed metrics', () => {
      service.recordMetric({
        operation: 'assignPriority',
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
          operation: 'assignPriority',
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
      expect(metrics.fallbackUsageRate).toBe(0);
    });

    it('should calculate correct aggregate metrics', () => {
      // Record various metrics
      service.recordMetric({
        operation: 'assignPriority',
        success: true,
        responseTime: 500,
        fallbackUsed: false,
      });
      service.recordMetric({
        operation: 'assignPriority',
        success: true,
        responseTime: 600,
        fallbackUsed: true, // Fallback used
      });
      service.recordMetric({
        operation: 'assignTechnician',
        success: true,
        responseTime: 1200,
      });
      service.recordMetric({
        operation: 'predictSLABreach',
        success: false,
        responseTime: 0,
        error: 'Error',
      });

      const metrics = service.getMetrics();

      expect(metrics.totalCalls).toBe(4);
      expect(metrics.successfulCalls).toBe(3);
      expect(metrics.failedCalls).toBe(1);
      expect(metrics.averageResponseTime).toBe((500 + 600 + 1200 + 0) / 4);
      expect(metrics.fallbackUsageRate).toBe(0.25); // 1 out of 4 used fallback
    });

    it('should calculate operation-specific metrics correctly', () => {
      // Record priority metrics
      service.recordMetric({
        operation: 'assignPriority',
        success: true,
        responseTime: 500,
        fallbackUsed: false,
      });
      service.recordMetric({
        operation: 'assignPriority',
        success: true,
        responseTime: 600,
        fallbackUsed: true,
      });
      service.recordMetric({
        operation: 'assignPriority',
        success: false,
        responseTime: 0,
        fallbackUsed: true,
        error: 'Error',
      });

      // Record technician metrics
      service.recordMetric({
        operation: 'assignTechnician',
        success: true,
        responseTime: 1200,
      });
      service.recordMetric({
        operation: 'assignTechnician',
        success: true,
        responseTime: 1500,
      });

      // Record SLA metrics
      service.recordMetric({
        operation: 'predictSLABreach',
        success: true,
        responseTime: 800,
      });

      const metrics = service.getMetrics();

      // Priority metrics
      expect(metrics.operations.assignPriority.total).toBe(3);
      expect(metrics.operations.assignPriority.successful).toBe(2);
      expect(metrics.operations.assignPriority.averageResponseTime).toBe((500 + 600 + 0) / 3);
      expect(metrics.operations.assignPriority.fallbackRate).toBe(2 / 3); // 2 out of 3 used fallback

      // Technician metrics
      expect(metrics.operations.assignTechnician.total).toBe(2);
      expect(metrics.operations.assignTechnician.successful).toBe(2);
      expect(metrics.operations.assignTechnician.averageResponseTime).toBe((1200 + 1500) / 2);

      // SLA metrics
      expect(metrics.operations.predictSLABreach.total).toBe(1);
      expect(metrics.operations.predictSLABreach.successful).toBe(1);
      expect(metrics.operations.predictSLABreach.averageResponseTime).toBe(800);
    });
  });

  describe('getOperationMetrics', () => {
    beforeEach(() => {
      service.clearOldMetrics(0);
    });

    it('should return metrics for assignPriority operation', () => {
      service.recordMetric({
        operation: 'assignPriority',
        success: true,
        responseTime: 500,
        fallbackUsed: false,
      });
      service.recordMetric({
        operation: 'assignPriority',
        success: true,
        responseTime: 600,
        fallbackUsed: true,
      });

      const metrics = service.getOperationMetrics('assignPriority');

      expect(metrics.total).toBe(2);
      expect(metrics.successful).toBe(2);
      expect(metrics.failed).toBe(0);
      expect(metrics.averageResponseTime).toBe(550);
      expect(metrics.fallbackRate).toBe(0.5);
    });

    it('should return metrics for assignTechnician operation', () => {
      service.recordMetric({
        operation: 'assignTechnician',
        success: true,
        responseTime: 1200,
      });
      service.recordMetric({
        operation: 'assignTechnician',
        success: false,
        responseTime: 0,
        error: 'Error',
      });

      const metrics = service.getOperationMetrics('assignTechnician');

      expect(metrics.total).toBe(2);
      expect(metrics.successful).toBe(1);
      expect(metrics.failed).toBe(1);
      expect(metrics.averageResponseTime).toBe(600);
      expect(metrics.fallbackRate).toBeUndefined(); // Not applicable for technician
    });

    it('should return empty metrics for operation with no data', () => {
      const metrics = service.getOperationMetrics('predictSLABreach');

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
          operation: 'assignPriority',
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
          operation: 'assignPriority',
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
          operation: 'assignPriority',
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
          operation: 'assignPriority',
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

