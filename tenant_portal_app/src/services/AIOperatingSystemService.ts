/**
 * AI Operating System Service
 * Unified AI service that absorbs ChatbotService functionality and integrates
 * with all AI services (LeasingAgent, RentOptimization, etc.)
 */

import { apiFetch } from './apiClient';
import {
  UserContext,
  CommandAction,
  CommandResult,
  PropertySearchCriteria,
  ProactiveSuggestion,
  AISystemMessage,
  AISession,
  AIOperatingSystemConfig,
} from '../types/ai-operating-system';
import {
  FAQCategory,
  FAQEntry,
  IntentDetection,
  ChatbotResponse,
} from '../domains/shared/ai-services/chatbot/types';
import { searchFAQs, getFAQsByCategory, getTopFAQs } from '../domains/shared/ai-services/chatbot/faqDatabase';
import { leasingAgentService, LeasingAgentService } from './LeasingAgentService';
import { rentOptimizationService } from '../domains/shared/ai-services/rent-optimization/RentOptimizationService';

/**
 * Generate a unique ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

export class AIOperatingSystemService {
  private config: AIOperatingSystemConfig;
  private sessions: Map<string, AISession>;
  private sessionCleanupInterval: NodeJS.Timeout | null;

  private leasingAgentService: LeasingAgentService;

  constructor(config: Partial<AIOperatingSystemConfig> = {}) {
    this.config = {
      enabled: config.enabled ?? true,
      useLLM: config.useLLM ?? true, // Default to using LLM via backend
      llmProvider: config.llmProvider ?? 'openai',
      voiceInputEnabled: config.voiceInputEnabled ?? true,
      commandProcessingEnabled: config.commandProcessingEnabled ?? true,
      proactiveSuggestionsEnabled: config.proactiveSuggestionsEnabled ?? true,
      sessionTimeoutMinutes: config.sessionTimeoutMinutes ?? 30,
      maxSessionMessages: config.maxSessionMessages ?? 100,
    };

    this.sessions = new Map();
    this.sessionCleanupInterval = null;
    this.leasingAgentService = new LeasingAgentService();

    // Start session cleanup timer
    this.startSessionCleanup();
  }

  /**
   * Send a message and get an AI-powered response
   */
  async sendMessage(
    userId: string | number,
    message: string,
    sessionId?: string,
    token?: string,
    context?: UserContext,
  ): Promise<{ response: AISystemMessage; sessionId: string }> {
    if (!this.config.enabled) {
      throw new Error('AI Operating System is disabled');
    }

    // Get or create session
    const session = sessionId ? this.getSession(sessionId) : this.createSession(userId, context);

    // Update context if provided
    if (context) {
      session.context = { ...session.context, ...context };
    }

    // Add user message to session
    const userMessage: AISystemMessage = {
      id: generateId(),
      type: 'user',
      content: message,
      timestamp: new Date(),
    };
    session.messages.push(userMessage);

    // Check if message is a command
    let aiResponse: AISystemMessage;
    if (this.config.commandProcessingEnabled && this.isCommand(message)) {
      // Process as command
      const commandResult = await this.processCommand(message, session.context, token);
      aiResponse = {
        id: generateId(),
        type: 'command',
        content: commandResult.message || (commandResult.success ? 'Command executed successfully.' : 'Command failed.'),
        timestamp: new Date(),
        metadata: {
          commandResult,
          success: commandResult.success,
        },
      };
    } else {
      // Process as regular message
      const intent = this.detectIntent(message);
      let chatbotResponse: ChatbotResponse;

      if (this.config.useLLM && token) {
        // Use LLM via backend API
        chatbotResponse = await this.generateLLMResponse(message, session, token);
      } else {
        // Use FAQ-based response
        chatbotResponse = this.generateFAQResponse(message, intent);
      }

      aiResponse = {
        id: generateId(),
        type: 'ai',
        content: chatbotResponse.message,
        timestamp: new Date(),
        confidence: chatbotResponse.confidence,
        intent: chatbotResponse.intent,
        suggestedActions: chatbotResponse.suggestedActions,
        metadata: {
          source: chatbotResponse.source,
          category: chatbotResponse.category,
        },
      };
    }

    session.messages.push(aiResponse);
    session.updatedAt = new Date();
    this.sessions.set(session.id, session);

    // Trim old messages if session is too long
    this.trimSession(session);

    return {
      response: aiResponse,
      sessionId: session.id,
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
    if (/(lease|contract|term|renew|break|end|extend|draft)/i.test(lowerMessage)) {
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
    if (/(rent|price|cost|market|increase|decrease|negotiate|analyze|optimize)/i.test(lowerMessage)) {
      categoryScores.set(FAQCategory.RENT_OPTIMIZATION, 0.75);
    }

    // Amenity keywords
    if (/(amenity|amenities|gym|pool|parking|facility|feature)/i.test(lowerMessage)) {
      categoryScores.set(FAQCategory.AMENITIES, 0.8);
    }

    // Property search keywords (important for prospective tenants)
    if (/(search|find|property|vacancy|available|show|list|browse|view|see|units|apartment|rental)/i.test(lowerMessage)) {
      categoryScores.set(FAQCategory.GENERAL, 0.8);
    }

    // Application/rental process keywords (for prospective tenants)
    if (/(apply|application|how to|process|step|requirement|document|qualify)/i.test(lowerMessage)) {
      categoryScores.set(FAQCategory.GENERAL, 0.75);
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
    } else if (/(submit|create|file|request|need|draft|schedule)/i.test(lowerMessage)) {
      intent = 'action_request';
    } else if (/(can i|am i allowed|is it okay)/i.test(lowerMessage)) {
      intent = 'permission_inquiry';
    } else if (/(help|don't know|confused)/i.test(lowerMessage)) {
      intent = 'help_request';
    }

    return {
      intent,
      category: detectedCategory,
      confidence: Math.max(maxScore, 0.5),
    };
  }

  /**
   * Generate FAQ-based response
   */
  private generateFAQResponse(message: string, intent: IntentDetection): ChatbotResponse {
    const matchingFAQs = searchFAQs(message, intent.category);

    if (matchingFAQs.length > 0) {
      const bestMatch = matchingFAQs[0];
      const messageWords = message.toLowerCase().split(/\s+/).filter(w => w.length > 2);
      const matchedKeywords = bestMatch.keywords.filter(keyword =>
        messageWords.some(word => keyword.toLowerCase().includes(word) || word.includes(keyword.toLowerCase()))
      );
      const keywordConfidence = Math.min(0.95, matchedKeywords.length / bestMatch.keywords.length + 0.5);

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

    return this.generateFallbackResponse(intent);
  }

  /**
   * Generate LLM-based response via backend API
   */
  private async generateLLMResponse(
    message: string,
    session: AISession,
    token: string,
  ): Promise<ChatbotResponse> {
    try {
      const response = await apiFetch('/chatbot/message', {
        method: 'POST',
        token,
        body: {
          message,
          sessionId: session.id,
        },
      });

      return {
        message: response.message,
        intent: response.intent,
        confidence: response.confidence ?? 0.9,
        suggestedActions: response.suggestedActions,
        source: 'llm',
      };
    } catch (error) {
      console.error('LLM response generation failed, falling back to FAQ:', error);
      const intent = this.detectIntent(message);
      return this.generateFAQResponse(message, intent);
    }
  }

  /**
   * Generate suggested actions based on category and intent
   */
  private generateSuggestedActions(
    category: FAQCategory,
    intent: string,
  ): Array<{ label: string; action: string; params?: Record<string, any> }> {
    const actions: Array<{ label: string; action: string; params?: Record<string, any> }> = [];

    switch (category) {
      case FAQCategory.MAINTENANCE:
        actions.push(
          { label: 'Submit Maintenance Request', action: 'navigate', params: { path: '/maintenance' } },
          { label: 'View Open Requests', action: 'navigate', params: { path: '/maintenance?filter=open' } }
        );
        break;

      case FAQCategory.GENERAL:
        // Property search actions (available to all users)
        if (/(search|find|property|vacancy|available|show|list|browse|view|see|units|apartment|rental)/i.test(intent)) {
          actions.push(
            { label: 'Browse Properties', action: 'navigate', params: { path: '/properties/search' } },
            { label: 'Start Application', action: 'navigate', params: { path: '/rental-application' } }
          );
        }
        // Application process actions (for prospective tenants)
        if (/(apply|application|how to|process|step|requirement|document|qualify)/i.test(intent)) {
          actions.push(
            { label: 'Start Application', action: 'navigate', params: { path: '/rental-application' } },
            { label: 'View Requirements', action: 'navigate', params: { path: '/rental-application' } }
          );
        }
        break;

      case FAQCategory.PAYMENTS:
        actions.push(
          { label: 'Make a Payment', action: 'navigate', params: { path: '/payments' } },
          { label: 'Set Up AutoPay', action: 'navigate', params: { path: '/payments/autopay' } },
          { label: 'View Payment History', action: 'navigate', params: { path: '/payments/history' } }
        );
        break;

      case FAQCategory.LEASE_TERMS:
        actions.push(
          { label: 'View My Lease', action: 'navigate', params: { path: '/lease' } },
          { label: 'Renew Lease', action: 'navigate', params: { path: '/lease/renew' } }
        );
        break;

      case FAQCategory.RENT_OPTIMIZATION:
        actions.push(
          { label: 'View Rent Analysis', action: 'navigate', params: { path: '/rent-optimization' } },
          { label: 'Compare Market Rates', action: 'navigate', params: { path: '/rent-optimization' } }
        );
        break;

      case FAQCategory.EMERGENCIES:
        actions.push(
          { label: 'Call Emergency Hotline', action: 'call', params: { phone: '555-123-4567' } },
          { label: 'Submit Emergency Request', action: 'navigate', params: { path: '/maintenance?priority=emergency' } }
        );
        break;

      default:
        actions.push(
          { label: 'Contact Property Manager', action: 'navigate', params: { path: '/messages' } },
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

    const categoryFAQs = getFAQsByCategory(intent.category).slice(0, 3);
    const relatedQuestions = categoryFAQs.map(faq => faq.question);

    return {
      message: fallbackMessages[Math.floor(Math.random() * fallbackMessages.length)],
      intent: intent.intent,
      confidence: 0.3,
      category: intent.category,
      relatedQuestions,
      suggestedActions: [
        { label: 'Contact Property Manager', action: 'navigate', params: { path: '/messages' } },
      ],
      source: 'fallback',
    };
  }

  /**
   * Check if message is a command
   */
  private isCommand(message: string): boolean {
    const commandPatterns = [
      /^(draft|create|generate|make|build)\s+/i,
      /^(analyze|check|show|display|list|find|search)\s+/i,
      /^(schedule|book|set up)\s+/i,
      /^(email|send|message)\s+/i,
    ];
    return commandPatterns.some(pattern => pattern.test(message));
  }

  /**
   * Process command and execute action
   */
  async processCommand(
    command: string,
    context: UserContext,
    token?: string,
  ): Promise<CommandResult> {
    const lowerCommand = command.toLowerCase();

    // Draft Lease Renewal
    if (/(draft|create|generate).*lease.*renew/i.test(lowerCommand)) {
      return {
        success: true,
        action: {
          type: 'navigate',
          target: '/lease/renew',
        },
        message: 'Opening lease renewal page...',
      };
    }

    // Analyze Market Rates / Rent Optimization
    if (/(analyze|check|show|optimize).*(rent|market|rate)/i.test(lowerCommand)) {
      if (context.propertyId) {
        try {
          const recommendation = await rentOptimizationService.getRecommendation(
            context.propertyId.toString(),
          );
          return {
            success: true,
            action: {
              type: 'display_data',
              target: 'rent_recommendation',
              params: { recommendation },
            },
            result: recommendation,
            message: `Rent analysis complete. Recommended rent: $${recommendation.data?.recommendedRent || 'N/A'}`,
          };
        } catch (error) {
          return {
            success: false,
            action: {
              type: 'navigate',
              target: '/rent-optimization',
            },
            error: error instanceof Error ? error.message : 'Unknown error',
            message: 'Opening rent optimization dashboard...',
          };
        }
      }
      return {
        success: true,
        action: {
          type: 'navigate',
          target: '/rent-optimization',
        },
        message: 'Opening rent optimization dashboard...',
      };
    }

    // Show Vacancies / Search Properties
    if (/(show|list|find|search).*(vacanc|propert|unit|available)/i.test(lowerCommand)) {
      return {
        success: true,
        action: {
          type: 'navigate',
          target: '/properties/search',
        },
        message: 'Opening property search...',
      };
    }

    // Email All Tenants / Bulk Messaging
    if (/(email|message|send).*(all|tenant|bulk)/i.test(lowerCommand)) {
      return {
        success: true,
        action: {
          type: 'navigate',
          target: '/messaging/bulk',
        },
        message: 'Opening bulk messaging composer...',
      };
    }

    // Schedule Tour
    if (/(schedule|book|set up).*(tour|showing|viewing)/i.test(lowerCommand)) {
      return {
        success: true,
        action: {
          type: 'navigate',
          target: '/leasing/tours',
        },
        message: 'Opening tour scheduling...',
      };
    }

    // Create Maintenance Request
    if (/(create|submit|file).*(maintenance|repair|request)/i.test(lowerCommand)) {
      return {
        success: true,
        action: {
          type: 'navigate',
          target: '/maintenance/new',
        },
        message: 'Opening maintenance request form...',
      };
    }

    // Default: treat as regular message
    return {
      success: false,
      action: {
        type: 'api_call',
        target: 'chat',
      },
      message: 'Command not recognized. Processing as regular message...',
    };
  }

  /**
   * Search properties using LeasingAgentService
   */
  async searchProperties(
    criteria: PropertySearchCriteria,
    token?: string,
  ): Promise<any> {
    try {
      // Use LeasingAgentService for property search
      const sessionId = `search-${Date.now()}`;
      const leadInfo = {
        bedrooms: criteria.bedrooms,
        budget: criteria.budget,
        moveInDate: criteria.moveInDate,
        petFriendly: criteria.petFriendly,
      };

      // This would integrate with LeasingAgentService's property search
      // For now, return a navigation action
      return {
        success: true,
        action: {
          type: 'navigate',
          target: '/properties/search',
          params: criteria,
        },
        message: 'Searching for properties...',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Property search failed.',
      };
    }
  }

  /**
   * Get proactive suggestions based on user context
   */
  async getProactiveSuggestions(context: UserContext): Promise<ProactiveSuggestion[]> {
    if (!this.config.proactiveSuggestionsEnabled) {
      return [];
    }

    const suggestions: ProactiveSuggestion[] = [];

    // Example: Check for upcoming rent due date
    // This would typically come from API data
    if (context.role === 'TENANT') {
      suggestions.push({
        id: 'rent-due-reminder',
        title: 'Rent Due Soon',
        description: 'Your rent is due in 5 days. Set up autopay to never miss a payment.',
        action: {
          type: 'navigate',
          target: '/payments/autopay',
        },
        priority: 8,
        category: 'payment',
        timestamp: new Date(),
      });
    }

    // Example: Lease renewal suggestion
    if (context.leaseId) {
      suggestions.push({
        id: 'lease-renewal',
        title: 'Lease Renewal Available',
        description: 'Your lease expires in 30 days. Would you like to renew?',
        action: {
          type: 'navigate',
          target: '/lease/renew',
        },
        priority: 7,
        category: 'lease',
        timestamp: new Date(),
      });
    }

    return suggestions.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Update user context
   */
  updateContext(sessionId: string, context: Partial<UserContext>): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.context = { ...session.context, ...context };
      this.sessions.set(sessionId, session);
    }
  }

  /**
   * Create a new session
   */
  private createSession(userId: string | number, context?: UserContext): AISession {
    const session: AISession = {
      id: generateId(),
      userId,
      messages: [
        {
          id: generateId(),
          type: 'system',
          content: 'PMS.OS Neural Interface Initialized. Ready for commands.',
          timestamp: new Date(),
        },
      ],
      context: context || {
        userId,
        username: '',
        role: 'TENANT',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.sessions.set(session.id, session);
    return session;
  }

  /**
   * Get existing session
   */
  private getSession(sessionId: string): AISession {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }
    return session;
  }

  /**
   * Get session history
   */
  getSessionHistory(sessionId: string): AISystemMessage[] {
    const session = this.sessions.get(sessionId);
    return session ? session.messages : [];
  }

  /**
   * Trim session messages to prevent memory issues
   */
  private trimSession(session: AISession): void {
    if (session.messages.length > this.config.maxSessionMessages) {
      const systemMessages = session.messages.filter(m => m.type === 'system');
      const recentMessages = session.messages.slice(-this.config.maxSessionMessages + systemMessages.length);
      session.messages = [...systemMessages, ...recentMessages];
    }
  }

  /**
   * Start periodic cleanup of expired sessions
   */
  private startSessionCleanup(): void {
    this.sessionCleanupInterval = setInterval(() => {
      const now = new Date();
      const timeoutMs = this.config.sessionTimeoutMinutes * 60 * 1000;

      this.sessions.forEach((session, sessionId) => {
        if (now.getTime() - session.updatedAt.getTime() > timeoutMs) {
          // Optionally remove old sessions
          // this.sessions.delete(sessionId);
        }
      });
    }, 5 * 60 * 1000); // Run every 5 minutes
  }

  /**
   * Stop session cleanup
   */
  stopSessionCleanup(): void {
    if (this.sessionCleanupInterval) {
      clearInterval(this.sessionCleanupInterval);
      this.sessionCleanupInterval = null;
    }
  }
}

// Export singleton instance
export const aiOperatingSystemService = new AIOperatingSystemService();

