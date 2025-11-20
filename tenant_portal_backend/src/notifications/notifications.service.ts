import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationType, Prisma } from '@prisma/client';
import { EmailService } from '../email/email.service';
import { SmsService } from './sms.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly smsService: SmsService,
  ) {}

  async create(data: {
    userId: number;
    type: NotificationType;
    title: string;
    message: string;
    metadata?: any;
    sendEmail?: boolean;
  }) {
    const notification = await this.prisma.notification.create({
      data: {
        userId: data.userId,
        type: data.type,
        title: data.title,
        message: data.message,
        metadata: data.metadata,
      },
    });

    // Send email if requested
    if (data.sendEmail) {
      try {
        const user = await this.prisma.user.findUnique({ where: { id: data.userId } });
        if (user) {
          await this.emailService.sendNotificationEmail(user.username, data.title, data.message);
        }
      } catch (error) {
        this.logger.error(`Failed to send notification email: ${error}`);
      }
    }

    return notification;
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
}

