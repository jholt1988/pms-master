import { Test, TestingModule } from '@nestjs/testing';
import { WorkflowMetricsService } from './workflow-metrics.service';

describe('WorkflowMetricsService', () => {
  let service: WorkflowMetricsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WorkflowMetricsService],
    }).compile();

    service = module.get<WorkflowMetricsService>(WorkflowMetricsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Metric Recording', () => {
    it('should record workflow metric', () => {
      service.recordMetric({
        workflowId: 'test-workflow',
        executionId: 'exec-1',
        status: 'COMPLETED',
        duration: 1000,
        stepCount: 3,
        failedStepCount: 0,
      });

      const metrics = service.getWorkflowMetrics('test-workflow', 60);
      expect(metrics.totalExecutions).toBe(1);
      expect(metrics.successfulExecutions).toBe(1);
    });

    it('should record failed workflow metric', () => {
      service.recordMetric({
        workflowId: 'test-workflow',
        executionId: 'exec-2',
        status: 'FAILED',
        duration: 500,
        stepCount: 2,
        failedStepCount: 1,
        errorCode: 'STEP_EXECUTION_FAILED',
      });

      const metrics = service.getWorkflowMetrics('test-workflow', 60);
      expect(metrics.totalExecutions).toBe(1);
      expect(metrics.failedExecutions).toBe(1);
      expect(metrics.errorRate).toBe(100);
    });
  });

  describe('Workflow Metrics', () => {
    beforeEach(() => {
      // Record multiple metrics
      service.recordMetric({
        workflowId: 'test-workflow',
        executionId: 'exec-1',
        status: 'COMPLETED',
        duration: 1000,
        stepCount: 3,
        failedStepCount: 0,
      });

      service.recordMetric({
        workflowId: 'test-workflow',
        executionId: 'exec-2',
        status: 'COMPLETED',
        duration: 2000,
        stepCount: 4,
        failedStepCount: 0,
      });

      service.recordMetric({
        workflowId: 'test-workflow',
        executionId: 'exec-3',
        status: 'FAILED',
        duration: 500,
        stepCount: 2,
        failedStepCount: 1,
        errorCode: 'STEP_EXECUTION_FAILED',
      });
    });

    it('should calculate correct metrics', () => {
      const metrics = service.getWorkflowMetrics('test-workflow', 60);

      expect(metrics.totalExecutions).toBe(3);
      expect(metrics.successfulExecutions).toBe(2);
      expect(metrics.failedExecutions).toBe(1);
      expect(metrics.averageDuration).toBeCloseTo(1166.67, 1);
      expect(metrics.averageStepCount).toBeCloseTo(3, 0);
      expect(metrics.errorRate).toBeCloseTo(33.33, 1);
      expect(metrics.mostCommonError).toBe('STEP_EXECUTION_FAILED');
    });

    it('should filter by time window', () => {
      // Record old metric (outside window)
      const oldDate = new Date(Date.now() - 120 * 60 * 1000); // 120 minutes ago
      service.recordMetric({
        workflowId: 'test-workflow',
        executionId: 'exec-old',
        status: 'COMPLETED',
        duration: 1000,
        stepCount: 3,
        failedStepCount: 0,
        timestamp: oldDate,
      } as any);

      const metrics = service.getWorkflowMetrics('test-workflow', 60);
      // Should only include recent metrics
      expect(metrics.totalExecutions).toBe(3); // Not 4
    });

    it('should return empty metrics for non-existent workflow', () => {
      const metrics = service.getWorkflowMetrics('non-existent', 60);

      expect(metrics.totalExecutions).toBe(0);
      expect(metrics.successfulExecutions).toBe(0);
      expect(metrics.failedExecutions).toBe(0);
      expect(metrics.averageDuration).toBe(0);
    });
  });

  describe('Overall Health', () => {
    it('should report healthy when all metrics are good', () => {
      // Record successful executions
      for (let i = 0; i < 10; i++) {
        service.recordMetric({
          workflowId: `workflow-${i}`,
          executionId: `exec-${i}`,
          status: 'COMPLETED',
          duration: 1000,
          stepCount: 3,
          failedStepCount: 0,
        });
      }

      const health = service.getOverallHealth(60);

      expect(health.healthy).toBe(true);
      expect(health.totalExecutions).toBe(10);
      expect(health.successRate).toBe(100);
      expect(health.errorRate).toBe(0);
      expect(health.alerts).toHaveLength(0);
    });

    it('should report unhealthy with alerts when metrics are bad', () => {
      // Record mostly failed executions
      for (let i = 0; i < 10; i++) {
        service.recordMetric({
          workflowId: 'test-workflow',
          executionId: `exec-${i}`,
          status: i < 8 ? 'FAILED' : 'COMPLETED', // 80% failure rate
          duration: 50000, // Slow
          stepCount: 3,
          failedStepCount: i < 8 ? 1 : 0,
          errorCode: 'STEP_EXECUTION_FAILED',
        });
      }

      const health = service.getOverallHealth(60);

      expect(health.healthy).toBe(false);
      expect(health.errorRate).toBeGreaterThan(10);
      expect(health.alerts.length).toBeGreaterThan(0);
      expect(health.alerts.some(a => a.includes('error rate'))).toBe(true);
    });

    it('should alert on slow execution times', () => {
      service.recordMetric({
        workflowId: 'test-workflow',
        executionId: 'exec-1',
        status: 'COMPLETED',
        duration: 40000, // 40 seconds - slow
        stepCount: 3,
        failedStepCount: 0,
      });

      const health = service.getOverallHealth(60);

      expect(health.alerts.some(a => a.includes('Slow average'))).toBe(true);
    });
  });

  describe('All Workflow Metrics', () => {
    it('should return metrics for all workflows', () => {
      service.recordMetric({
        workflowId: 'workflow-1',
        executionId: 'exec-1',
        status: 'COMPLETED',
        duration: 1000,
        stepCount: 3,
        failedStepCount: 0,
      });

      service.recordMetric({
        workflowId: 'workflow-2',
        executionId: 'exec-2',
        status: 'COMPLETED',
        duration: 2000,
        stepCount: 4,
        failedStepCount: 0,
      });

      const allMetrics = service.getAllWorkflowMetrics(60);

      expect(allMetrics).toHaveLength(2);
      expect(allMetrics.find(m => m.workflowId === 'workflow-1')).toBeDefined();
      expect(allMetrics.find(m => m.workflowId === 'workflow-2')).toBeDefined();
    });
  });

  describe('Cache Management', () => {
    it('should limit metrics history size', () => {
      // Record more than maxMetricsHistory (5000)
      for (let i = 0; i < 6000; i++) {
        service.recordMetric({
          workflowId: 'test-workflow',
          executionId: `exec-${i}`,
          status: 'COMPLETED',
          duration: 1000,
          stepCount: 3,
          failedStepCount: 0,
        });
      }

      const metrics = service.getWorkflowMetrics('test-workflow', 60);
      // Should only keep last 5000
      expect(metrics.totalExecutions).toBeLessThanOrEqual(5000);
    });

    it('should clear old metrics', () => {
      // Record old metric
      const oldDate = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000); // 8 days ago
      service.recordMetric({
        workflowId: 'test-workflow',
        executionId: 'exec-old',
        status: 'COMPLETED',
        duration: 1000,
        stepCount: 3,
        failedStepCount: 0,
        timestamp: oldDate,
      } as any);

      // Record recent metric
      service.recordMetric({
        workflowId: 'test-workflow',
        executionId: 'exec-recent',
        status: 'COMPLETED',
        duration: 1000,
        stepCount: 3,
        failedStepCount: 0,
      });

      // Clear metrics older than 7 days
      service.clearOldMetrics(7);

      const metrics = service.getWorkflowMetrics('test-workflow', 60);
      // Should only have recent metric
      expect(metrics.totalExecutions).toBe(1);
    });
  });
});

