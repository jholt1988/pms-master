/**
 * AI Services Configuration
 * Centralized configuration for all AI features
 */

import { AIServiceConfig } from './types';

export interface AIServicesConfig {
  rentOptimization: AIServiceConfig & {
    marketDataProvider: 'zillow' | 'rentometer' | 'mock' | 'rentcast';
    updateInterval: number; // days
    minimumComparables: number;
  };
  chatbot: AIServiceConfig & {
    llmProvider: 'openai' | 'anthropic' | 'mock';
    model: string;
    maxTokens: number;
    temperature: number;
    systemPrompt: string;
  };
  smartBillEntry: AIServiceConfig & {
    ocrProvider: 'aws-textract' | 'google-vision' | 'mock';
    llmProvider: 'openai' | 'anthropic' | 'mock';
    autoApproveThreshold: number; // confidence 0-1
  };
  predictiveMaintenance: AIServiceConfig & {
    model: 'xgboost' | 'random-forest' | 'mock';
    predictionHorizon: number; // days
    minDataPoints: number;
    updateFrequency: number; // hours
  };
}

// Environment-based configuration
const getEnvVar = (key: string, defaultValue: string = ''): string => {
  // Support both Vite (import.meta.env with VITE_ prefix) and CRA (process.env with REACT_APP_ prefix)
  const viteKey = key;
  const craKey = key.replace('VITE_', 'REACT_APP_') as string;
  
  const value = (typeof import.meta !== 'undefined' && (import.meta.env as any)?.[viteKey]) || 
                (typeof process !== 'undefined' && (process.env as any)?.[craKey]);
  return value || defaultValue;
};

const getEnvBool = (key: string, defaultValue: boolean = false): boolean => {
  // Support both Vite (import.meta.env with VITE_ prefix) and CRA (process.env with REACT_APP_ prefix)
  const viteKey = key;
  const craKey = key.replace('VITE_', 'REACT_APP_') as string;
  
  const value = (typeof import.meta !== 'undefined' && (import.meta.env as any)?.[viteKey]) || 
                (typeof process !== 'undefined' && (process.env as any)?.[craKey]);
  if (value === undefined || value === null) return defaultValue;
  return value === 'true' || value === '1';
};

const getEnvNumber = (key: string, defaultValue: number): number => {
  // Support both Vite (import.meta.env with VITE_ prefix) and CRA (process.env with REACT_APP_ prefix)
  const viteKey = key;
  const craKey = key.replace('VITE_', 'REACT_APP_') as string;
  
  const value = (typeof import.meta !== 'undefined' && (import.meta.env as any)?.[viteKey]) || 
                (typeof process !== 'undefined' && (process.env as any)?.[craKey]);
  return value ? parseFloat(value) : defaultValue;
};

