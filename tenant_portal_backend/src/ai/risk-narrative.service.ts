import { Injectable } from '@nestjs/common';
import { ModelGatewayService, ChatMessage } from './model-gateway.service';

export interface RiskNarrativeInput {
  riskScore: number;
  riskTier: string;
  propertyAddress?: string;
  topFactors?: string[];
  expectedLoss?: number;
}

export interface RiskNarrativeResult {
  narrative: string;
  recommendations: string[];
  fallback: boolean;
}

@Injectable()
export class RiskNarrativeService {
  constructor(private readonly gateway: ModelGatewayService) {}

  async narrate(tenantId: string, input: RiskNarrativeInput): Promise<RiskNarrativeResult> {
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: `You are a risk analyst for a property management platform. Given a risk score and context, write a 2-3 sentence plain-language narrative explaining the risk, then provide 2-3 actionable recommendations. Respond ONLY with valid JSON: {"narrative":"string","recommendations":["string","string"]}.`,
      },
      {
        role: 'user',
        content: `Risk score: ${input.riskScore}/100 (tier: ${input.riskTier}).${input.propertyAddress ? ` Property: ${input.propertyAddress}.` : ''}${input.topFactors?.length ? ` Top factors: ${input.topFactors.join(', ')}.` : ''}${input.expectedLoss != null ? ` Expected 90-day loss: $${input.expectedLoss}.` : ''}`,
      },
    ];

    const result = await this.gateway.chat(tenantId, messages, { maxTokens: 384, temperature: 0.4, responseFormat: 'json' });

    if (result.fallback) {
      return { narrative: 'Risk analysis unavailable. Review the raw score manually.', recommendations: [], fallback: true };
    }

    try {
      const parsed = JSON.parse(result.content) as { narrative?: string; recommendations?: string[] };
      return {
        narrative: parsed.narrative ?? 'Risk analysis unavailable.',
        recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
        fallback: false,
      };
    } catch {
      return { narrative: 'Risk analysis unavailable.', recommendations: [], fallback: true };
    }
  }
}
