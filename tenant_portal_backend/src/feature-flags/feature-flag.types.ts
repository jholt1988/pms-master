/**
 * Feature Flag Types
 * 
 * Defines the core types for the feature flag system.
 */

import { z } from 'zod';

/**
 * Feature flag definition schema
 */
export const featureFlagSchema = z.object({
  key: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  enabled: z.boolean(),
  // Rollout percentage: 0-100, applies only when enabled=true
  rolloutPercentage: z.number().min(0).max(100).default(100),
  // Target specific tenant IDs for granular control
  tenantIds: z.array(z.string()).default([]),
  // Target specific user IDs for granular control  
  userIds: z.array(z.string()).default([]),
  // Environment: which environments this flag applies to
  environments: z.array(z.enum(['development', 'production', 'test'])).default(['development', 'production']),
  // Dependencies: other features that must be enabled
  dependencies: z.array(z.string()).default([]),
  // Metadata for frontend
  category: z.enum([
    'beta',
    'experimental',
    'production',
    'deprecated',
    '基础设施', // infrastructure
  ]).default('production'),
  // Rollout strategy
  strategy: z.enum([
    'all',           // Everyone with rollout percentage
    'tenant',        // Per-tenant rollout
    'user',          // Per-user rollout
    'admin',         // Admin users only
    'safe-mode',     // Everyone except rollout % (inverted)
  ]).default('all'),
});

export type FeatureFlag = z.infer<typeof featureFlagSchema>;
export type FeatureFlagKey = FeatureFlag['key'];
export type FeatureFlagCategory = FeatureFlag['category'];
export type RolloutStrategy = FeatureFlag['strategy'];

/**
 * Feature flag evaluation result
 */
export interface FeatureFlagEvaluation {
  key: string;
  enabled: boolean;
  reason: string;
  metadata?: {
    rolloutPercentage?: number;
    strategy?: RolloutStrategy;
  };
}

/**
 * User context for feature flag evaluation
 */
export interface FeatureFlagContext {
  userId?: string;
  tenantId?: string;
  roles?: string[];
  email?: string;
}