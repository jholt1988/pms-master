/**
 * AI Operating System Service Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AIOperatingSystemService } from './AIOperatingSystemService';
import { FAQCategory } from '../domains/shared/ai-services/chatbot/types';

// Mock dependencies
vi.mock('./apiClient', () => ({
  apiFetch: vi.fn(),
}));

vi.mock('./LeasingAgentService', () => ({
  LeasingAgentService: vi.fn().mockImplementation(() => ({
    startConversation: vi.fn(),
    processMessage: vi.fn(),
  })),
}));

vi.mock('../domains/shared/ai-services/rent-optimization/RentOptimizationService', () => ({
  rentOptimizationService: {
    getRecommendation: vi.fn(),
  },
}));

describe('AIOperatingSystemService', () => {
  let service: AIOperatingSystemService;

  beforeEach(() => {
    service = new AIOperatingSystemService({
      enabled: true,
      useLLM: false, // Use FAQ mode for testing
      voiceInputEnabled: true,
      commandProcessingEnabled: true,
      proactiveSuggestionsEnabled: true,
    });
  });

  describe('sendMessage', () => {
    it('should create a new session if sessionId is not provided', async () => {
      const result = await service.sendMessage('user-1', 'Hello', undefined, undefined, {
        userId: 'user-1',
        username: 'testuser',
        role: 'TENANT',
      });

      expect(result.sessionId).toBeDefined();
      expect(result.response.type).toBe('ai');
      expect(result.response.content).toBeTruthy();
    });

    it('should use existing session if sessionId is provided', async () => {
      const firstResult = await service.sendMessage('user-1', 'Hello');
      const secondResult = await service.sendMessage('user-1', 'How are you?', firstResult.sessionId);

      expect(secondResult.sessionId).toBe(firstResult.sessionId);
    });

    it('should detect maintenance intent', async () => {
      const result = await service.sendMessage('user-1', 'How do I submit a maintenance request?');

      expect(result.response.content).toContain('maintenance');
    });

    it('should detect payment intent', async () => {
      const result = await service.sendMessage('user-1', 'When is rent due?');

      expect(result.response.content).toContain('rent');
    });
  });

  describe('command processing', () => {
    it('should recognize draft lease renewal command', async () => {
      const result = await service.sendMessage('user-1', 'Draft lease renewal');

      expect(result.response.type).toBe('command');
      expect(result.response.metadata?.commandResult?.action?.target).toBe('/lease/renew');
    });

    it('should recognize analyze market rates command', async () => {
      const result = await service.sendMessage('user-1', 'Analyze market rates');

      expect(result.response.type).toBe('command');
      expect(result.response.metadata?.commandResult?.action?.target).toBe('/rent-optimization');
    });

    it('should recognize show vacancies command', async () => {
      const result = await service.sendMessage('user-1', 'Show vacancies');

      expect(result.response.type).toBe('command');
      expect(result.response.metadata?.commandResult?.action?.target).toBe('/properties/search');
    });

    it('should recognize create maintenance request command', async () => {
      const result = await service.sendMessage('user-1', 'Create maintenance request');

      expect(result.response.type).toBe('command');
      expect(result.response.metadata?.commandResult?.action?.target).toBe('/maintenance/new');
    });
  });

  describe('proactive suggestions', () => {
    it('should generate proactive suggestions for tenant', async () => {
      const context = {
        userId: 'user-1',
        username: 'testuser',
        role: 'TENANT' as const,
        leaseId: 123,
      };

      const suggestions = await service.getProactiveSuggestions(context);

      expect(Array.isArray(suggestions)).toBe(true);
    });

    it('should return empty array if suggestions disabled', async () => {
      const disabledService = new AIOperatingSystemService({
        proactiveSuggestionsEnabled: false,
      });

      const suggestions = await disabledService.getProactiveSuggestions({
        userId: 'user-1',
        username: 'testuser',
        role: 'TENANT',
      });

      expect(suggestions).toEqual([]);
    });
  });

  describe('context management', () => {
    it('should update context for existing session', async () => {
      const result = await service.sendMessage('user-1', 'Hello');
      const newContext = {
        userId: 'user-1',
        username: 'testuser',
        role: 'TENANT' as const,
        currentPage: '/maintenance',
      };

      service.updateContext(result.sessionId, newContext);

      const history = service.getSessionHistory(result.sessionId);
      expect(history.length).toBeGreaterThan(0);
    });
  });

  describe('session management', () => {
    it('should get session history', async () => {
      const result = await service.sendMessage('user-1', 'Hello');
      const history = service.getSessionHistory(result.sessionId);

      expect(history.length).toBeGreaterThan(0);
      expect(history.some(msg => msg.type === 'user')).toBe(true);
      expect(history.some(msg => msg.type === 'ai')).toBe(true);
    });

    it('should return empty array for non-existent session', () => {
      const history = service.getSessionHistory('non-existent-session');
      expect(history).toEqual([]);
    });
  });
});