export const aiServicesConfig: AIServicesConfig = {
  rentOptimization: {
    enabled: getEnvBool('VITE_FEATURE_RENT_OPTIMIZATION', true),
    marketDataProvider: getEnvVar('VITE_MARKET_DATA_PROVIDER', 'mock') as any,
    endpoint: getEnvVar('VITE_ML_SERVICE_URL', 'http://localhost:5000'),
    apiKey: getEnvVar('VITE_RENTCAST_API_KEY'),
    timeout: getEnvNumber('VITE_AI_SERVICE_TIMEOUT', 10000),
    retryAttempts: 3,
    cacheEnabled: getEnvBool('VITE_CACHE_ENABLED', true),
    cacheTTL: getEnvNumber('VITE_RENT_CACHE_TTL', 86400), // 24 hours
    updateInterval: getEnvNumber('VITE_RENT_UPDATE_INTERVAL', 7), // 7 days
    minimumComparables: 3,
  },
  chatbot: {
    enabled: getEnvBool('VITE_FEATURE_CHATBOT', true),
    llmProvider: getEnvVar('VITE_LLM_PROVIDER', 'mock') as any,
    model: getEnvVar('VITE_LLM_MODEL', 'gpt-4o-mini'),
    endpoint: getEnvVar('VITE_LLM_ENDPOINT'),
    apiKey: getEnvVar('VITE_OPENAI_API_KEY'),
    timeout: getEnvNumber('VITE_AI_SERVICE_TIMEOUT', 30000),
    retryAttempts: 2,
    cacheEnabled: false, // Don't cache chat responses
    cacheTTL: 0,
    maxTokens: getEnvNumber('VITE_CHATBOT_MAX_TOKENS', 500),
    temperature: getEnvNumber('VITE_CHATBOT_TEMPERATURE', 0.7),
    systemPrompt: `You are a helpful property management assistant. You can help tenants and property managers with:
- Maintenance requests and status
- Lease information and payments
- General property questions
- Rental applications
Keep responses concise and professional. If you need to take an action, ask for confirmation first.`,
  },
  smartBillEntry: {
    enabled: getEnvBool('VITE_FEATURE_SMART_BILL_ENTRY', true),
    ocrProvider: getEnvVar('VITE_OCR_PROVIDER', 'mock') as any,
    llmProvider: getEnvVar('VITE_LLM_PROVIDER', 'mock') as any,
    endpoint: getEnvVar('VITE_ML_SERVICE_URL', 'http://localhost:5000'),
    apiKey: getEnvVar('VITE_AWS_TEXTRACT_KEY'),
    timeout: getEnvNumber('VITE_AI_SERVICE_TIMEOUT', 15000),
    retryAttempts: 2,
    cacheEnabled: getEnvBool('VITE_CACHE_ENABLED', true),
    cacheTTL: getEnvNumber('VITE_OCR_CACHE_TTL', 3600), // 1 hour
    autoApproveThreshold: getEnvNumber('VITE_AUTO_APPROVE_THRESHOLD', 0.95),
  },
  predictiveMaintenance: {
    enabled: getEnvBool('VITE_FEATURE_PREDICTIVE_MAINTENANCE', true),
    model: getEnvVar('VITE_PREDICTION_MODEL', 'mock') as any,
    endpoint: getEnvVar('VITE_ML_SERVICE_URL', 'http://localhost:5000'),
    apiKey: getEnvVar('VITE_ML_SERVICE_KEY'),
    timeout: getEnvNumber('VITE_AI_SERVICE_TIMEOUT', 20000),
    retryAttempts: 3,
    cacheEnabled: getEnvBool('VITE_CACHE_ENABLED', true),
    cacheTTL: getEnvNumber('VITE_PREDICTION_CACHE_TTL', 21600), // 6 hours
    predictionHorizon: getEnvNumber('VITE_PREDICTION_HORIZON', 90), // 90 days
    minDataPoints: getEnvNumber('VITE_MIN_DATA_POINTS', 10),
    updateFrequency: getEnvNumber('VITE_PREDICTION_UPDATE_FREQ', 24), // 24 hours
  },
};

// Validation helper
export const validateAIConfig = (): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  // Check if any features are enabled
  const anyEnabled = Object.values(aiServicesConfig).some(config => config.enabled);
  if (!anyEnabled) {
    errors.push('No AI features are enabled');
  }

  // Validate rent optimization
  if (aiServicesConfig.rentOptimization.enabled) {
    if (aiServicesConfig.rentOptimization.marketDataProvider === 'zillow' && 
        !aiServicesConfig.rentOptimization.apiKey) {
      errors.push('Zillow API key required for rent optimization');
    }
  }

  // Validate chatbot
  if (aiServicesConfig.chatbot.enabled) {
    if (aiServicesConfig.chatbot.llmProvider !== 'mock' && 
        !aiServicesConfig.chatbot.apiKey) {
      errors.push('LLM API key required for chatbot');
    }
  }

  // Validate smart bill entry
  if (aiServicesConfig.smartBillEntry.enabled) {
    if (aiServicesConfig.smartBillEntry.ocrProvider === 'aws-textract' && 
        !aiServicesConfig.smartBillEntry.apiKey) {
      errors.push('AWS Textract credentials required for smart bill entry');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

// Export for use in components
export default aiServicesConfig;
