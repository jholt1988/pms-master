import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationType } from '@prisma/client';

export interface NotificationPreferencesDto {
  emailEnabled?: boolean;
  smsEnabled?: boolean;
  pushEnabled?: boolean;
  preferredChannel?: 'EMAIL' | 'SMS' | 'PUSH' | 'AUTO';
  quietHoursStart?: string; // e.g., "22:00"
  quietHoursEnd?: string; // e.g., "08:00"
  notificationTypes?: Record<NotificationType, boolean>;
}

@Injectable()
export class NotificationPreferencesService {
  private readonly logger = new Logger(NotificationPreferencesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get notification preferences for a user
   * Creates default preferences if they don't exist
   */
  async getPreferences(userId: number) {
    let preferences = await this.prisma.notificationPreference.findUnique({
      where: { userId },
    });

    if (!preferences) {
      // Create default preferences
      preferences = await this.prisma.notificationPreference.create({
        data: {
          userId,
          emailEnabled: true,
          smsEnabled: false,
          pushEnabled: false,
          preferredChannel: 'EMAIL',
        },
      });
      this.logger.debug(`Created default notification preferences for user ${userId}`);
    }

    return preferences;
  }

  /**
   * Update notification preferences for a user
   */
  async updatePreferences(userId: number, dto: NotificationPreferencesDto) {
    const existing = await this.prisma.notificationPreference.findUnique({
      where: { userId },
    });

    if (!existing) {
      // Create new preferences
      return this.prisma.notificationPreference.create({
        data: {
          userId,
          emailEnabled: dto.emailEnabled ?? true,
          smsEnabled: dto.smsEnabled ?? false,
          pushEnabled: dto.pushEnabled ?? false,
          preferredChannel: dto.preferredChannel || 'EMAIL',
          quietHoursStart: dto.quietHoursStart,
          quietHoursEnd: dto.quietHoursEnd,
          notificationTypes: dto.notificationTypes ? (dto.notificationTypes as any) : null,
        },
      });
    }

    // Update existing preferences
    return this.prisma.notificationPreference.update({
      where: { userId },
      data: {
        ...(dto.emailEnabled !== undefined && { emailEnabled: dto.emailEnabled }),
        ...(dto.smsEnabled !== undefined && { smsEnabled: dto.smsEnabled }),
        ...(dto.pushEnabled !== undefined && { pushEnabled: dto.pushEnabled }),
        ...(dto.preferredChannel && { preferredChannel: dto.preferredChannel }),
        ...(dto.quietHoursStart !== undefined && { quietHoursStart: dto.quietHoursStart }),
        ...(dto.quietHoursEnd !== undefined && { quietHoursEnd: dto.quietHoursEnd }),
        ...(dto.notificationTypes && { notificationTypes: dto.notificationTypes as any }),
      },
    });
  }

  /**
   * Check if a notification type is enabled for a user
   */
  async isNotificationTypeEnabled(userId: number, type: NotificationType): Promise<boolean> {
    const preferences = await this.getPreferences(userId);
    
    if (!preferences.notificationTypes) {
      return true; // Default to enabled if no specific preferences
    }

    const typePreferences = preferences.notificationTypes as Record<string, boolean>;
    return typePreferences[type] !== false; // Enabled by default unless explicitly disabled
  }

  /**
   * Check if it's quiet hours for a user
   */
  async isQuietHours(userId: number): Promise<boolean> {
    const preferences = await this.getPreferences(userId);
    
    if (!preferences.quietHoursStart || !preferences.quietHoursEnd) {
      return false; // No quiet hours configured
    }

    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    const start = preferences.quietHoursStart;
    const end = preferences.quietHoursEnd;

    // Handle quiet hours that span midnight (e.g., 22:00 to 08:00)
    if (start > end) {
      return currentTime >= start || currentTime <= end;
    } else {
      return currentTime >= start && currentTime <= end;
    }
  }

  /**
   * Get preferred channel for a user
   */
  async getPreferredChannel(userId: number): Promise<'EMAIL' | 'SMS' | 'PUSH'> {
    const preferences = await this.getPreferences(userId);
    
    if (preferences.preferredChannel === 'AUTO') {
      // Auto-select based on enabled channels
      if (preferences.pushEnabled) {
        return 'PUSH';
      } else if (preferences.smsEnabled) {
        return 'SMS';
      } else {
        return 'EMAIL';
      }
    }

    return (preferences.preferredChannel as 'EMAIL' | 'SMS' | 'PUSH') || 'EMAIL';
  }
}

