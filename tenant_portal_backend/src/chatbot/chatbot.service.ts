import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import OpenAI from 'openai';

export interface ChatbotMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
}

export interface ChatbotSession {
  id: string;
  userId: number;
  messages: ChatbotMessage[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatbotResponse {
  message: string;
  sessionId: string;
  intent?: string;
  confidence?: number;
  suggestedActions?: Array<{
    label: string;
    action: string;
    params?: Record<string, any>;
  }>;
}

@Injectable()
export class ChatbotService {
  private readonly logger = new Logger(ChatbotService.name);
  private openai: OpenAI | null = null;
  private readonly aiEnabled: boolean;
  private readonly sessions: Map<string, ChatbotSession> = new Map();

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    const aiEnabled = this.configService.get<string>('AI_ENABLED', 'false') === 'true';
    const chatbotEnabled = this.configService.get<string>('AI_CHATBOT_ENABLED', 'true') === 'true';

    this.aiEnabled = aiEnabled && chatbotEnabled;

    if (this.aiEnabled && apiKey) {
      this.openai = new OpenAI({ apiKey });
      this.logger.log('Chatbot Service initialized with OpenAI');
    } else {
      this.logger.warn(
        'Chatbot Service initialized in mock mode (no OpenAI API key or AI disabled)',
      );
    }
  }

  /**
   * Send a message to the chatbot and get an AI-powered response
   */
  async sendMessage(
    userId: number,
    message: string,
    sessionId?: string,
  ): Promise<ChatbotResponse> {
    const startTime = Date.now();

    try {
      // Get or create session
      let session = sessionId ? this.getSession(sessionId) : this.createSession(userId);

      // Add user message to session
      session.messages.push({
        role: 'user',
        content: message,
        timestamp: new Date(),
      });

      // Generate AI response
      let aiResponse: string;
      let intent: string | undefined;
      let confidence: number | undefined;

      if (this.openai && this.aiEnabled) {
        const response = await this.generateAIResponse(session, message);
        aiResponse = response.content;
        intent = response.intent;
        confidence = response.confidence;
      } else {
        // Fallback to simple responses
        aiResponse = this.generateFallbackResponse(message);
        confidence = 0.5;
      }

      // Add assistant response to session
      session.messages.push({
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date(),
      });

      session.updatedAt = new Date();
      this.sessions.set(session.id, session);

      const responseTime = Date.now() - startTime;

      // Structured logging
      this.logger.log('Chatbot message processed', {
        service: 'ChatbotService',
        method: 'sendMessage',
        userId,
        sessionId: session.id,
        responseTime,
        success: true,
        intent,
        confidence,
        messageLength: message.length,
        responseLength: aiResponse.length,
      });

      // Generate suggested actions based on intent
      const suggestedActions = this.generateSuggestedActions(intent, message);

      return {
        message: aiResponse,
        sessionId: session.id,
        intent,
        confidence,
        suggestedActions,
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.logger.error('Chatbot message processing failed', {
        service: 'ChatbotService',
        method: 'sendMessage',
        userId,
        sessionId,
        responseTime,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });

      // Return fallback response on error
      return {
        message: this.generateFallbackResponse(message),
        sessionId: sessionId || this.createSession(userId).id,
        confidence: 0.3,
      };
    }
  }

  /**
   * Generate AI-powered response using OpenAI
   */
  private async generateAIResponse(
    session: ChatbotSession,
    userMessage: string,
  ): Promise<{ content: string; intent?: string; confidence?: number }> {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized');
    }

    // Get user context from database
    const user = await this.prisma.user.findUnique({
      where: { id: session.userId },
      include: {
        lease: {
          include: {
            unit: {
              include: {
                property: true,
              },
            },
          },
        },
      },
    });

    // Build system prompt with user context
    let systemPrompt = `You are a helpful property management assistant. Your role is to help tenants with questions about:
- Lease terms and renewals
- Maintenance requests
- Rent payments and billing
- Property amenities and policies
- General property management questions

Be friendly, professional, and concise. Provide actionable information when possible.`;

    // Add user-specific context
    if (user?.lease) {
      systemPrompt += `\n\nCurrent tenant context:
- Lease ID: ${user.lease.id}
- Property: ${user.lease.unit?.property?.name || 'N/A'}
- Unit: ${user.lease.unit?.unitNumber || 'N/A'}
- Rent: $${user.lease.rentAmount || 0}/month`;
    }

    // Build conversation history (last 10 messages for context)
    const recentMessages = session.messages.slice(-10);
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: systemPrompt,
      },
    ];

    // Add conversation history
    for (const msg of recentMessages) {
      if (msg.role !== 'system') {
        messages.push({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content,
        });
      }
    }

    // Add current user message
    messages.push({
      role: 'user',
      content: userMessage,
    });

