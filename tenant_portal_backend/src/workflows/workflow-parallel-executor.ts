import { Logger } from '@nestjs/common';
import { WorkflowStep } from './workflow.types';

/**
 * Dependency graph node
 */
interface StepNode {
  step: WorkflowStep;
  dependencies: Set<string>;
  dependents: Set<string>;
}

/**
 * Build dependency graph from workflow steps
 */
export function buildStepGraph(steps: WorkflowStep[]): Map<string, StepNode> {
  const graph = new Map<string, StepNode>();

  // Initialize all nodes
  for (const step of steps) {
    graph.set(step.id, {
      step,
      dependencies: new Set(step.dependsOn || []),
      dependents: new Set(),
    });
  }

  // Build reverse dependencies (dependents)
  for (const [stepId, node] of graph.entries()) {
    for (const depId of node.dependencies) {
      const depNode = graph.get(depId);
      if (depNode) {
        depNode.dependents.add(stepId);
      }
    }
  }

  return graph;
}

/**
 * Topological sort to determine execution order
 * Returns array of step groups that can be executed in parallel
 */
export function topologicalSort(graph: Map<string, StepNode>): WorkflowStep[][] {
  const executionGroups: WorkflowStep[][] = [];
  const inDegree = new Map<string, number>();
  const queue: string[] = [];

  // Calculate in-degree for each node
  for (const [stepId, node] of graph.entries()) {
    inDegree.set(stepId, node.dependencies.size);
    if (node.dependencies.size === 0) {
      queue.push(stepId);
    }
  }

  // Process nodes level by level
  while (queue.length > 0) {
    const currentLevel: WorkflowStep[] = [];
    const currentLevelSize = queue.length;

    // Process all nodes at current level in parallel
    for (let i = 0; i < currentLevelSize; i++) {
      const stepId = queue.shift()!;
      const node = graph.get(stepId)!;
      currentLevel.push(node.step);

      // Decrease in-degree for dependents
      for (const dependentId of node.dependents) {
        const currentInDegree = inDegree.get(dependentId)!;
        inDegree.set(dependentId, currentInDegree - 1);

        // If all dependencies are satisfied, add to queue
        if (currentInDegree - 1 === 0) {
          queue.push(dependentId);
        }
      }
    }

    if (currentLevel.length > 0) {
      executionGroups.push(currentLevel);
    }
  }

  // Check for cycles (shouldn't happen in valid workflows)
  const remainingNodes = Array.from(graph.keys()).filter(
    (stepId) => inDegree.get(stepId)! > 0,
  );

  if (remainingNodes.length > 0) {
    throw new Error(
      `Circular dependency detected in workflow steps: ${remainingNodes.join(', ')}`,
    );
  }

  return executionGroups;
}

/**
 * Check if steps can run in parallel
 */
export function canRunInParallel(step1: WorkflowStep, step2: WorkflowStep): boolean {
  // If either step explicitly disallows parallel execution
  if (step1.parallel === false || step2.parallel === false) {
    return false;
  }

  // If step1 depends on step2 or vice versa, they can't run in parallel
  const step1Deps = step1.dependsOn || [];
  const step2Deps = step2.dependsOn || [];

  if (step1Deps.includes(step2.id) || step2Deps.includes(step1.id)) {
    return false;
  }

  // Check for transitive dependencies (simplified check)
  // In a full implementation, you'd do a full graph traversal
  return true;
}

