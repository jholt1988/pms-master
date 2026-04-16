/**
 * Feature Flags Configuration
 * 
 * Central registry of all feature flags in the system.
 * Add new features here - single source of truth.
 * 
 * Usage in code:
 *   import { FeatureFlagsService } from './feature-flags.service';
 *   const flags = this.featureFlagsService.isEnabled('my-feature', context);
 */

import {
  FeatureFlag,
  FeatureFlagContext,
  FeatureFlagEvaluation,
} from './feature-flag.types';

// Re-export types for convenience
export { FeatureFlag, FeatureFlagContext, FeatureFlagEvaluation };

// ⚡ Central Feature Flag Registry
export const FEATURE_FLAGS: FeatureFlag[] = [
  // ==================== PRODUCTION FLAGS ====================
  {
    key: 'dashboard_v2',
    name: 'Dashboard V2',
    description: 'New dashboard with improved performance and UX',
    enabled: true,
    rolloutPercentage: 100,
    category: 'production',
    strategy: 'all',
  },
  {
    key: 'maintenance_requests_v2',
    name: 'Maintenance Requests V2',
    description: 'Redesigned maintenance request flow',
    enabled: true,
    rolloutPercentage: 100,
    category: 'production',
    strategy: 'all',
  },
  {
    key: 'lease_renewal_flow',
    name: 'Lease Renewal Flow',
    description: 'Digital lease renewal with e-signature integration',
    enabled: true,
    rolloutPercentage: 80,
    category: 'production',
    strategy: 'all',
  },
  {
    key: 'ai_inspection_scoring',
    name: 'AI Inspection Scoring',
    description: 'Automated inspection scoring using AI',
    enabled: true,
    rolloutPercentage: 50,
    category: 'beta',
    strategy: 'tenant',
  },
  {
    key: 'payment_link_checkout',
    name: 'Payment Link Checkout',
    description: 'Simplified payment flow using Stripe payment links',
    enabled: true,
    rolloutPercentage: 100,
    category: 'production',
    strategy: 'all',
  },
  {
    key: 'quickbooks_integration',
    name: 'QuickBooks Integration',
    description: 'Sync financial data with QuickBooks',
    enabled: true,
    rolloutPercentage: 30,
    category: 'beta',
    strategy: 'tenant',
  },
  
  // ==================== BETA FLAGS ====================
  {
    key: 'smart_lease_contract',
    name: 'Smart Lease Contracts',
    description: 'Blockchain-based lease contracts',
    enabled: false,
    category: 'experimental',
    strategy: 'admin',
    dependencies: ['web3_wallet_connection'],
  },
  {
    key: 'ai_chatbot_assistant',
    name: 'AI Chatbot Assistant',
    description: 'AI-powered tenant support chatbot',
    enabled: true,
    rolloutPercentage: 20,
    category: 'beta',
    strategy: 'tenant',
  },
  {
    key: 'predictive_maintenance',
    name: 'Predictive Maintenance',
    description: 'ML-based maintenance prediction',
    enabled: false,
    category: 'experimental',
    strategy: 'all',
  },
  {
    key: 'omnichannel_messaging',
    name: 'Omnichannel Messaging',
    description: 'Unified messaging across SMS, email, push',
    enabled: true,
    rolloutPercentage: 100,
    category: 'production',
    strategy: 'all',
  },
  
  // ==================== INFRASTRUCTURE ====================
  {
    key: 'web3_wallet_connection',
    name: 'Web3 Wallet Connection',
    description: 'Ethereum wallet integration for next-gen auth',
    enabled: false,
    category: '基础设施',
    strategy: 'admin',
  },
  {
    key: 'redis_caching',
    name: 'Redis Caching Layer',
    description: 'Redis-based caching for improved performance',
    enabled: true,
    rolloutPercentage: 100,
    category: '基础设施',
    strategy: 'all',
  },
  {
    key: 'sentry_performance_monitoring',
    name: 'Sentry Performance Monitoring',
    description: 'APM and performance tracking',
    enabled: true,
    rolloutPercentage: 100,
    category: '基础设施',
    strategy: 'all',
  },

  // ==================== DEPRECATED ====================
  {
    key: 'legacy_maintenance_portal',
    name: 'Legacy Maintenance Portal',
    description: 'Old maintenance portal (deprecated)',
    enabled: false,
    category: 'deprecated',
    strategy: 'admin',
  },
];

/**
 * Get feature flag by key
 */
export function getFeatureFlag(key: string): FeatureFlag | undefined {
  return FEATURE_FLAGS.find(f => f.key === key);
}

/**
 * Get all feature flags in a category
 */
export function getFeatureFlagsByCategory(category: FeatureFlag['category']): FeatureFlag[] {
  return FEATURE_FLAGS.filter(f => f.category === category);
}

/**
 * Get all feature flag keys
 */
export function getAllFeatureFlagKeys(): string[] {
  return FEATURE_FLAGS.map(f => f.key);
}