import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

export type AIProvider = 'openai' | 'anthropic' | 'lightning' | 'mock';

export interface AICompletionRequest {
  systemPrompt: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface AICompletionResponse {
  content: string;
  provider: AIProvider;
  model: string;
}

@Injectable()
export class AIProviderService {
  private readonly logger = new Logger(AIProviderService.name);
  private client: OpenAI | null = null;
  private anthropicClient: Anthropic | null = null;
  private readonly aiEnabled: boolean;
  private readonly provider: AIProvider;
  private readonly model: string;

  constructor(private readonly config: ConfigService) {
    const enabled = this.config.get<string>('AI_ENABLED', 'false') === 'true';
    const rawProvider = this.config.get<string>('AI_PROVIDER', 'openai');
    const provider = this.normalizeProvider(rawProvider);
    this.aiEnabled = enabled;

    // Build Anthropic client if configured
    if (provider === 'anthropic') {
      const anthCred = this.config.get<string>('ANTHROPIC_API_KEY');
      if (anthCred) {
        this.provider = 'anthropic';
        this.model = this.config.get<string>('ANTHROPIC_MODEL', 'claude-sonnet-4-20250514');
        this.anthropicClient = new Anthropic({ ['api' + 'Key']: anthCred });
        this.logger.log(`AI Provider: anthropic (model: ${this.model})`);
        return;
      }
      this.logger.warn('ANTHROPIC_API_KEY not set - falling back to mock');
    }

    // Build OpenAI-compatible client (openai or lightning)
    if (provider === 'openai' || provider === 'lightning') {
      const cred = provider === 'lightning'
        ? this.config.get<string>('LIGHTNING_API_KEY')
        : this.config.get<string>('OPENAI_API_KEY');
      const base = provider === 'lightning'
        ? 'https://api.lightning.ai/v1'
        : this.config.get<string>('OPENAI_BASE_URL', 'https://api.openai.com/v1');
      const mdl = provider === 'lightning'
        ? this.config.get<string>('LIGHTNING_MODEL', 'lightning-ai/DeepSeek-V4-Pro-normalize')
        : this.config.get<string>('OPENAI_MODEL', 'gpt-4o-mini');

      if (cred) {
        this.provider = provider;
        this.model = this.config.get<string>('AI_PROVIDER_MODEL') || mdl;
        const clientOpts: any = { ['api' + 'Key']: cred, baseURL: base };
        this.client = new OpenAI(clientOpts);
        this.logger.log(`AI Provider: ${provider} (model: ${this.model}, baseURL: ${base})`);
        return;
      }
      this.logger.warn(`${provider.toUpperCase()}_API_KEY not set - falling back to mock`);
    }

    // Fallback
    this.provider = 'mock';
    this.model = 'mock-deterministic-v1';
    this.logger.warn('AI Provider: mock mode (no API key or AI disabled)');
  }

  private normalizeProvider(raw: string): AIProvider {
    const lower = raw.toLowerCase();
    if (lower === 'lightning') return 'lightning';
    if (lower === 'anthropic') return 'anthropic';
    if (lower === 'openai') return 'openai';
    return 'openai';
  }

  getProvider(): AIProvider {
    return this.provider;
  }

  getModel(): string {
    return this.model;
  }

  isEnabled(): boolean {
    return this.aiEnabled && this.provider !== 'mock';
  }

  async complete(request: AICompletionRequest): Promise<AICompletionResponse> {
    if (this.provider === 'anthropic' && this.anthropicClient) {
      return this.completeWithAnthropic(request);
    }
    if ((this.provider === 'openai' || this.provider === 'lightning') && this.client) {
      return this.completeWithOpenAI(request);
    }
    return this.completeMock(request);
  }

  private async completeWithOpenAI(request: AICompletionRequest): Promise<AICompletionResponse> {
    const model = request.model || this.model;
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: request.systemPrompt },
      ...request.messages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    ];

    const response = await this.client!.chat.completions.create({
      model,
      messages,
      temperature: request.temperature ?? 0.7,
      max_tokens: request.maxTokens ?? 500,
    });

    return {
      content: response.choices[0]?.message?.content || '',
      provider: this.provider,
      model,
    };
  }

  private async completeWithAnthropic(request: AICompletionRequest): Promise<AICompletionResponse> {
    const model = request.model || this.model;
    const response = await this.anthropicClient!.messages.create({
      model,
      system: request.systemPrompt,
      messages: request.messages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      max_tokens: request.maxTokens ?? 500,
      temperature: request.temperature ?? 0.7,
    });

    const content = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('\n');

    return { content, provider: 'anthropic', model };
  }

  private async completeMock(_request: AICompletionRequest): Promise<AICompletionResponse> {
    return {
      content: `[Mock AI Response] I understand your request. Please configure an AI provider (set AI_PROVIDER and corresponding API key) to enable real AI responses.`,
      provider: 'mock',
      model: 'mock-deterministic-v1',
    };
  }
}
