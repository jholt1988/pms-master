import { Injectable } from '@nestjs/common';
import { ModelGatewayService, ChatMessage } from './model-gateway.service';

export type TriageUrgency = 'low' | 'medium' | 'high' | 'emergency';
export type TriageCategory = 'plumbing' | 'electrical' | 'hvac' | 'structural' | 'appliance' | 'pest' | 'safety' | 'other';

export interface TriageResult {
  urgency: TriageUrgency;
  category: TriageCategory;
  suggestedVendorType: string;
  summary: string;
  fallback: boolean;
}

const VALID_URGENCIES: TriageUrgency[] = ['low', 'medium', 'high', 'emergency'];
const VALID_CATEGORIES: TriageCategory[] = ['plumbing', 'electrical', 'hvac', 'structural', 'appliance', 'pest', 'safety', 'other'];

@Injectable()
export class MaintenanceTriageService {
  constructor(private readonly gateway: ModelGatewayService) {}

  async triage(tenantId: string, description: string, propertyContext?: string): Promise<TriageResult> {
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: `You are a maintenance triage assistant for a property management system. Given a maintenance request description, classify it. Respond ONLY with valid JSON: {"urgency":"low|medium|high|emergency","category":"plumbing|electrical|hvac|structural|appliance|pest|safety|other","suggestedVendorType":"string","summary":"one sentence"}. Urgency: emergency = safety risk or water/fire damage; high = major inconvenience, needs same-day; medium = needs attention within a week; low = cosmetic or non-urgent.`,
      },
      {
        role: 'user',
        content: propertyContext
          ? `Property context: ${propertyContext}\n\nMaintenance request: ${description}`
          : `Maintenance request: ${description}`,
      },
    ];

    const result = await this.gateway.chat(tenantId, messages, { maxTokens: 256, temperature: 0.1, responseFormat: 'json' });

    if (result.fallback) {
      return { urgency: 'medium', category: 'other', suggestedVendorType: 'general contractor', summary: 'AI unavailable; manual triage required.', fallback: true };
    }

    try {
      const parsed = JSON.parse(result.content) as { urgency?: string; category?: string; suggestedVendorType?: string; summary?: string };
      return {
        urgency: VALID_URGENCIES.includes(parsed.urgency as TriageUrgency) ? (parsed.urgency as TriageUrgency) : 'medium',
        category: VALID_CATEGORIES.includes(parsed.category as TriageCategory) ? (parsed.category as TriageCategory) : 'other',
        suggestedVendorType: parsed.suggestedVendorType ?? 'general contractor',
        summary: parsed.summary ?? description.slice(0, 100),
        fallback: false,
      };
    } catch {
      return { urgency: 'medium', category: 'other', suggestedVendorType: 'general contractor', summary: description.slice(0, 100), fallback: true };
    }
  }
}
