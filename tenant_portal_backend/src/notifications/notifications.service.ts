import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationType, Prisma } from '@prisma/client';
import { EmailService } from '../email/email.service';
import { SmsService } from './sms.service';
import { PushService } from './push.service';
import { AINotificationService } from './ai-notification.service';
import { NotificationPreferencesService } from './notification-preferences.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly smsService: SmsService,
    private readonly pushService: PushService,
    private readonly aiNotificationService: AINotificationService,
    private readonly preferencesService: NotificationPreferencesService,
  ) { }

  async create(data: {
    userId: string | number;
    type: NotificationType;
    title: string;
    message: string;
    metadata?: any;
    sendEmail?: boolean;
    useAITiming?: boolean;
    personalize?: boolean;
    urgency?: 'LOW' | 'MEDIUM' | 'HIGH';
  }) {
    const userIdStr = String(data.userId);
    let title = data.title;
    let message = data.message;
    let sendAt = new Date();
    let channel: 'EMAIL' | 'SMS' | 'PUSH' = 'EMAIL';

    // Personalize content if enabled
    if (data.personalize) {
      try {
        const startTime = Date.now();
        const personalizedMessage = await this.aiNotificationService.customizeNotificationContent(
          userIdStr,
          data.type,
          message,
        );
        const responseTime = Date.now() - startTime;

        if (personalizedMessage && personalizedMessage !== message) {
          message = personalizedMessage;
          this.logger.log(
          `AI personalized notification content for user ${userIdStr} (${responseTime}ms)`,
          );
        }
      } catch (error) {
        this.logger.warn(
          `AI content personalization failed for user ${userIdStr}, using original content`,
          error instanceof Error ? error.message : String(error),
        );
      }
    }

    // Get optimal timing and channel if enabled
    if (data.useAITiming || data.urgency) {
      try {
        const startTime = Date.now();
        const urgency = data.urgency || 'MEDIUM';
        const timing = await this.aiNotificationService.determineOptimalTiming(
          userIdStr,
          data.type,
          urgency,
        );
        const responseTime = Date.now() - startTime;

        sendAt = timing.sendAt;
        channel = timing.channel;

        // Use personalized content if AI generated it
        if (timing.personalizedContent) {
          message = timing.personalizedContent;
        }

        this.logger.log(
          `AI determined optimal timing for user ${userIdStr}: ` +
          `channel=${channel}, sendAt=${sendAt.toISOString()} (${responseTime}ms)`,
        );
      } catch (error) {
        this.logger.warn(
          `AI timing calculation failed for user ${userIdStr}, using immediate send`,
          error instanceof Error ? error.message : String(error),
        );
      }
    }

    // Check user preferences
    const preferences = await this.preferencesService.getPreferences(userIdStr);

    // Override channel based on preferences if available
    if (preferences) {
      if (preferences.preferredChannel && preferences.preferredChannel !== 'AUTO') {
        channel = preferences.preferredChannel as 'EMAIL' | 'SMS' | 'PUSH';
      }

      // Check if notification type is disabled
      if (preferences.notificationTypes) {
        const typeEnabled = (preferences.notificationTypes as Record<string, boolean>)[data.type];
        if (typeEnabled === false) {
          this.logger.debug(`Notification type ${data.type} disabled for user ${userIdStr}`);
          // Still create the notification but don't send
        }
      }
    }

    // Create notification with scheduledFor field
    const scheduledFor = sendAt > new Date() ? sendAt : null;
    const notification = await this.prisma.notification.create({
      data: {
        userId: userIdStr,
        type: data.type,
        title,
        message,
        scheduledFor,
        metadata: {
          ...data.metadata,
          channel,
        },
      },
    });

    // Send immediately or schedule for later
    if (sendAt <= new Date()) {
      await this.sendNotification(notification, channel, data.sendEmail);
    } else {
      // Schedule for later - store in metadata and let scheduled job handle it
      this.logger.log(
        `Notification ${notification.id} scheduled for ${sendAt.toISOString()} (channel: ${channel})`,
      );
      // The notification will be sent by the processScheduledNotifications job
    }

    return notification;
  }

  /**
   * Send notification via the specified channel
   */
  private async sendNotification(
    notification: any,
    channel: 'EMAIL' | 'SMS' | 'PUSH',
    sendEmail?: boolean,
  ): Promise<void> {
    try {
      const user = await this.prisma.user.findUnique({ where: { id: notification.userId } });
      if (!user) {
        this.logger.warn(`User ${notification.userId} not found for notification ${notification.id}`);
        return;
      }

      // Get user preferences
      const preferences = await this.preferencesService.getPreferences(notification.userId);

      // Send via selected channel
      if (channel === 'EMAIL' || sendEmail) {
        if (!preferences || preferences.emailEnabled !== false) {
          if (user.email) {
            await this.emailService.sendNotificationEmail(user.email, notification.title, notification.message);
            this.logger.log(`Sent email notification ${notification.id} to user ${user.username}`);
          } else {
            this.logger.warn(`User ${user.username} has no email address, skipping email notification ${notification.id}`);
          }
        } else {
          this.logger.debug(`Email disabled for user ${user.username}, skipping email notification ${notification.id}`);
        }
      } else if (channel === 'SMS') {
        if (user.phoneNumber) {
          if (!preferences || preferences.smsEnabled !== false) {
            const result = await this.smsService.sendSms(user.phoneNumber, notification.message);
            if (result.success) {
              this.logger.log(`Sent SMS notification ${notification.id} to user ${user.username} (${user.phoneNumber})`);
            } else {
              this.logger.warn(`SMS failed for notification ${notification.id}: ${result.error}`);
              // Fallback to email
              if (user.email) {
                await this.emailService.sendNotificationEmail(user.email, notification.title, notification.message);
              }
            }
          } else {
            this.logger.debug(`SMS disabled for user ${user.username}, falling back to email`);
            if (user.email) {
              await this.emailService.sendNotificationEmail(user.email, notification.title, notification.message);
            }
          }
        } else {
          this.logger.warn(`SMS requested for notification ${notification.id} but user ${user.username} has no phone number`);
          // Fallback to email
          if (user.email) {
            await this.emailService.sendNotificationEmail(user.email, notification.title, notification.message);
          }
        }
      } else if (channel === 'PUSH') {
        if (!preferences || preferences.pushEnabled !== false) {
          const result = await this.pushService.sendPush(
            notification.userId,
            notification.title,
            notification.message,
            notification.metadata as Record<string, any>,
          );
          if (result.success) {
            this.logger.log(`Sent push notification ${notification.id} to user ${user.username}`);
          } else {
            this.logger.warn(`Push failed for notification ${notification.id}: ${result.error}`);
            // Fallback to email
            if (user.email) {
              await this.emailService.sendNotificationEmail(user.email, notification.title, notification.message);
            }
          }
        } else {
          this.logger.debug(`Push disabled for user ${user.username}, falling back to email`);
          if (user.email) {
            await this.emailService.sendNotificationEmail(user.email, notification.title, notification.message);
          }
        }
      }
    } catch (error) {
      this.logger.error(`Failed to send notification ${notification.id} via ${channel}:`, error);
    }
  }

  async findAll(userId: string, filters?: { read?: boolean; type?: NotificationType; skip?: number; take?: number; orgId?: string }) {
    const where: Prisma.NotificationWhereInput = {
      userId,
      ...(filters?.read !== undefined && { read: filters.read }),
      ...(filters?.type && { type: filters.type }),
      ...(filters?.orgId ? { user: { organizations: { some: { id: filters.orgId } } } } : {}),
    };

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: filters?.skip || 0,
        take: filters?.take || 50,
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      data: notifications,
      total,
      skip: filters?.skip || 0,
      take: filters?.take || 50,
    };
  }

  async getUnreadCount(userId: string, orgId?: string): Promise<number> {
    return this.prisma.notification.count({
      where: {
        userId,
        read: false,
        ...(orgId ? { user: { organizations: { some: { id: orgId } } } } : {}),
      },
    });
  }

  async markAsRead(userId: string, notificationId: number, orgId?: string) {
    const notification = await this.prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId,
        ...(orgId ? { user: { organizations: { some: { id: orgId } } } } : {}),
      },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return this.prisma.notification.update({
      where: { id: notificationId },
      data: {
        read: true,
        readAt: new Date(),
      },
    });
  }

  async markAllAsRead(userId: string, orgId?: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: {
        userId,
        read: false,
        ...(orgId ? { user: { organizations: { some: { id: orgId } } } } : {}),
      },
      data: {
        read: true,
        readAt: new Date(),
      },
    });
  }

  async delete(userId: string, notificationId: number, orgId?: string): Promise<void> {
    await this.prisma.notification.deleteMany({
      where: {
        id: notificationId,
        userId, // Ensure user can only delete their own notifications
        ...(orgId ? { user: { organizations: { some: { id: orgId } } } } : {}),
      },
    });
  }

  async sendSignatureAlert(data: {
    event: 'REQUESTED' | 'COMPLETED' | 'VOIDED';
    envelopeId: number;
    leaseId: string;
    participantName: string;
    userId?: string;
    email?: string;
    phone?: string;
  }) {
    let type: NotificationType;
    let title: string;
    let message: string;
    let urgency: 'LOW' | 'MEDIUM' | 'HIGH' = 'MEDIUM';

    switch (data.event) {
      case 'REQUESTED':
        type = NotificationType.ESIGNATURE_REQUESTED;
        title = `Signature requested for lease #${data.leaseId}`;
        message = `${data.participantName}, please review and sign the pending lease documents.`;
        urgency = 'MEDIUM';
        break;
      case 'COMPLETED':
        type = NotificationType.ESIGNATURE_COMPLETED;
        title = `Lease #${data.leaseId} signed`;
        message = `${data.participantName}, the lease packet has been fully executed.`;
        urgency = 'LOW';
        break;
      case 'VOIDED':
        type = NotificationType.ESIGNATURE_VOIDED as any;
        title = `Signature request for lease #${data.leaseId} cancelled`;
        message = `${data.participantName}, the signature request has been cancelled. You no longer need to sign this document.`;
        urgency = 'LOW';
        break;
      default:
        this.logger.warn(`Unknown signature alert event: ${data.event}`);
        return;
    }

    if (data.userId) {
        await this.create({
        userId: String(data.userId),
        type,
        title,
        message,
        metadata: { envelopeId: data.envelopeId, leaseId: data.leaseId, event: data.event },
        sendEmail: true,
        useAITiming: true,
        personalize: true,
        urgency,
      });
    } else if (data.email) {
      try {
        await this.emailService.sendNotificationEmail(data.email, title, message);
      } catch (error) {
        this.logger.warn(`Failed to send signature email to ${data.email}: ${error}`);
      }
    }

    if (data.phone) {
      await this.smsService.sendSms(data.phone, `${title} - ${message}`);
    }
  }

  /**
   * Process scheduled notifications that are ready to be sent
   * This should be called by a scheduled job
   */
  async processScheduledNotifications(): Promise<number> {
    const now = new Date();
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000); // Include notifications scheduled in next 5 minutes
    let processedCount = 0;

    try {
      // Fetch scheduled notifications using indexed scheduledFor field
      const scheduledNotifications = await this.prisma.notification.findMany({
        where: {
          scheduledFor: {
            not: null,
            lte: fiveMinutesFromNow, // Include notifications due now or in next 5 minutes
          },
        },
        take: 100, // Limit to avoid processing too many at once
        orderBy: {
          scheduledFor: 'asc', // Process oldest first
        },
      });

      for (const notification of scheduledNotifications) {
        if (!notification.scheduledFor) {
          continue;
        }

        // Only process if scheduled time has passed (with 1 minute buffer)
        const scheduledTime = new Date(notification.scheduledFor);
        const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);

        if (scheduledTime <= oneMinuteAgo) {
          const metadata = notification.metadata as any;
          const channel = (metadata?.channel as 'EMAIL' | 'SMS' | 'PUSH') || 'EMAIL';
          const sendEmail = channel === 'EMAIL';

          try {
            await this.sendNotification(notification, channel, sendEmail);

            // Mark as sent by clearing scheduledFor field
            await this.prisma.notification.update({
              where: { id: notification.id },
              data: {
                scheduledFor: null,
              },
            });

            processedCount++;
            this.logger.log(`Sent scheduled notification ${notification.id}`);
          } catch (error) {
            this.logger.error(`Failed to send scheduled notification ${notification.id}:`, error);
          }
        }
      }
    } catch (error) {
      this.logger.error('Error processing scheduled notifications:', error);
    }

    return processedCount;
  }
}


