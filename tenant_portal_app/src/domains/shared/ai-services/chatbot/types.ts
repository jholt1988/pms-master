/**
 * AI Chatbot Types
 * Extended types for chatbot functionality
 */

import { ChatMessage, ChatSession } from '../types';

export type { ChatMessage, ChatSession };

/**
 * FAQ Categories for tenant inquiries
 */
export enum FAQCategory {
  LEASE_TERMS = 'lease_terms',
  MAINTENANCE = 'maintenance',
  PAYMENTS = 'payments',
  RENT_OPTIMIZATION = 'rent_optimization',
  AMENITIES = 'amenities',
  POLICIES = 'policies',
  EMERGENCIES = 'emergencies',
  GENERAL = 'general',
}

/**
 * FAQ Entry with pattern matching
 */
export interface FAQEntry {
  id: string;
  category: FAQCategory;
  question: string;
  answer: string;
  keywords: string[];
  relatedQuestions?: string[];
  priority: number; // 0-100, higher = more important
}

/**
 * Intent Detection Result
 */
export interface IntentDetection {
  intent: string;
  category: FAQCategory;
  confidence: number; // 0-1
  entities?: Record<string, any>;
  suggestedActions?: string[];
}

/**
 * Chatbot Response
 */
export interface ChatbotResponse {
  message: string;
  intent?: string;
  confidence: number;
  category?: FAQCategory;
  relatedQuestions?: string[];
  suggestedActions?: Array<{
    label: string;
    action: string;
    params?: Record<string, any>;
  }>;
  source: 'faq' | 'llm' | 'fallback';
}

/**
 * Chatbot Configuration
 */
export interface ChatbotConfig {
  enabled: boolean;
  useLLM: boolean;
  llmProvider?: 'openai' | 'anthropic' | 'mock';
  model?: string;
  temperature?: number;
  maxTokens?: number;
  minConfidenceThreshold: number; // 0-1, minimum confidence for FAQ match
  maxSessionMessages: number;
  sessionTimeoutMinutes: number;
}
