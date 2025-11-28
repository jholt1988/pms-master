import { Test, TestingModule } from '@nestjs/testing';
import { WorkflowCacheService } from './workflow-cache.service';
import { WorkflowDefinition } from './workflow-engine.service';

describe('WorkflowCacheService', () => {
  let service: WorkflowCacheService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WorkflowCacheService],
    }).compile();

    service = module.get<WorkflowCacheService>(WorkflowCacheService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Workflow Caching', () => {
    const mockWorkflow: WorkflowDefinition = {
      id: 'test-workflow',
      name: 'Test Workflow',
      description: 'Test',
      steps: [],
    };

    it('should cache workflow definition', () => {
      service.setWorkflow('test-workflow', mockWorkflow);
      const cached = service.getWorkflow('test-workflow');

      expect(cached).toEqual(mockWorkflow);
    });

    it('should return null for non-existent workflow', () => {
      const cached = service.getWorkflow('non-existent');
      expect(cached).toBeNull();
    });

    it('should expire cached workflow after TTL', async () => {
      service.setWorkflow('test-workflow', mockWorkflow, 100); // 100ms TTL
      
      // Should be cached immediately
      expect(service.getWorkflow('test-workflow')).toEqual(mockWorkflow);

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Should be expired
      expect(service.getWorkflow('test-workflow')).toBeNull();
    });

    it('should clear specific workflow cache', () => {
      service.setWorkflow('workflow-1', mockWorkflow);
      service.setWorkflow('workflow-2', mockWorkflow);

      service.clearWorkflowCache('workflow-1');

      expect(service.getWorkflow('workflow-1')).toBeNull();
      expect(service.getWorkflow('workflow-2')).toEqual(mockWorkflow);
    });

    it('should clear all workflow cache', () => {
      service.setWorkflow('workflow-1', mockWorkflow);
      service.setWorkflow('workflow-2', mockWorkflow);

      service.clearWorkflowCache();

      expect(service.getWorkflow('workflow-1')).toBeNull();
      expect(service.getWorkflow('workflow-2')).toBeNull();
    });
  });

  describe('AI Response Caching', () => {
    const mockResponse = { priority: 'HIGH', score: 0.9 };

    it('should cache AI response', () => {
      service.setAIResponse('test-key', mockResponse);
      const cached = service.getAIResponse('test-key');

      expect(cached).toEqual(mockResponse);
    });

    it('should return null for non-existent response', () => {
      const cached = service.getAIResponse('non-existent');
      expect(cached).toBeNull();
    });

    it('should expire cached response after TTL', async () => {
      service.setAIResponse('test-key', mockResponse, 100); // 100ms TTL

      // Should be cached immediately
      expect(service.getAIResponse('test-key')).toEqual(mockResponse);

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Should be expired
      expect(service.getAIResponse('test-key')).toBeNull();
    });

    it('should generate consistent cache keys', () => {
      const params1 = { title: 'Test', description: 'Desc' };
      const params2 = { description: 'Desc', title: 'Test' }; // Different order

      const key1 = service.generateAIResponseKey('Service', 'method', params1);
      const key2 = service.generateAIResponseKey('Service', 'method', params2);

      expect(key1).toBe(key2); // Should be same despite order
    });

    it('should generate different keys for different params', () => {
      const params1 = { title: 'Test1' };
      const params2 = { title: 'Test2' };

      const key1 = service.generateAIResponseKey('Service', 'method', params1);
      const key2 = service.generateAIResponseKey('Service', 'method', params2);

      expect(key1).not.toBe(key2);
    });
  });

  describe('Cache Statistics', () => {
    it('should return correct cache stats', () => {
      service.setWorkflow('workflow-1', { id: 'w1', name: 'W1', description: '', steps: [] });
      service.setWorkflow('workflow-2', { id: 'w2', name: 'W2', description: '', steps: [] });
      service.setAIResponse('ai-1', { data: 'test' });

      const stats = service.getCacheStats();

      expect(stats.workflowCacheSize).toBe(2);
      expect(stats.aiResponseCacheSize).toBe(1);
      expect(stats.totalSize).toBe(3);
    });
  });

  describe('Expired Entry Cleanup', () => {
    it('should clear expired entries', async () => {
      // Set entries with different TTLs
      service.setWorkflow('workflow-short', { id: 'ws', name: 'WS', description: '', steps: [] }, 50);
      service.setWorkflow('workflow-long', { id: 'wl', name: 'WL', description: '', steps: [] }, 1000);
      service.setAIResponse('ai-short', { data: 'test' }, 50);
      service.setAIResponse('ai-long', { data: 'test' }, 1000);

      // Wait for short TTL to expire
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Clear expired entries
      service.clearExpiredEntries();

      // Short entries should be cleared
      expect(service.getWorkflow('workflow-short')).toBeNull();
      expect(service.getAIResponse('ai-short')).toBeNull();

      // Long entries should still exist
      expect(service.getWorkflow('workflow-long')).toBeDefined();
      expect(service.getAIResponse('ai-long')).toBeDefined();
    });
  });
});

