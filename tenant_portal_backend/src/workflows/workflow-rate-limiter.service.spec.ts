import { Test, TestingModule } from '@nestjs/testing';
import { WorkflowRateLimiterService } from './workflow-rate-limiter.service';

describe('WorkflowRateLimiterService', () => {
  let service: WorkflowRateLimiterService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WorkflowRateLimiterService],
    }).compile();

    service = module.get<WorkflowRateLimiterService>(WorkflowRateLimiterService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Rate Limiting', () => {
    it('should allow requests within limit', async () => {
      const key = 'test-key';
      const result1 = await service.checkRateLimit(key, 3, 60);
      const result2 = await service.checkRateLimit(key, 3, 60);
      const result3 = await service.checkRateLimit(key, 3, 60);

      expect(result1.allowed).toBe(true);
      expect(result2.allowed).toBe(true);
      expect(result3.allowed).toBe(true);
      expect(result1.remaining).toBe(2);
      expect(result2.remaining).toBe(1);
      expect(result3.remaining).toBe(0);
    });

    it('should reject requests exceeding limit', async () => {
      const key = 'test-key-limit';
      
      // Exceed limit
      await service.checkRateLimit(key, 2, 60);
      await service.checkRateLimit(key, 2, 60);
      const result = await service.checkRateLimit(key, 2, 60);

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should reset after window expires', async () => {
      const key = 'test-key-reset';
      
      // Fill up limit
      await service.checkRateLimit(key, 2, 1); // 1 second window
      await service.checkRateLimit(key, 2, 1);
      
      // Should be blocked
      const blocked = await service.checkRateLimit(key, 2, 1);
      expect(blocked.allowed).toBe(false);

      // Wait for window to expire
      await new Promise((resolve) => setTimeout(resolve, 1100));

      // Should be allowed again
      const allowed = await service.checkRateLimit(key, 2, 1);
      expect(allowed.allowed).toBe(true);
      expect(allowed.remaining).toBe(1);
    });

    it('should track remaining requests correctly', async () => {
      const key = 'test-key-remaining';
      const limit = 5;

      for (let i = 0; i < limit; i++) {
        const result = await service.checkRateLimit(key, limit, 60);
        expect(result.remaining).toBe(limit - i - 1);
      }
    });
  });

  describe('Key Generation', () => {
    it('should generate user key', () => {
      const key = service.generateUserKey(123);
      expect(key).toBe('workflow:123');
    });

    it('should generate user key with workflow', () => {
      const key = service.generateUserKey(123, 'test-workflow');
      expect(key).toBe('workflow:123:test-workflow');
    });

    it('should generate tenant key', () => {
      const key = service.generateTenantKey(456);
      expect(key).toBe('workflow:tenant:456');
    });

    it('should generate tenant key with workflow', () => {
      const key = service.generateTenantKey(456, 'test-workflow');
      expect(key).toBe('workflow:tenant:456:test-workflow');
    });
  });

  describe('Expired Entry Cleanup', () => {
    it('should clear expired entries', async () => {
      const key1 = 'key-short';
      const key2 = 'key-long';

      // Create entries with different windows
      await service.checkRateLimit(key1, 2, 1); // 1 second
      await service.checkRateLimit(key2, 2, 100); // 100 seconds

      // Wait for short window to expire
      await new Promise((resolve) => setTimeout(resolve, 1100));

      // Clear expired entries
      service.clearExpiredEntries();

      const stats = service.getStats();
      // Only long window entry should remain
      expect(stats.activeLimits).toBe(1);
    });
  });

  describe('Reset', () => {
    it('should reset rate limit for key', async () => {
      const key = 'test-reset';
      
      // Fill up limit
      await service.checkRateLimit(key, 2, 60);
      await service.checkRateLimit(key, 2, 60);
      
      // Should be blocked
      const blocked = await service.checkRateLimit(key, 2, 60);
      expect(blocked.allowed).toBe(false);

      // Reset
      service.reset(key);

      // Should be allowed again
      const allowed = await service.checkRateLimit(key, 2, 60);
      expect(allowed.allowed).toBe(true);
    });
  });

  describe('Statistics', () => {
    it('should return correct stats', async () => {
      await service.checkRateLimit('key1', 2, 60);
      await service.checkRateLimit('key2', 2, 60);

      const stats = service.getStats();
      expect(stats.totalKeys).toBe(2);
      expect(stats.activeLimits).toBe(2);
    });
  });
});

