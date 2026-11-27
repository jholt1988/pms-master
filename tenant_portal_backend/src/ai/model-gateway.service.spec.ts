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

  function grokConfig(values: Record<string, string | undefined>) {
    config.get.mockImplementation((key: string) => values[key]);
    return new ModelGatewayService(config);
  }

  function mockChatFetch() {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'triage result' } }],
        usage: { total_tokens: 7 },
      }),
    });
    global.fetch = mockFetch as any;
    return mockFetch;
  }

  it('resolves grok defaults and reads XAI_API_KEY', async () => {
    const fresh = grokConfig({
      AI_PROVIDER: 'grok',
      XAI_API_KEY: 'test-xai-key',
      AI_API_KEY: 'not-the-grok-key',
    });
    const mockFetch = mockChatFetch();

    const result = await fresh.chat('tenant-1', [{ role: 'user', content: 'hello' }]);

    expect(result.fallback).toBe(false);
    expect(result.model).toBe('grok-4');
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe('https://api.x.ai/v1/chat/completions');
    expect(JSON.parse(init.body).model).toBe('grok-4');
    expect(init.headers.Authorization).toBe('Bearer test-xai-key');
    expect(init.headers.Authorization).not.toContain('not-the-grok-key');
  });

  it('lets an explicit AI_BASE_URL or AI_MODEL win over grok defaults', async () => {
    const fresh = grokConfig({
      AI_PROVIDER: 'grok',
      XAI_API_KEY: 'test-xai-key',
      AI_BASE_URL: 'https://gateway.example.test/v1/',
      AI_MODEL: 'grok-custom',
    });
    const mockFetch = mockChatFetch();

    const result = await fresh.chat('tenant-1', [{ role: 'user', content: 'hello' }]);

    expect(result.model).toBe('grok-custom');
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe('https://gateway.example.test/v1/chat/completions');
    expect(JSON.parse(init.body).model).toBe('grok-custom');
  });

  it('does not throw or open a socket when the grok key is missing outside production', async () => {
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = 'test';
    const mockFetch = jest.fn(() => {
      throw new Error('socket opened');
    });
    global.fetch = mockFetch as any;
    try {
      const fresh = grokConfig({ AI_PROVIDER: 'grok', XAI_API_KEY: '   ' });
      const result = await fresh.chat('tenant-1', [{ role: 'user', content: 'hello' }]);
      expect(result.fallback).toBe(true);
      expect(mockFetch).not.toHaveBeenCalled();
    } finally {
      process.env.NODE_ENV = previous;
    }
  });

  it('still throws in production when the grok key is not configured', async () => {
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    const mockFetch = jest.fn(() => {
      throw new Error('socket opened');
    });
    global.fetch = mockFetch as any;
    try {
      const fresh = grokConfig({ AI_PROVIDER: 'grok' });
      await expect(fresh.chat('tenant-1', [{ role: 'user', content: 'hello' }])).rejects.toThrow(
        'XAI_API_KEY must be configured in production',
      );
      expect(mockFetch).not.toHaveBeenCalled();
    } finally {
      process.env.NODE_ENV = previous;
    }
  });
});
