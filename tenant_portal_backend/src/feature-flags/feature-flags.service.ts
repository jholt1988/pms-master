/**
 * Feature Flags Service
 * 
 * Core service for evaluating and managing feature flags.
 * Supports tenant-level, user-level, and percentage-based rollouts.
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  FeatureFlag,
  FeatureFlagContext,
  FeatureFlagEvaluation,
  FEATURE_FLAGS,
  getFeatureFlag,
} from './feature-flags.config';

@Injectable()
export class FeatureFlagsService {
  private readonly logger = new Logger(FeatureFlagsService.name);
  
  // Cache for feature flags (could be Redis-backed)
  private cache: Map<string, { value: boolean; timestamp: number }> = new Map();
  private readonly CACHE_TTL_MS = 60_000; // 1 minute cache

  /**
   * Check if a feature is enabled for the given context
   */
  isEnabled(key: string, context?: FeatureFlagContext): boolean {
    return this.evaluate(key, context).enabled;
  }

  /**
   * Evaluate a feature flag with full result
   */
  evaluate(key: string, context?: FeatureFlagContext): FeatureFlagEvaluation {
    const flag = getFeatureFlag(key);

    if (!flag) {
      this.logger.debug(`Feature flag "${key}" not found, defaulting to disabled`);
      return {
        key,
        enabled: false,
        reason: 'Feature flag not defined',
      };
    }

    // Check if feature is globally disabled
    if (!flag.enabled) {
      return {
        key,
        enabled: false,
        reason: 'Feature flag is disabled',
        metadata: { strategy: flag.strategy },
      };
    }

    // Check environment (skip if not configured)
    const nodeEnv = process.env.NODE_ENV || 'development';
    const allowedEnvs = flag.environments ?? [];
    if (allowedEnvs.length > 0 && !allowedEnvs.includes(nodeEnv as any)) {
      return {
        key,
        enabled: false,
        reason: `Feature flag not enabled for environment: ${nodeEnv}`,
        metadata: { strategy: flag.strategy },
      };
    }

    // Check dependencies
    for (const dep of flag.dependencies) {
      if (!this.isEnabled(dep, context)) {
        return {
          key,
          enabled: false,
          reason: `Dependency not met: ${dep}`,
          metadata: { strategy: flag.strategy },
        };
      }
    }

    // Evaluate based on strategy
    const result = this.evaluateStrategy(flag, context);
    
    this.logger.debug(`Feature flag "${key}": enabled=${result.enabled}, reason=${result.reason}`);
    return result;
  }

  /**
   * Evaluate based on rollout strategy
   */
  private evaluateStrategy(
    flag: FeatureFlag,
    context?: FeatureFlagContext,
  ): FeatureFlagEvaluation {
    const { strategy, rolloutPercentage, tenantIds, userIds } = flag;

    switch (strategy) {
      case 'admin':
        // Enabled for users with admin role
        const isAdmin = context?.roles?.some(r => 
          ['admin', 'superadmin', 'owner'].includes(r.toLowerCase())
        );
        return {
          key: flag.key,
          enabled: isAdmin ?? false,
          reason: isAdmin ? 'Admin user' : 'Non-admin user',
          metadata: { rolloutPercentage, strategy },
        };

      case 'tenant':
        // Check if tenant is in allowlist
        if (context?.tenantId && tenantIds.includes(context.tenantId)) {
          return {
            key: flag.key,
            enabled: true,
            reason: 'Tenant in allowlist',
            metadata: { rolloutPercentage, strategy },
          };
        }
        // Otherwise use percentage rollout
        return this.evaluatePercentage(rolloutPercentage, `Tenant: ${context?.tenantId ?? 'unknown'}`);

      case 'user':
        // Check if user is in allowlist
        if (context?.userId && userIds.includes(context.userId)) {
          return {
            key: flag.key,
            enabled: true,
            reason: 'User in allowlist',
            metadata: { rolloutPercentage, strategy },
          };
        }
        return this.evaluatePercentage(rolloutPercentage, `User: ${context?.userId ?? 'unknown'}`);

      case 'safe-mode':
        // Inverse: percentage of users are EXCLUDED
        const excluded = this.evaluatePercentage(rolloutPercentage, 'safe-mode');
        return {
          key: flag.key,
          enabled: !excluded.enabled,
          reason: excluded.enabled ? 'User excluded in safe mode' : 'User not in safe mode exclusion',
          metadata: { rolloutPercentage, strategy },
        };

      case 'all':
      default:
        return this.evaluatePercentage(rolloutPercentage, 'global rollout');
    }
  }

  /**
   * Simple percentage-based evaluation using deterministic hashing
   */
  private evaluatePercentage(percentage: number, salt: string): FeatureFlagEvaluation {
    // Deterministic hash based on flag key + salt for consistent behavior
    const hash = this.hashString(`${salt}`) % 100;
    const enabled = hash < percentage;
    
    return {
      key: '',
      enabled,
      reason: enabled ? `Rollout ${percentage}% (hash: ${hash})` : `Not in ${percentage}% rollout (hash: ${hash})`,
      metadata: { rolloutPercentage: percentage },
    };
  }

  /**
   * Simple string hash for deterministic selection
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Get all feature flags with their current status for a context
   */
  getAllFlags(context?: FeatureFlagContext): FeatureFlagEvaluation[] {
    return FEATURE_FLAGS.map(flag => this.evaluate(flag.key, context));
  }

  /**
   * Get flags filtered by category
   */
  getFlagsByCategory(category: FeatureFlag['category'], context?: FeatureFlagContext): FeatureFlagEvaluation[] {
    return FEATURE_FLAGS
      .filter(f => f.category === category)
      .map(flag => this.evaluate(flag.key, context));
  }

  /**
   * Get plain object of all enabled flags (useful for frontend)
   */
  getEnabledFlags(context?: FeatureFlagContext): Record<string, boolean> {
    const flags = this.getAllFlags(context);
    return flags.reduce((acc, flag) => {
      acc[flag.key] = flag.enabled;
      return acc;
    }, {} as Record<string, boolean>);
  }

  /**
   * Check if multiple features are all enabled
   */
  areAllEnabled(keys: string[], context?: FeatureFlagContext): boolean {
    return keys.every(key => this.isEnabled(key, context));
  }

  /**
   * Check if any of the features are enabled
   */
  areAnyEnabled(keys: string[], context?: FeatureFlagContext): boolean {
    return keys.some(key => this.isEnabled(key, context));
  }
}