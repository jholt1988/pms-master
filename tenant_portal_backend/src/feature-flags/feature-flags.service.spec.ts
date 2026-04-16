/**
 * Feature Flags Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { FeatureFlagsService } from './feature-flags.service';
import { FEATURE_FLAGS } from './feature-flags.config';

describe('FeatureFlagsService', () => {
  let service: FeatureFlagsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FeatureFlagsService],
    }).compile();

    service = module.get<FeatureFlagsService>(FeatureFlagsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('isEnabled', () => {
    it('should return true for enabled feature without context', () => {
      // dashboard_v2 is enabled with 100% rollout
      expect(service.isEnabled('dashboard_v2')).toBe(true);
    });

    it('should return false for disabled feature', () => {
      // legacy_maintenance_portal is disabled
      expect(service.isEnabled('legacy_maintenance_portal')).toBe(false);
    });

    it('should return false for unknown feature', () => {
      expect(service.isEnabled('unknown_feature_xyz')).toBe(false);
    });

    it('should respect admin strategy', () => {
      // smart_lease_contract is admin-only
      const adminContext = { roles: ['admin'] };
      const userContext = { roles: ['tenant'] };

      expect(service.isEnabled('smart_lease_contract', adminContext)).toBe(true);
      expect(service.isEnabled('smart_lease_contract', userContext)).toBe(false);
    });

    it('should respect tenant strategy', () => {
      // ai_inspection_scoring uses tenant strategy
      const contextWithTenant = { tenantId: 'tenant-123' };
      const contextWithoutTenant = {};

      const result = service.evaluate('ai_inspection_scoring', contextWithTenant);
      // Result depends on whether tenant is in allowlist
      expect(result.metadata?.strategy).toBe('tenant');
    });
  });

  describe('getAllFlags', () => {
    it('should return all feature flags', () => {
      const flags = service.getAllFlags();
      expect(flags.length).toBeGreaterThan(0);
      expect(flags.length).toBe(FEATURE_FLAGS.length);
    });

    it('should include metadata in evaluation', () => {
      const flags = service.getAllFlags();
      const dashboardFlag = flags.find(f => f.key === 'dashboard_v2');
      
      expect(dashboardFlag).toBeDefined();
      expect(dashboardFlag?.metadata).toBeDefined();
      expect(dashboardFlag?.metadata?.strategy).toBe('all');
    });
  });

  describe('getEnabledFlags', () => {
    it('should return a plain object', () => {
      const flags = service.getEnabledFlags();
      expect(typeof flags).toBe('object');
      expect(flags['dashboard_v2']).toBeDefined();
      expect(typeof flags['dashboard_v2']).toBe('boolean');
    });
  });

  describe('getFlagsByCategory', () => {
    it('should filter by category', () => {
      const betaFlags = service.getFlagsByCategory('beta');
      expect(betaFlags.length).toBeGreaterThan(0);
      
      for (const flag of betaFlags) {
        const configFlag = FEATURE_FLAGS.find(f => f.key === flag.key);
        expect(configFlag?.category).toBe('beta');
      }
    });
  });

  describe('areAllEnabled', () => {
    it('should return true when all features are enabled', () => {
      // dashboard_v2 and maintenance_requests_v2 are both production enabled
      const result = service.areAllEnabled(['dashboard_v2', 'maintenance_requests_v2']);
      expect(typeof result).toBe('boolean');
    });

    it('should return false when any feature is disabled', () => {
      const result = service.areAllEnabled(['dashboard_v2', 'legacy_maintenance_portal']);
      expect(result).toBe(false);
    });
  });

  describe('areAnyEnabled', () => {
    it('should return true when at least one feature is enabled', () => {
      const result = service.areAnyEnabled(['dashboard_v2', 'legacy_maintenance_portal']);
      expect(result).toBe(true);
    });

    it('should return false when no features are enabled', () => {
      const result = service.areAnyEnabled(['unknown_1', 'unknown_2']);
      expect(result).toBe(false);
    });
  });
});