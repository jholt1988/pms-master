import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationPreferencesService } from './notification-preferences.service';
import OpenAI from 'openai';
import { NotificationType, User } from '@prisma/client';

interface OptimalNotificationTiming {
  sendAt: Date;
  channel: 'EMAIL' | 'SMS' | 'PUSH';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  personalizedContent?: string;
}

interface NotificationPreference {
  preferredChannels: ('EMAIL' | 'SMS' | 'PUSH')[];
  preferredTimes: number[]; // Hours of day (0-23)
  timezone: string;
  quietHoursStart: number; // Hour (0-23)
  quietHoursEnd: number; // Hour (0-23)
}

@Injectable()
export class AINotificationService {
  private readonly logger = new Logger(AINotificationService.name);
  private openai: OpenAI | null = null;
  private readonly aiEnabled: boolean;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly preferencesService: NotificationPreferencesService,
  ) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    const aiEnabled = this.configService.get<string>('AI_ENABLED', 'false') === 'true';

    this.aiEnabled = aiEnabled;

    if (this.aiEnabled && apiKey) {
      this.openai = new OpenAI({ apiKey });
      this.logger.log('AI Notification Service initialized with OpenAI');
    } else {
      this.logger.warn(
        'AI Notification Service initialized in mock mode (no OpenAI API key or AI disabled)',
      );
    }
  }

  /**
   * Determine optimal timing for sending a notification
   */
  async determineOptimalTiming(
    userId: number,
    notificationType: NotificationType,
    urgency: 'LOW' | 'MEDIUM' | 'HIGH' = 'MEDIUM',
  ): Promise<OptimalNotificationTiming> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        notifications: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
      },
    });

    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    // Get user preferences (or use defaults)
    const preferences = await this.getUserPreferences(userId);

    // Analyze user's historical engagement patterns
    const engagementPatterns = this.analyzeEngagementPatterns(user.notifications);

    // Determine best channel
    const channel = this.selectOptimalChannelInternal(
      notificationType,
      urgency,
      preferences,
      engagementPatterns,
    );

    // Determine best time
    const sendAt = this.calculateOptimalTime(
      notificationType,
      urgency,
      preferences,
      engagementPatterns,
    );

    // Determine priority
    const priority = urgency;

    // Generate personalized content if AI is enabled
    let personalizedContent: string | undefined;
    if (this.openai && this.aiEnabled && urgency === 'HIGH') {
      try {
        personalizedContent = await this.generatePersonalizedContent(
          userId,
          notificationType,
        );
      } catch (error) {
        this.logger.warn('Failed to generate personalized content', error);
      }
    }

    return {
      sendAt,
      channel,
      priority,
      personalizedContent,
    };
  }

  /**
   * Get user notification preferences
   */
  private async getUserPreferences(userId: number): Promise<NotificationPreference> {
    // Get preferences from database
    const dbPreferences = await this.preferencesService.getPreferences(userId);
    
    // Convert database preferences to AI service format
    const preferredChannels: ('EMAIL' | 'SMS' | 'PUSH')[] = [];
    if (dbPreferences.emailEnabled) preferredChannels.push('EMAIL');
    if (dbPreferences.smsEnabled) preferredChannels.push('SMS');
    if (dbPreferences.pushEnabled) preferredChannels.push('PUSH');
    
    // Default to EMAIL if no channels enabled
    if (preferredChannels.length === 0) {
      preferredChannels.push('EMAIL');
    }

    // Parse quiet hours
    let quietHoursStart = 22; // Default 10 PM
    let quietHoursEnd = 8; // Default 8 AM
    if (dbPreferences.quietHoursStart && dbPreferences.quietHoursEnd) {
      const [startHour, startMin] = dbPreferences.quietHoursStart.split(':').map(Number);
      const [endHour, endMin] = dbPreferences.quietHoursEnd.split(':').map(Number);
      quietHoursStart = startHour;
      quietHoursEnd = endHour;
    }

    // Default preferred times (can be enhanced with AI analysis)
    const preferredTimes = [9, 14, 18]; // 9 AM, 2 PM, 6 PM

    return {
      preferredChannels,
      preferredTimes,
      timezone: 'America/New_York', // Could be stored in user profile
      quietHoursStart,
      quietHoursEnd,
    };
  }

  /**
   * Analyze user's historical engagement patterns
   */
  private analyzeEngagementPatterns(notifications: any[]): {
    bestHours: number[];
    bestChannel: 'EMAIL' | 'SMS' | 'PUSH';
    averageResponseTime: number; // minutes
  } {
    if (notifications.length === 0) {
      return {
        bestHours: [9, 14, 18],
        bestChannel: 'EMAIL',
        averageResponseTime: 60,
      };
    }

    // Analyze when notifications were read/acted upon
    const readNotifications = notifications.filter((n) => n.readAt);
    const readHours = readNotifications.map((n) => {
      const readAt = new Date(n.readAt);
      return readAt.getHours();
    });

    // Find most common hours
    const hourCounts = new Map<number, number>();
    readHours.forEach((hour) => {
      hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
    });

    const bestHours = Array.from(hourCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([hour]) => hour);

    // Determine best channel (simplified - would analyze actual engagement)
    const bestChannel = 'EMAIL';

    // Calculate average response time
    let totalResponseTime = 0;
    let count = 0;
    readNotifications.forEach((n) => {
      if (n.readAt && n.createdAt) {
        const responseTime =
          (new Date(n.readAt).getTime() - new Date(n.createdAt).getTime()) / (1000 * 60);
        totalResponseTime += responseTime;
        count++;
      }
    });

    const averageResponseTime = count > 0 ? totalResponseTime / count : 60;

    return {
      bestHours: bestHours.length > 0 ? bestHours : [9, 14, 18],
      bestChannel,
      averageResponseTime,
    };
  }

  /**
   * Select optimal channel for notification (public method)
   */
  async selectOptimalChannel(
    userId: number,
    notificationType: NotificationType,
    urgency: 'LOW' | 'MEDIUM' | 'HIGH' = 'MEDIUM',
  ): Promise<'EMAIL' | 'SMS' | 'PUSH'> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        notifications: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
      },
    });

    if (!user) {
      return 'EMAIL'; // Default fallback
    }

    const preferences = await this.getUserPreferences(userId);
    const engagementPatterns = this.analyzeEngagementPatterns(user.notifications);

    return this.selectOptimalChannelInternal(notificationType, urgency, preferences, engagementPatterns);
  }

  /**
   * Select optimal channel for notification (internal helper)
   */
  private selectOptimalChannelInternal(
    notificationType: NotificationType,
    urgency: 'LOW' | 'MEDIUM' | 'HIGH',
    preferences: NotificationPreference,
    engagementPatterns: {
      bestHours: number[];
      bestChannel: 'EMAIL' | 'SMS' | 'PUSH';
      averageResponseTime: number;
    },
  ): 'EMAIL' | 'SMS' | 'PUSH' {
    // High urgency notifications should use SMS or PUSH
    if (urgency === 'HIGH') {
      if (preferences.preferredChannels.includes('SMS')) {
        return 'SMS';
      }
      return 'PUSH';
    }

    // Critical notification types should use SMS
    const criticalTypes: NotificationType[] = [
      NotificationType.MAINTENANCE_SLA_BREACH,
      NotificationType.RENT_OVERDUE,
      NotificationType.LEASE_RENEWAL,
    ];

    if (criticalTypes.includes(notificationType)) {
      if (preferences.preferredChannels.includes('SMS')) {
        return 'SMS';
      }
      return 'PUSH';
    }

    // Use user's preferred channel or best performing channel
    if (preferences.preferredChannels.length > 0) {
      return preferences.preferredChannels[0];
    }

    return engagementPatterns.bestChannel;
  }

  /**
   * Calculate optimal time to send notification
   */
  private calculateOptimalTime(
    notificationType: NotificationType,
    urgency: 'LOW' | 'MEDIUM' | 'HIGH',
    preferences: NotificationPreference,
    engagementPatterns: {
      bestHours: number[];
      bestChannel: 'EMAIL' | 'SMS' | 'PUSH';
      averageResponseTime: number;
    },
  ): Date {
    const now = new Date();
    const sendAt = new Date(now);

    // High urgency - send immediately (but respect quiet hours)
    if (urgency === 'HIGH') {
      const currentHour = now.getHours();
      if (
        currentHour >= preferences.quietHoursStart ||
        currentHour < preferences.quietHoursEnd
      ) {
        // In quiet hours, wait until quiet hours end
        sendAt.setHours(preferences.quietHoursEnd, 0, 0, 0);
        if (sendAt <= now) {
          sendAt.setDate(sendAt.getDate() + 1);
        }
      }
      return sendAt;
    }

    // Find next optimal hour from user's best hours
    const bestHours = engagementPatterns.bestHours.length > 0
      ? engagementPatterns.bestHours
      : preferences.preferredTimes;

    const currentHour = now.getHours();
    let nextOptimalHour = bestHours.find((hour) => hour > currentHour);

    if (!nextOptimalHour) {
      // No optimal hour today, use first one tomorrow
      nextOptimalHour = bestHours[0];
      sendAt.setDate(sendAt.getDate() + 1);
    }

    sendAt.setHours(nextOptimalHour, 0, 0, 0);

    // Ensure not in quiet hours
    if (
      sendAt.getHours() >= preferences.quietHoursStart ||
      sendAt.getHours() < preferences.quietHoursEnd
    ) {
      sendAt.setHours(preferences.quietHoursEnd, 0, 0, 0);
    }

    return sendAt;
  }

  /**
   * Generate personalized notification content
   */
  private async generatePersonalizedContent(
    userId: number,
    notificationType: NotificationType,
  ): Promise<string> {
    if (!this.openai || !this.aiEnabled) {
      return '';
    }

    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        return '';
      }

      const prompt = `Generate a personalized notification message for a property management tenant.

Notification type: ${notificationType}
User: ${user.username}

Keep it brief (1-2 sentences), friendly, and professional. Include relevant details.`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'You are a property management assistant. Generate friendly, concise notification messages.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 100,
      });

      return response.choices[0]?.message?.content?.trim() || '';
    } catch (error) {
      this.logger.error('Failed to generate personalized content', error);
      return '';
    }
  }

  /**
   * Customize notification content based on user preferences and history
   */
  async customizeNotificationContent(
    userId: number,
    notificationType: NotificationType,
    defaultContent: string,
  ): Promise<string> {
    if (!this.openai || !this.aiEnabled) {
      return defaultContent;
    }

    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          notifications: {
            where: { type: notificationType },
            orderBy: { createdAt: 'desc' },
            take: 5,
          },
        },
      });

      if (!user) {
        return defaultContent;
      }

      const prompt = `Customize this notification message for a property management tenant.

Default message: ${defaultContent}
Notification type: ${notificationType}
User: ${user.username}

Make it more personalized and engaging while keeping the same information. Keep it concise (1-2 sentences).`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'You are a property management assistant. Customize notification messages to be more personalized.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 150,
      });

      return response.choices[0]?.message?.content?.trim() || defaultContent;
    } catch (error) {
      this.logger.error('Failed to customize notification content', error);
      return defaultContent;
    }
  }
}

