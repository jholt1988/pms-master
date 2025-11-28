import { WorkflowStep } from './workflow.types';
import { buildStepGraph, topologicalSort, canRunInParallel } from './workflow-parallel-executor';

describe('WorkflowParallelExecutor', () => {
  describe('buildStepGraph', () => {
    it('should build graph without dependencies', () => {
      const steps: WorkflowStep[] = [
        { id: 'step1', type: 'CREATE_LEASE' },
        { id: 'step2', type: 'SEND_EMAIL' },
      ];

      const graph = buildStepGraph(steps);

      expect(graph.size).toBe(2);
      expect(graph.get('step1')?.dependencies.size).toBe(0);
      expect(graph.get('step2')?.dependencies.size).toBe(0);
    });

    it('should build graph with dependencies', () => {
      const steps: WorkflowStep[] = [
        { id: 'step1', type: 'CREATE_LEASE' },
        { id: 'step2', type: 'SEND_EMAIL', dependsOn: ['step1'] },
        { id: 'step3', type: 'SCHEDULE_INSPECTION', dependsOn: ['step1'] },
      ];

      const graph = buildStepGraph(steps);

      expect(graph.get('step1')?.dependencies.size).toBe(0);
      expect(graph.get('step2')?.dependencies.size).toBe(1);
      expect(graph.get('step2')?.dependencies.has('step1')).toBe(true);
      expect(graph.get('step3')?.dependencies.size).toBe(1);
      expect(graph.get('step3')?.dependencies.has('step1')).toBe(true);
    });

    it('should build reverse dependencies (dependents)', () => {
      const steps: WorkflowStep[] = [
        { id: 'step1', type: 'CREATE_LEASE' },
        { id: 'step2', type: 'SEND_EMAIL', dependsOn: ['step1'] },
      ];

      const graph = buildStepGraph(steps);

      expect(graph.get('step1')?.dependents.size).toBe(1);
      expect(graph.get('step1')?.dependents.has('step2')).toBe(true);
      expect(graph.get('step2')?.dependents.size).toBe(0);
    });
  });

  describe('topologicalSort', () => {
    it('should sort steps without dependencies', () => {
      const steps: WorkflowStep[] = [
        { id: 'step1', type: 'CREATE_LEASE' },
        { id: 'step2', type: 'SEND_EMAIL' },
      ];

      const graph = buildStepGraph(steps);
      const executionGroups = topologicalSort(graph);

      expect(executionGroups.length).toBe(1);
      expect(executionGroups[0].length).toBe(2);
      expect(executionGroups[0].map((s) => s.id)).toContain('step1');
      expect(executionGroups[0].map((s) => s.id)).toContain('step2');
    });

    it('should sort steps with linear dependencies', () => {
      const steps: WorkflowStep[] = [
        { id: 'step1', type: 'CREATE_LEASE' },
        { id: 'step2', type: 'SEND_EMAIL', dependsOn: ['step1'] },
        { id: 'step3', type: 'SCHEDULE_INSPECTION', dependsOn: ['step2'] },
      ];

      const graph = buildStepGraph(steps);
      const executionGroups = topologicalSort(graph);

      expect(executionGroups.length).toBe(3);
      expect(executionGroups[0].map((s) => s.id)).toEqual(['step1']);
      expect(executionGroups[1].map((s) => s.id)).toEqual(['step2']);
      expect(executionGroups[2].map((s) => s.id)).toEqual(['step3']);
    });

    it('should sort steps with parallel branches', () => {
      const steps: WorkflowStep[] = [
        { id: 'step1', type: 'CREATE_LEASE' },
        { id: 'step2', type: 'SEND_EMAIL', dependsOn: ['step1'] },
        { id: 'step3', type: 'SCHEDULE_INSPECTION', dependsOn: ['step1'] },
        { id: 'step4', type: 'ASSIGN_TECHNICIAN', dependsOn: ['step2', 'step3'] },
      ];

      const graph = buildStepGraph(steps);
      const executionGroups = topologicalSort(graph);

      expect(executionGroups.length).toBe(3);
      expect(executionGroups[0].map((s) => s.id)).toEqual(['step1']);
      expect(executionGroups[1].length).toBe(2);
      expect(executionGroups[1].map((s) => s.id)).toContain('step2');
      expect(executionGroups[1].map((s) => s.id)).toContain('step3');
      expect(executionGroups[2].map((s) => s.id)).toEqual(['step4']);
    });

    it('should detect circular dependencies', () => {
      const steps: WorkflowStep[] = [
        { id: 'step1', type: 'CREATE_LEASE', dependsOn: ['step2'] },
        { id: 'step2', type: 'SEND_EMAIL', dependsOn: ['step1'] },
      ];

      const graph = buildStepGraph(steps);

      expect(() => topologicalSort(graph)).toThrow('Circular dependency detected');
    });

    it('should handle complex dependency graph', () => {
      const steps: WorkflowStep[] = [
        { id: 'step1', type: 'CREATE_LEASE' },
        { id: 'step2', type: 'SEND_EMAIL', dependsOn: ['step1'] },
        { id: 'step3', type: 'SCHEDULE_INSPECTION', dependsOn: ['step1'] },
        { id: 'step4', type: 'ASSIGN_TECHNICIAN', dependsOn: ['step2'] },
        { id: 'step5', type: 'SEND_NOTIFICATION', dependsOn: ['step3', 'step4'] },
      ];

      const graph = buildStepGraph(steps);
      const executionGroups = topologicalSort(graph);

      expect(executionGroups.length).toBe(4);
      expect(executionGroups[0].map((s) => s.id)).toEqual(['step1']);
      expect(executionGroups[1].length).toBe(2); // step2 and step3 in parallel
      expect(executionGroups[2].map((s) => s.id)).toEqual(['step4']);
      expect(executionGroups[3].map((s) => s.id)).toEqual(['step5']);
    });
  });

  describe('canRunInParallel', () => {
    it('should allow parallel execution for independent steps', () => {
      const step1: WorkflowStep = { id: 'step1', type: 'CREATE_LEASE' };
      const step2: WorkflowStep = { id: 'step2', type: 'SEND_EMAIL' };

      expect(canRunInParallel(step1, step2)).toBe(true);
    });

    it('should disallow parallel execution for dependent steps', () => {
      const step1: WorkflowStep = { id: 'step1', type: 'CREATE_LEASE' };
      const step2: WorkflowStep = { id: 'step2', type: 'SEND_EMAIL', dependsOn: ['step1'] };

      expect(canRunInParallel(step1, step2)).toBe(false);
    });

    it('should disallow parallel execution if explicitly disabled', () => {
      const step1: WorkflowStep = { id: 'step1', type: 'CREATE_LEASE', parallel: false };
      const step2: WorkflowStep = { id: 'step2', type: 'SEND_EMAIL' };

      expect(canRunInParallel(step1, step2)).toBe(false);
    });

    it('should allow parallel execution for steps with different dependencies', () => {
      const step1: WorkflowStep = { id: 'step1', type: 'CREATE_LEASE' };
      const step2: WorkflowStep = { id: 'step2', type: 'SEND_EMAIL', dependsOn: ['step1'] };
      const step3: WorkflowStep = { id: 'step3', type: 'SCHEDULE_INSPECTION', dependsOn: ['step1'] };

      // step2 and step3 both depend on step1, but not on each other
      expect(canRunInParallel(step2, step3)).toBe(true);
    });
  });
});

