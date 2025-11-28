import { Injectable, Logger } from '@nestjs/common';
import { WorkflowDefinition } from './workflow-engine.service';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

/**
 * Simple in-memory cache service for workflows
 * Can be upgraded to Redis for distributed caching
 */
@Injectable()
export class WorkflowCacheService {
  private readonly logger = new Logger(WorkflowCacheService.name);
  private workflowCache: Map<string, CacheEntry<WorkflowDefinition>> = new Map();
  private aiResponseCache: Map<string, CacheEntry<any>> = new Map();
  private readonly defaultWorkflowTTL = 3600000; // 1 hour
  private readonly defaultAIResponseTTL = 300000; // 5 minutes

  /**
   * Get workflow definition from cache
   */
  getWorkflow(workflowId: string): WorkflowDefinition | null {
    const entry = this.workflowCache.get(workflowId);
    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.workflowCache.delete(workflowId);
      return null;
    }

    return entry.data;
  }

  /**
   * Cache workflow definition
   */
  setWorkflow(workflowId: string, workflow: WorkflowDefinition, ttl?: number): void {
    this.workflowCache.set(workflowId, {
      data: workflow,
      timestamp: Date.now(),
      ttl: ttl || this.defaultWorkflowTTL,
    });
  }

  /**
   * Get AI response from cache
   */
  getAIResponse(cacheKey: string): any | null {
    const entry = this.aiResponseCache.get(cacheKey);
    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.aiResponseCache.delete(cacheKey);
      return null;
    }

    return entry.data;
  }

  /**
   * Cache AI response
   */
  setAIResponse(cacheKey: string, response: any, ttl?: number): void {
    this.aiResponseCache.set(cacheKey, {
      data: response,
      timestamp: Date.now(),
      ttl: ttl || this.defaultAIResponseTTL,
    });
  }

  /**
   * Generate cache key for AI response
   */
  generateAIResponseKey(service: string, method: string, params: Record<string, any>): string {
    // Sort params for consistent keys
    const sortedParams = Object.keys(params)
      .sort()
      .map((key) => `${key}:${JSON.stringify(params[key])}`)
      .join('|');

    return `ai:${service}:${method}:${sortedParams}`;
  }

  /**
   * Clear workflow cache
   */
  clearWorkflowCache(workflowId?: string): void {
    if (workflowId) {
      this.workflowCache.delete(workflowId);
    } else {
      this.workflowCache.clear();
    }
  }

  /**
   * Clear AI response cache
   */
  clearAIResponseCache(): void {
    this.aiResponseCache.clear();
  }

  /**
   * Clear expired entries
   */
  clearExpiredEntries(): void {
    const now = Date.now();
    let cleared = 0;

    // Clear expired workflows
    for (const [key, entry] of this.workflowCache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.workflowCache.delete(key);
        cleared++;
      }
    }

    // Clear expired AI responses
    for (const [key, entry] of this.aiResponseCache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.aiResponseCache.delete(key);
        cleared++;
      }
    }

    if (cleared > 0) {
      this.logger.debug(`Cleared ${cleared} expired cache entries`);
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    workflowCacheSize: number;
    aiResponseCacheSize: number;
    totalSize: number;
  } {
    return {
      workflowCacheSize: this.workflowCache.size,
      aiResponseCacheSize: this.aiResponseCache.size,
      totalSize: this.workflowCache.size + this.aiResponseCache.size,
    };
  }
}

