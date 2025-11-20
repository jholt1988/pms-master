/**
 * Shared TypeScript types for AI services
 * Domain: Shared AI Services
 */

// ========== Rent Optimization Types ==========

export interface RentFactor {
  name: string;
  impact: number; // -100 to +100 (percentage impact)
  description: string;
}

export interface MarketComparable {
  address: string;
  distance: number; // miles
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  rent: number;
  listingDate: string;
  similarity: number; // 0-1 score
}

export interface RentRecommendation {
  id?: string; // Backend recommendation ID
  unitId: string;
  currentRent: number;
  recommendedRent: number;
  confidenceInterval: {
    low: number;
    high: number;
  };
  factors: RentFactor[];
  marketComparables: MarketComparable[];
  modelVersion: string;
  generatedAt: string;
  status: 'pending' | 'accepted' | 'rejected';
  reasoning?: string;
}

// ========== AI Chatbot Types ==========

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  metadata?: {
    intent?: string;
    confidence?: number;
    actions?: string[];
  };
}

export interface ChatSession {
  id: string;
  userId: string;
  startedAt: string;
  lastMessageAt: string;
  status: 'active' | 'closed';
  messages: ChatMessage[];
  context?: Record<string, any>;
}

// ========== Smart Bill Entry Types ==========

export interface OCRResult {
  rawText: string;
  confidence: number;
  extractedData: {
    vendor?: string;
    amount?: number;
    date?: string;
    category?: string;
    description?: string;
  };
}

export interface TransactionClassification {
  category: string;
  subcategory?: string;
  confidence: number;
  suggestedAccount?: string;
  tags: string[];
  reasoning?: string;
}

// ========== Predictive Maintenance Types ==========

export interface EquipmentPrediction {
  equipmentId: string;
  equipmentType: string;
  failureProbability: number; // 0-1
  predictedFailureDate?: string;
  recommendedAction: 'monitor' | 'schedule_inspection' | 'schedule_maintenance' | 'urgent_replacement';
  confidenceScore: number;
  factors: Array<{
    name: string;
    value: any;
    impact: number;
  }>;
  estimatedCost?: {
    preventiveMaintenance: number;
    reactiveRepair: number;
    savings: number;
  };
}

// ========== Common AI Service Types ==========

export interface AIServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: AIServiceError;
  metadata: {
    requestId: string;
    timestamp: string;
    processingTime: number; // milliseconds
    modelVersion?: string;
    cached?: boolean;
  };
}

export interface AIServiceError {
  code: string;
  message: string;
  details?: Record<string, any>;
  retryable: boolean;
}

export interface AIServiceConfig {
  enabled: boolean;
  endpoint?: string;
  apiKey?: string;
  timeout: number;
  retryAttempts: number;
  cacheEnabled: boolean;
  cacheTTL: number; // seconds
}
