import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatOptions {
  maxTokens?: number;
  temperature?: number;
  responseFormat?: 'text' | 'json';
}

export interface ChatResult {
  content: string;
  tokensUsed: number;
  model: string;
  fallback: boolean;
}

const FALLBACK_RESPONSE: ChatResult = {
  content: 'AI service is temporarily unavailable. Please try again later.',
  tokensUsed: 0,
  model: 'fallback',
  fallback: true,
};

@Injectable()
export class ModelGatewayService {
  private readonly logger = new Logger(ModelGatewayService.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly model: string;
  private readonly dailyTokenLimit: number;
  private readonly tenantUsage = new Map<string, { tokens: number; resetAt: number }>();

  constructor(private readonly config: ConfigService) {
    this.baseUrl = (config.get<string>('AI_BASE_URL') ?? 'https://api.openai.com/v1').replace(/\/$/, '');
    this.apiKey = config.get<string>('AI_API_KEY') ?? '';
    this.model = config.get<string>('AI_MODEL') ?? 'gpt-4o-mini';
    this.dailyTokenLimit = Number(config.get<string>('AI_DAILY_TOKEN_LIMIT') ?? '100000');
  }

  private isProduction(): boolean {
    return (process.env.NODE_ENV ?? '').toLowerCase() === 'production';
  }

  private checkUsage(tenantId: string): boolean {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const entry = this.tenantUsage.get(tenantId);
    if (!entry || now > entry.resetAt) {
      this.tenantUsage.set(tenantId, { tokens: 0, resetAt: now + dayMs });
      return true;
    }
    return entry.tokens < this.dailyTokenLimit;
  }

  private addUsage(tenantId: string, tokens: number): void {
    const entry = this.tenantUsage.get(tenantId);
    if (entry) {
      entry.tokens += tokens;
    }
  }

  async chat(tenantId: string, messages: ChatMessage[], options: ChatOptions = {}): Promise<ChatResult> {
    if (this.isProduction() && !this.apiKey) {
      throw new Error('AI_API_KEY must be configured in production');
    }

    if (!this.apiKey) {
      this.logger.warn('No AI_API_KEY configured; returning fallback');
      return { ...FALLBACK_RESPONSE };
    }

    if (!this.checkUsage(tenantId)) {
      this.logger.warn(`Tenant ${tenantId} exceeded daily token limit`);
      return { ...FALLBACK_RESPONSE, content: 'Daily AI usage limit reached. Try again tomorrow.' };
    }

    try {
      const res = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          max_tokens: options.maxTokens ?? 512,
          temperature: options.temperature ?? 0.3,
          ...(options.responseFormat === 'json' ? { response_format: { type: 'json_object' } } : {}),
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        this.logger.error(`LLM API error ${res.status}: ${text.slice(0, 200)}`);
        return { ...FALLBACK_RESPONSE };
      }

      const data = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
        usage?: { total_tokens?: number };
      };
      const content = data.choices?.[0]?.message?.content ?? '';
      const tokens = data.usage?.total_tokens ?? 0;
      this.addUsage(tenantId, tokens);

      return { content, tokensUsed: tokens, model: this.model, fallback: false };
    } catch (err) {
      this.logger.error(`LLM call failed: ${err instanceof Error ? err.message : err}`);
      return { ...FALLBACK_RESPONSE };
    }
  }
}
