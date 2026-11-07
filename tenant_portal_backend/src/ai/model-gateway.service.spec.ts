import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ModelGatewayService } from './model-gateway.service';

describe('ModelGatewayService', () => {
  let service: ModelGatewayService;
  let config: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    config = {
      get: jest.fn((key: string) => {
        if (key === 'AI_API_KEY') return 'test-key';
        if (key === 'AI_BASE_URL') return 'https://api.example.com/v1';
        if (key === 'AI_MODEL') return 'gpt-4o-mini';
        if (key === 'AI_DAILY_TOKEN_LIMIT') return '1000';
        return undefined;
      }),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [ModelGatewayService, { provide: ConfigService, useValue: config }],
    }).compile();

    service = module.get<ModelGatewayService>(ModelGatewayService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns fallback when no API key configured', async () => {
    config.get.mockImplementation((key: string) => {
      if (key === 'AI_API_KEY') return undefined;
      return 'default';
    });
    const fresh = new ModelGatewayService(config);
    const result = await fresh.chat('tenant-1', [{ role: 'user', content: 'hello' }]);
    expect(result.fallback).toBe(true);
  });

  it('makes a successful LLM call', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'triage result' } }],
        usage: { total_tokens: 42 },
      }),
    });
    global.fetch = mockFetch as any;

    const result = await service.chat('tenant-1', [{ role: 'user', content: 'hello' }]);
    expect(result.content).toBe('triage result');
    expect(result.tokensUsed).toBe(42);
    expect(result.fallback).toBe(false);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('returns fallback on API error', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500, text: async () => 'error' }) as any;
    const result = await service.chat('tenant-1', [{ role: 'user', content: 'hello' }]);
    expect(result.fallback).toBe(true);
  });

  it('returns fallback on network failure', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('network')) as any;
    const result = await service.chat('tenant-1', [{ role: 'user', content: 'hello' }]);
    expect(result.fallback).toBe(true);
  });

  it('enforces daily token limit', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'ok' } }], usage: { total_tokens: 1001 } }),
    }) as any;
    await service.chat('tenant-1', [{ role: 'user', content: 'hello' }]);
    const result = await service.chat('tenant-1', [{ role: 'user', content: 'hello again' }]);
    expect(result.fallback).toBe(true);
    expect(result.content).toContain('Daily AI usage limit');
  });
});
