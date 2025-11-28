import { Injectable, Logger } from '@nestjs/common';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

/**
 * Simple in-memory rate limiter
 * Can be upgraded to Redis for distributed rate limiting
 */
@Injectable()
export class WorkflowRateLimiterService {
  private readonly logger = new Logger(WorkflowRateLimiterService.name);
  private rateLimits: Map<string, RateLimitEntry> = new Map();
  private readonly defaultPoints = 10; // Requests per window
  private readonly defaultWindow = 60; // Seconds

  /**
   * Check if request is within rate limit
   */
  async checkRateLimit(
    key: string,
    points: number = this.defaultPoints,
    windowSeconds: number = this.defaultWindow,
  ): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
    const now = Date.now();
    const entry = this.rateLimits.get(key);

    // If no entry or window expired, create new entry
    if (!entry || now > entry.resetAt) {
      const resetAt = now + windowSeconds * 1000;
      this.rateLimits.set(key, {
        count: 1,
        resetAt,
      });

      return {
        allowed: true,
        remaining: points - 1,
        resetAt,
      };
    }

    // Check if limit exceeded
    if (entry.count >= points) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: entry.resetAt,
      };
    }

    // Increment count
    entry.count++;
    this.rateLimits.set(key, entry);

    return {
      allowed: true,
      remaining: points - entry.count,
      resetAt: entry.resetAt,
    };
  }

  /**
   * Generate rate limit key for user
   */
  generateUserKey(userId: number, workflowId?: string): string {
    return workflowId ? `workflow:${userId}:${workflowId}` : `workflow:${userId}`;
  }

  /**
   * Generate rate limit key for tenant
   */
  generateTenantKey(tenantId: number, workflowId?: string): string {
    return workflowId ? `workflow:tenant:${tenantId}:${workflowId}` : `workflow:tenant:${tenantId}`;
  }

  /**
   * Clear expired entries
   */
  clearExpiredEntries(): void {
    const now = Date.now();
    let cleared = 0;

    for (const [key, entry] of this.rateLimits.entries()) {
      if (now > entry.resetAt) {
        this.rateLimits.delete(key);
        cleared++;
      }
    }

    if (cleared > 0) {
      this.logger.debug(`Cleared ${cleared} expired rate limit entries`);
    }
  }

  /**
   * Reset rate limit for a key
   */
  reset(key: string): void {
    this.rateLimits.delete(key);
  }

  /**
   * Get rate limit statistics
   */
  getStats(): {
    activeLimits: number;
    totalKeys: number;
  } {
    const now = Date.now();
    const activeLimits = Array.from(this.rateLimits.values()).filter(
      (entry) => now <= entry.resetAt,
    ).length;

    return {
      activeLimits,
      totalKeys: this.rateLimits.size,
    };
  }
}

