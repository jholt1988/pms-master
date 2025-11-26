import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationType, Prisma } from '@prisma/client';
import { EmailService } from '../email/email.service';
import { SmsService } from './sms.service';
import { AINotificationService } from './ai-notification.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly smsService: SmsService,
    private readonly aiNotificationService: AINotificationService,
  ) {}

  async create(data: {
    userId: number;
    type: NotificationType;
    title: string;
    message: string;
    metadata?: any;
    sendEmail?: boolean;
    useAITiming?: boolean;
    personalize?: boolean;
    urgency?: 'LOW' | 'MEDIUM' | 'HIGH';
  }) {
    let title = data.title;
    let message = data.message;
    let sendAt = new Date();
    let channel: 'EMAIL' | 'SMS' | 'PUSH' = 'EMAIL';

    // Personalize content if enabled
    if (data.personalize) {
      try {
        const startTime = Date.now();
        const personalizedMessage = await this.aiNotificationService.customizeNotificationContent(
          data.userId,
          data.type,
          message,
        );
        const responseTime = Date.now() - startTime;

        if (personalizedMessage && personalizedMessage !== message) {
          message = personalizedMessage;
          this.logger.log(
            `AI personalized notification content for user ${data.userId} (${responseTime}ms)`,
          );
        }
      } catch (error) {
        this.logger.warn(
          `AI content personalization failed for user ${data.userId}, using original content`,
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
          data.userId,
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
          `AI determined optimal timing for user ${data.userId}: ` +
          `channel=${channel}, sendAt=${sendAt.toISOString()} (${responseTime}ms)`,
        );
      } catch (error) {
        this.logger.warn(
          `AI timing calculation failed for user ${data.userId}, using immediate send`,
          error instanceof Error ? error.message : String(error),
        );
      }
    }

    // Create notification
    const notification = await this.prisma.notification.create({
      data: {
        userId: data.userId,
        type: data.type,
        title,
        message,
        metadata: {
          ...data.metadata,
          channel,
          scheduledFor: sendAt > new Date() ? sendAt.toISOString() : undefined,
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

      // Send via selected channel
      if (channel === 'EMAIL' || sendEmail) {
        await this.emailService.sendNotificationEmail(user.username, notification.title, notification.message);
        this.logger.log(`Sent email notification ${notification.id} to user ${user.username}`);
      } else if (channel === 'SMS') {
        // Note: User model doesn't have a phone field, SMS functionality would need phone number from another source
        // For now, skip SMS if phone is not available
        this.logger.warn(`SMS requested for notification ${notification.id} but user ${user.username} has no phone number`);
        // Fallback to email
        await this.emailService.sendNotificationEmail(user.username, notification.title, notification.message);
      } else if (channel === 'PUSH') {
        // TODO: Implement push notification service
        this.logger.log(`Push notification ${notification.id} would be sent to user ${user.username} (not implemented)`);
        // Fallback to email if push not available
        await this.emailService.sendNotificationEmail(user.username, notification.title, notification.message);
      }
    } catch (error) {
      this.logger.error(`Failed to send notification ${notification.id} via ${channel}:`, error);
    }
  }

  async findAll(userId: number, filters?: { read?: boolean; type?: NotificationType; skip?: number; take?: number }) {
    const where: Prisma.NotificationWhereInput = {
      userId,
      ...(filters?.read !== undefined && { read: filters.read }),
      ...(filters?.type && { type: filters.type }),
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

  async getUnreadCount(userId: number): Promise<number> {
    return this.prisma.notification.count({
      where: {
        userId,
        read: false,
      },
    });
  }

  async markAsRead(userId: number, notificationId: number): Promise<void> {
    await this.prisma.notification.updateMany({
      where: {
        id: notificationId,
        userId, // Ensure user can only mark their own notifications as read
      },
      data: {
        read: true,
        readAt: new Date(),
      },
    });
  }

  async markAllAsRead(userId: number): Promise<void> {
    await this.prisma.notification.updateMany({
      where: {
        userId,
        read: false,
      },
      data: {
        read: true,
        readAt: new Date(),
      },
    });
  }

  async delete(userId: number, notificationId: number): Promise<void> {
    await this.prisma.notification.deleteMany({
      where: {
        id: notificationId,
        userId, // Ensure user can only delete their own notifications
      },
    });
  }

  async sendSignatureAlert(data: {
    event: 'REQUESTED' | 'COMPLETED';
    envelopeId: number;
    leaseId: number;
    participantName: string;
    userId?: number;
    email?: string;
    phone?: string;
  }) {
    const type = data.event === 'REQUESTED' ? NotificationType.ESIGNATURE_REQUESTED : NotificationType.ESIGNATURE_COMPLETED;
    const title =
      data.event === 'REQUESTED'
        ? `Signature requested for lease #${data.leaseId}`
        : `Lease #${data.leaseId} signed`;
    const message =
      data.event === 'REQUESTED'
        ? `${data.participantName}, please review and sign the pending lease documents.`
        : `${data.participantName}, the lease packet has been fully executed.`;

    if (data.userId) {
      await this.create({
        userId: data.userId,
        type,
        title,
        message,
        metadata: { envelopeId: data.envelopeId, leaseId: data.leaseId },
        sendEmail: true,
        useAITiming: true,
        personalize: true,
        urgency: data.event === 'REQUESTED' ? 'MEDIUM' : 'LOW',
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
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000); // Check notifications from last hour
    let processedCount = 0;

    try {
      // Fetch recent notifications (from last hour) that might be scheduled
      // We can't easily query JSON fields in Prisma, so we fetch recent ones and filter
      const recentNotifications = await this.prisma.notification.findMany({
        where: {
          createdAt: {
            gte: oneHourAgo,
          },
        },
        take: 100, // Limit to avoid processing too many
      });

      for (const notification of recentNotifications) {
        const metadata = notification.metadata as any;
        const scheduledFor = metadata?.scheduledFor;

        if (!scheduledFor) {
          continue;
        }

        const scheduledTime = new Date(scheduledFor);
        
        // Only process if scheduled time has passed
        if (scheduledTime <= now) {
          const channel = (metadata?.channel as 'EMAIL' | 'SMS' | 'PUSH') || 'EMAIL';
          const sendEmail = channel === 'EMAIL';

          try {
            await this.sendNotification(notification, channel, sendEmail);
            
            // Remove scheduledFor from metadata since it's been sent
            const updatedMetadata = { ...metadata };
            delete updatedMetadata.scheduledFor;
            
            await this.prisma.notification.update({
              where: { id: notification.id },
              data: { metadata: updatedMetadata },
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