    // Call OpenAI API
    const response = await this.openai.chat.completions.create({
      model: this.configService.get<string>('OPENAI_MODEL', 'gpt-4o-mini'),
      messages,
      temperature: this.configService.get<number>('OPENAI_TEMPERATURE', 0.7),
      max_tokens: this.configService.get<number>('OPENAI_MAX_TOKENS', 500),
    });

    const content = response.choices[0]?.message?.content || 'I apologize, but I could not generate a response.';

    // Try to extract intent from response (simple keyword matching for now)
    const intent = this.detectIntent(userMessage);

    return {
      content,
      intent,
      confidence: 0.9, // High confidence for AI responses
    };
  }

  /**
   * Detect intent from user message
   */
  private detectIntent(message: string): string {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.match(/\b(repair|fix|broken|leak|maintenance|issue|problem)\b/)) {
      return 'maintenance';
    }
    if (lowerMessage.match(/\b(pay|rent|payment|bill|invoice|due|autopay)\b/)) {
      return 'payment';
    }
    if (lowerMessage.match(/\b(renew|lease|extend|terminate|move out)\b/)) {
      return 'lease';
    }
    if (lowerMessage.match(/\b(amenity|parking|gym|pool|facility)\b/)) {
      return 'amenities';
    }
    if (lowerMessage.match(/\b(emergency|urgent|fire|gas|flood)\b/)) {
      return 'emergency';
    }

    return 'general';
  }

  /**
   * Generate suggested actions based on intent
   */
  private generateSuggestedActions(
    intent?: string,
    message?: string,
  ): Array<{ label: string; action: string; params?: Record<string, any> }> {
    const actions: Array<{ label: string; action: string; params?: Record<string, any> }> = [];

    switch (intent) {
      case 'maintenance':
        actions.push({
          label: 'Submit Maintenance Request',
          action: 'navigate',
          params: { path: '/maintenance/new' },
        });
        break;
      case 'payment':
        actions.push({
          label: 'View Invoices',
          action: 'navigate',
          params: { path: '/payments' },
        });
        actions.push({
          label: 'Make Payment',
          action: 'navigate',
          params: { path: '/payments/pay' },
        });
        break;
      case 'lease':
        actions.push({
          label: 'View Lease',
          action: 'navigate',
          params: { path: '/lease' },
        });
        break;
      default:
        actions.push({
          label: 'Contact Support',
          action: 'navigate',
          params: { path: '/messaging' },
        });
    }

    return actions;
  }

  /**
   * Generate fallback response when AI is not available
   */
  private generateFallbackResponse(message: string): string {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('maintenance') || lowerMessage.includes('repair')) {
      return 'I can help you with maintenance requests. You can submit a maintenance request through the maintenance section of your portal, or I can help you create one now.';
    }

    if (lowerMessage.includes('pay') || lowerMessage.includes('rent')) {
      return 'I can help you with payment questions. Rent is typically due on the 1st of each month. You can view your invoices and make payments in the Payments section of your portal.';
    }

    if (lowerMessage.includes('lease') || lowerMessage.includes('renew')) {
      return 'I can help you with lease-related questions. You can view your lease details and renewal options in the Lease section of your portal.';
    }

    return 'I\'m here to help! I can assist you with maintenance requests, payments, lease questions, and more. What would you like to know?';
  }

  /**
   * Create a new chat session
   */
  private createSession(userId: number): ChatbotSession {
    const session: ChatbotSession = {
      id: `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId,
      messages: [
        {
          role: 'system',
          content: 'You are a helpful property management assistant.',
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.sessions.set(session.id, session);
    return session;
  }

  /**
   * Get existing session
   */
  private getSession(sessionId: string): ChatbotSession {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }
    return session;
  }

  /**
   * Get session history
   */
  async getSessionHistory(sessionId: string, userId: number): Promise<ChatbotMessage[]> {
    const session = this.getSession(sessionId);
    if (session.userId !== userId) {
      throw new Error('Unauthorized access to session');
    }
    return session.messages.filter((m) => m.role !== 'system');
  }

  /**
   * Clear old sessions (run periodically)
   */
  clearOldSessions(olderThanMinutes: number = 60): void {
    const cutoffTime = new Date(Date.now() - olderThanMinutes * 60 * 1000);
    let cleared = 0;

    for (const [id, session] of this.sessions.entries()) {
      if (session.updatedAt < cutoffTime) {
        this.sessions.delete(id);
        cleared++;
      }
    }

    if (cleared > 0) {
      this.logger.log(`Cleared ${cleared} old chatbot sessions`);
    }
  }

  /**
   * Clean up old chatbot sessions daily
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM, {
    name: 'cleanupChatbotSessions',
  })
  cleanupOldSessionsJob() {
    this.clearOldSessions(60 * 24); // Keep sessions for 24 hours
  }
}

