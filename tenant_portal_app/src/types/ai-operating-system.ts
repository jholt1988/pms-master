/**
 * AI Operating System Types
 * Type definitions for the unified AI Operating System
 */

export interface UserContext {
  userId: string | number;
  username: string;
  role: 'TENANT' | 'PROPERTY_MANAGER' | 'ADMIN';
  currentPage?: string;
  currentRoute?: string;
  leaseId?: number;
  propertyId?: number;
  recentActions?: string[];
  preferences?: Record<string, any>;
}

export interface CommandAction {
  type: 'navigate' | 'api_call' | 'service_call' | 'display_data';
  target: string;
  params?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface CommandResult {
  success: boolean;
  action: CommandAction;
  result?: any;
  error?: string;
  message?: string;
}

export interface PropertySearchCriteria {
  bedrooms?: number;
  bathrooms?: number;
  budget?: number;
  location?: string;
  moveInDate?: string;
  petFriendly?: boolean;
  amenities?: string[];
}

export interface ProactiveSuggestion {
  id: string;
  title: string;
  description: string;
  action: CommandAction;
  priority: number;
  category: 'maintenance' | 'payment' | 'lease' | 'general' | 'notification';
  timestamp: Date;
}

export interface AISystemMessage {
  id: string;
  type: 'user' | 'ai' | 'system' | 'command';
  content: string;
  timestamp: Date;
  confidence?: number;
  intent?: string;
  suggestedActions?: Array<{
    label: string;
    action: string;
    params?: Record<string, any>;
  }>;
  metadata?: Record<string, any>;
}

export interface AISession {
  id: string;
  userId: string | number;
  messages: AISystemMessage[];
  context: UserContext;
  createdAt: Date;
  updatedAt: Date;
}

export interface AIOperatingSystemConfig {
  enabled: boolean;
  useLLM: boolean;
  llmProvider?: 'openai' | 'anthropic' | 'mock';
  voiceInputEnabled: boolean;
  commandProcessingEnabled: boolean;
  proactiveSuggestionsEnabled: boolean;
  sessionTimeoutMinutes: number;
  maxSessionMessages: number;
}

