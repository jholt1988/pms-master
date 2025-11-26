/**
 * AI Chatbot Service
 * Provides intelligent conversational support for tenant inquiries
 * 
 * Features:
 * - FAQ-based responses with keyword matching
 * - Intent detection and classification
 * - Session management with context retention
 * - Confidence scoring for response quality
 * - Suggested actions and related questions
 * - Prepared for future LLM integration (OpenAI/Anthropic)
 * 
 * @domain Shared AI Services
 */

import {
  ChatMessage,
  ChatSession,
  ChatbotResponse,
  ChatbotConfig,
  IntentDetection,
  FAQCategory,
} from './types';
import { searchFAQs, getFAQsByCategory, getTopFAQs } from './faqDatabase';

/**
 * Generate a unique ID (browser-compatible)
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

export class ChatbotService {
  private config: ChatbotConfig;
  private sessions: Map<string, ChatSession>;
  private sessionCleanupInterval: NodeJS.Timeout | null;
  private feedback: Map<string, 'positive' | 'negative'>;

  constructor(config: Partial<ChatbotConfig> = {}) {
    this.config = {
      enabled: config.enabled ?? true,
      useLLM: config.useLLM ?? false, // Start with FAQ-based, prepare for LLM
      llmProvider: config.llmProvider ?? 'mock',
      model: config.model ?? 'gpt-4',
      temperature: config.temperature ?? 0.7,
      maxTokens: config.maxTokens ?? 500,
      minConfidenceThreshold: config.minConfidenceThreshold ?? 0.6,
      maxSessionMessages: config.maxSessionMessages ?? 100,
      sessionTimeoutMinutes: config.sessionTimeoutMinutes ?? 30,
    };

    this.sessions = new Map();
    this.sessionCleanupInterval = null;
    this.feedback = new Map();

    // Start session cleanup timer
    this.startSessionCleanup();
  }

  /**
   * Record user feedback for analytics.
   */
  recordFeedback(messageId: string, sentiment: 'positive' | 'negative') {
    if (!messageId) {
      throw new Error('Message ID is required for feedback');
    }
    this.feedback.set(messageId, sentiment);
  }

  /**
   * Send a message and get a response
   */
  async sendMessage(
    userId: string,
    message: string,
    sessionId?: string
  ): Promise<{ response: ChatbotResponse; sessionId: string; messageId: string }> {
    if (!this.config.enabled) {
      throw new Error('Chatbot service is disabled');
    }

    // Get or create session
    const session = sessionId ? this.getSession(sessionId) : this.createSession(userId);
    
    // Add user message to session
    const userMessage: ChatMessage = {
      id: generateId(),
      sessionId: session.id,
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
    };
    session.messages.push(userMessage);

    // Detect intent
    const intent = this.detectIntent(message);

    // Generate response
    let response: ChatbotResponse;
    if (this.config.useLLM && this.config.llmProvider !== 'mock') {
      // Future: Use LLM (OpenAI/Anthropic)
      response = await this.generateLLMResponse(message, session, intent);
    } else {
      // Use FAQ-based response
      response = this.generateFAQResponse(message, intent);
    }

    // Add assistant message to session
    const assistantMessage: ChatMessage = {
      id: generateId(),
      sessionId: session.id,
      role: 'assistant',
      content: response.message,
      timestamp: new Date().toISOString(),
      metadata: {
        intent: response.intent,
        confidence: response.confidence,
        actions: response.suggestedActions?.map(a => a.action),
      },
    };
    session.messages.push(assistantMessage);

    // Update session
    session.lastMessageAt = new Date().toISOString();
    this.sessions.set(session.id, session);

    // Trim old messages if session is too long
    this.trimSession(session);

    return {
      response,
      sessionId: session.id,
      messageId: assistantMessage.id,
    };
  }

  /**
   * Detect user intent from message
   */
  private detectIntent(message: string): IntentDetection {
    const lowerMessage = message.toLowerCase();

    // Category detection based on keywords
    const categoryScores = new Map<FAQCategory, number>();

    // Lease-related keywords
    if (/(lease|contract|term|renew|break|end|extend)/i.test(lowerMessage)) {
      categoryScores.set(FAQCategory.LEASE_TERMS, 0.8);
    }

    // Maintenance keywords
    if (/(repair|fix|broken|maintenance|not working|damaged|emergency)/i.test(lowerMessage)) {
      categoryScores.set(FAQCategory.MAINTENANCE, 0.9);
    }

    // Payment keywords
    if (/(pay|payment|rent|due|late|fee|autopay|charge)/i.test(lowerMessage)) {
      categoryScores.set(FAQCategory.PAYMENTS, 0.85);
    }

    // Rent optimization keywords
    if (/(rent|price|cost|market|increase|decrease|negotiate)/i.test(lowerMessage)) {
      categoryScores.set(FAQCategory.RENT_OPTIMIZATION, 0.75);
    }

    // Amenity keywords
    if (/(amenity|amenities|gym|pool|parking|facility|feature)/i.test(lowerMessage)) {
      categoryScores.set(FAQCategory.AMENITIES, 0.8);
    }

    // Policy keywords
    if (/(policy|rule|quiet|noise|sublease|guest|smoking)/i.test(lowerMessage)) {
      categoryScores.set(FAQCategory.POLICIES, 0.75);
    }

    // Emergency keywords
    if (/(emergency|urgent|gas|flood|fire|leak|help)/i.test(lowerMessage)) {
      categoryScores.set(FAQCategory.EMERGENCIES, 0.95);
    }

    // Get category with highest score
    let maxScore = 0;
    let detectedCategory = FAQCategory.GENERAL;
    categoryScores.forEach((score, category) => {
      if (score > maxScore) {
        maxScore = score;
        detectedCategory = category;
      }
    });

    // Determine specific intent
    let intent = 'general_inquiry';
    if (/(how|what|when|where|why)/i.test(lowerMessage)) {
      intent = 'information_request';
    } else if (/(submit|create|file|request|need)/i.test(lowerMessage)) {
      intent = 'action_request';
    } else if (/(can i|am i allowed|is it okay)/i.test(lowerMessage)) {
      intent = 'permission_inquiry';
    } else if (/(help|don't know|confused)/i.test(lowerMessage)) {
      intent = 'help_request';
    }

    return {
      intent,
      category: detectedCategory,
      confidence: Math.max(maxScore, 0.5), // Minimum 0.5 confidence
    };
  }

  /**
   * Generate FAQ-based response
   */
  private generateFAQResponse(message: string, intent: IntentDetection): ChatbotResponse {
    // Search FAQs for relevant answers
    const matchingFAQs = searchFAQs(message, intent.category);

    if (matchingFAQs.length > 0) {
      // Use best matching FAQ
      const bestMatch = matchingFAQs[0];
      
      // Calculate similarity confidence (simple keyword matching)
      const messageWords = message.toLowerCase().split(/\s+/).filter(w => w.length > 2);
      const matchedKeywords = bestMatch.keywords.filter(keyword =>
        messageWords.some(word => keyword.toLowerCase().includes(word) || word.includes(keyword.toLowerCase()))
      );
      const keywordConfidence = Math.min(0.95, matchedKeywords.length / bestMatch.keywords.length + 0.5);

      // Generate suggested actions based on category
      const suggestedActions = this.generateSuggestedActions(bestMatch.category, intent.intent);

      return {
        message: bestMatch.answer,
        intent: intent.intent,
        confidence: Math.max(keywordConfidence, intent.confidence),
        category: bestMatch.category,
        relatedQuestions: bestMatch.relatedQuestions,
        suggestedActions,
        source: 'faq',
      };
    }

    // Fallback response when no FAQ match
    return this.generateFallbackResponse(intent);
  }

  /**
   * Generate suggested actions based on category and intent
   */
  private generateSuggestedActions(
    category: FAQCategory,
    intent: string
  ): Array<{ label: string; action: string; params?: Record<string, any> }> {
    const actions: Array<{ label: string; action: string; params?: Record<string, any> }> = [];

    switch (category) {
      case FAQCategory.MAINTENANCE:
        actions.push(
          { label: 'Submit Maintenance Request', action: 'navigate', params: { page: '/maintenance' } },
          { label: 'View Open Requests', action: 'navigate', params: { page: '/maintenance?filter=open' } }
        );
        break;

      case FAQCategory.PAYMENTS:
        actions.push(
          { label: 'Make a Payment', action: 'navigate', params: { page: '/payments' } },
          { label: 'Set Up AutoPay', action: 'navigate', params: { page: '/payments/autopay' } },
          { label: 'View Payment History', action: 'navigate', params: { page: '/payments/history' } }
        );
        break;

      case FAQCategory.LEASE_TERMS:
        actions.push(
          { label: 'View My Lease', action: 'navigate', params: { page: '/lease' } },
          { label: 'Renew Lease', action: 'navigate', params: { page: '/lease/renew' } }
        );
        break;

      case FAQCategory.RENT_OPTIMIZATION:
        actions.push(
          { label: 'View Rent Analysis', action: 'navigate', params: { page: '/rent-estimator' } },
          { label: 'Compare Market Rates', action: 'navigate', params: { page: '/rent-estimator?view=comparables' } }
        );
        break;

      case FAQCategory.EMERGENCIES:
        actions.push(
          { label: 'Call Emergency Hotline', action: 'call', params: { phone: '555-123-4567' } },
          { label: 'Submit Emergency Request', action: 'navigate', params: { page: '/maintenance?priority=emergency' } }
        );
        break;

      default:
        actions.push(
          { label: 'Contact Property Manager', action: 'navigate', params: { page: '/messages' } },
          { label: 'View FAQ', action: 'show_faq', params: { category } }
        );
    }

    return actions;
  }

  /**
   * Generate fallback response when no FAQ matches
   */
  private generateFallbackResponse(intent: IntentDetection): ChatbotResponse {
    const fallbackMessages = [
      "I'm not sure I understand your question completely. Could you rephrase it or provide more details?",
      "I don't have a specific answer for that question. Let me show you some related topics that might help.",
      "That's a great question! While I don't have a direct answer, I can connect you with property management for personalized assistance.",
    ];

    // Get top FAQs for the detected category
    const categoryFAQs = getFAQsByCategory(intent.category).slice(0, 3);
    const relatedQuestions = categoryFAQs.map(faq => faq.question);

    return {
      message: fallbackMessages[Math.floor(Math.random() * fallbackMessages.length)],
      intent: intent.intent,
      confidence: 0.3, // Low confidence for fallback
      category: intent.category,
      relatedQuestions,
      suggestedActions: [
        { label: 'Contact Property Manager', action: 'navigate', params: { page: '/messages' } },
        { label: 'Browse All FAQs', action: 'show_faq', params: { category: intent.category } },
      ],
      source: 'fallback',
    };
  }

  /**
   * Generate LLM-based response (placeholder for future implementation)
   */
  private async generateLLMResponse(
    message: string,
    session: ChatSession,
    intent: IntentDetection
  ): Promise<ChatbotResponse> {
    try {
      // Get auth token from localStorage
      const token = localStorage.getItem('token');
      if (!token) {
        console.warn('No auth token found, falling back to FAQ');
        return this.generateFAQResponse(message, intent);
      }

      // Get API base URL
      const apiBase = import.meta.env.VITE_API_URL ?? '/api';

      // Call backend chatbot API
      const response = await fetch(`${apiBase}/chatbot/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          message,
          sessionId: session.id,
        }),
      });

      if (!response.ok) {
        throw new Error(`Chatbot API error: ${response.status}`);
      }

      const data = await response.json();

      // Convert backend response to frontend format
      return {
        message: data.message,
        intent: data.intent,
        confidence: data.confidence ?? 0.9,
        category: this.mapIntentToCategory(data.intent),
        suggestedActions: data.suggestedActions?.map((action: any) => ({
          label: action.label,
          action: action.action,
          params: action.params,
        })),
        source: 'llm',
      };
    } catch (error) {
      console.error('LLM response generation failed, falling back to FAQ:', error);
      return this.generateFAQResponse(message, intent);
    }
  }

  /**
   * Map intent to FAQ category
   */
  private mapIntentToCategory(intent?: string): FAQCategory | undefined {
    if (!intent) return undefined;

    const mapping: Record<string, FAQCategory> = {
      maintenance: FAQCategory.MAINTENANCE,
      payment: FAQCategory.PAYMENTS,
      lease: FAQCategory.LEASE_TERMS,
      amenities: FAQCategory.AMENITIES,
      emergency: FAQCategory.EMERGENCIES,
    };

    return mapping[intent.toLowerCase()];
  }

  /**
   * Create a new chat session
   */
  private createSession(userId: string): ChatSession {
    const session: ChatSession = {
      id: generateId(),
      userId,
      startedAt: new Date().toISOString(),
      lastMessageAt: new Date().toISOString(),
      status: 'active',
      messages: [],
      context: {},
    };

    this.sessions.set(session.id, session);
    return session;
  }

  /**
   * Get existing session
   */
  private getSession(sessionId: string): ChatSession {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }
    return session;
  }

  /**
   * Trim session messages to prevent memory issues
   */
  private trimSession(session: ChatSession): void {
    if (session.messages.length > this.config.maxSessionMessages) {
      // Keep first message (system context) and recent messages
      const systemMessages = session.messages.filter(m => m.role === 'system');
      const recentMessages = session.messages.slice(-this.config.maxSessionMessages + systemMessages.length);
      session.messages = [...systemMessages, ...recentMessages];
    }
  }

  /**
   * Close a session
   */
  closeSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.status = 'closed';
      this.sessions.set(sessionId, session);
    }
  }

  /**
   * Get session history
   */
  getSessionHistory(sessionId: string): ChatMessage[] {
    const session = this.sessions.get(sessionId);
    return session ? session.messages : [];
  }

  /**
   * Start periodic cleanup of expired sessions
   */
  private startSessionCleanup(): void {
    this.sessionCleanupInterval = setInterval(() => {
      const now = new Date();
      const timeoutMs = this.config.sessionTimeoutMinutes * 60 * 1000;

      this.sessions.forEach((session, sessionId) => {
        const lastMessageTime = new Date(session.lastMessageAt);
        if (now.getTime() - lastMessageTime.getTime() > timeoutMs) {
          session.status = 'closed';
          // Optionally remove old sessions to free memory
          // this.sessions.delete(sessionId);
        }
      });
    }, 5 * 60 * 1000); // Run every 5 minutes
  }

  /**
   * Stop session cleanup (for testing/shutdown)
   */
  stopSessionCleanup(): void {
    if (this.sessionCleanupInterval) {
      clearInterval(this.sessionCleanupInterval);
      this.sessionCleanupInterval = null;
    }
  }

  /**
   * Get popular FAQs for quick access
   */
  getPopularFAQs(limit: number = 10): Array<{ question: string; category: string }> {
    return getTopFAQs(limit).map(faq => ({
      question: faq.question,
      category: faq.category,
    }));
  }

  /**
   * Get FAQs by category
   */
  getFAQsByCategory(category: FAQCategory): Array<{ question: string; answer: string }> {
    return getFAQsByCategory(category).map(faq => ({
      question: faq.question,
      answer: faq.answer,
    }));
  }
}

// Export singleton instance
export const chatbotService = new ChatbotService();
