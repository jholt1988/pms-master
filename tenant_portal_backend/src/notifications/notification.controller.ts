// Story 18: Notification and Alert Management System
// POST /notifications, GET /notifications, POST /notifications/:id/read, POST /notifications/preferences
// Dependencies: 5, 6, 9, 10, 11, 12 | Estimate: Medium

import { Controller, Get, Post, Param, Body, Query, UseGuards, NotFoundException, BadRequestException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import { PrismaService } from '../../prisma/prisma.service';

interface CreateNotificationDto {
  type: 'INFO' | 'WARNING' | 'URGENT' | 'SUCCESS';
  title: string;
  message: string;
  targetUserId?: string;
  targetRole?: string;
  propertyId?: number;
  entityType?: string;
  entityId?: string;
  actionUrl?: string;
}

interface NotificationPreferenceDto {
  emailEnabled?: boolean;
  pushEnabled?: boolean;
  smsEnabled?: boolean;
  categories?: Record<string, boolean>;
}

@Controller('notifications')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class NotificationController {
  constructor(private readonly prisma: PrismaService) {}

  @Post()
  @Roles('PROPERTY_MANAGER', 'ADMIN', 'SYSTEM')
  async createNotification(@Body() dto: CreateNotificationDto, @Req() req: any) {
    const senderId = req.user?.userId || 'system';

    // If targeting a specific user
    if (dto.targetUserId) {
      const notification = await this.prisma.notification.create({
        data: {
          type: dto.type,
          title: dto.title,
          message: dto.message,
          targetUserId: dto.targetUserId,
          senderId,
          propertyId: dto.propertyId,
          entityType: dto.entityType,
          entityId: dto.entityId,
          actionUrl: dto.actionUrl,
        },
      });
      return { id: notification.id };
    }

    // If targeting a role, create for all users with that role
    if (dto.targetRole) {
      const users = await this.prisma.user.findMany({
        where: { role: dto.targetRole, isActive: true },
      });

      const notifications = await this.prisma.notification.createMany({
        data: users.map(user => ({
          type: dto.type,
          title: dto.title,
          message: dto.message,
          targetUserId: user.id,
          senderId,
          propertyId: dto.propertyId,
          entityType: dto.entityType,
          entityId: dto.entityId,
          actionUrl: dto.actionUrl,
        })),
      });

      return { created: notifications.count };
    }

    throw new BadRequestException('Either targetUserId or targetRole required');
  }

  @Get()
  async listNotifications(
    @Query('unread') unread?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Req() req: any,
  ) {
    const userId = req.user.userId;
    const limitNum = parseInt(limit || '20', 10);
    const offsetNum = parseInt(offset || '0', 10);

    const where: any = { targetUserId: userId };
    if (unread === 'true') where.readAt = null;

    const [notifications, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limitNum,
        skip: offsetNum,
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({ where: { targetUserId: userId, readAt: null } }),
    ]);

    return {
      data: notifications,
      total,
      unreadCount,
      limit: limitNum,
      offset: offsetNum,
    };
  }

  @Post('read-all')
  async markAllRead(@Req() req: any) {
    const userId = req.user.userId;
    const result = await this.prisma.notification.updateMany({
      where: { targetUserId: userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { updated: result.count };
  }

  @Post(':id/read')
  async markRead(@Param('id') id: string) {
    const notifId = parseInt(id, 10);
    const notification = await this.prisma.notification.findUnique({ where: { id: notifId } });
    if (!notification) throw new NotFoundException('Notification not found');

    const updated = await this.prisma.notification.update({
      where: { id: notifId },
      data: { readAt: new Date() },
    });
    return { id: updated.id, readAt: updated.readAt };
  }

  @Post('preferences')
  async updatePreferences(@Body() dto: NotificationPreferenceDto, @Req() req: any) {
    const userId = req.user.userId;

    // Upsert preferences
    const prefs = await this.prisma.notificationPreference.upsert({
      where: { userId },
      create: {
        userId,
        emailEnabled: dto.emailEnabled ?? true,
        pushEnabled: dto.pushEnabled ?? true,
        smsEnabled: dto.smsEnabled ?? false,
        categories: dto.categories ? JSON.stringify(dto.categories) : undefined,
      },
      update: {
        emailEnabled: dto.emailEnabled,
        pushEnabled: dto.pushEnabled,
        smsEnabled: dto.smsEnabled,
        ...(dto.categories && { categories: JSON.stringify(dto.categories) }),
      },
    });

    return {
      emailEnabled: prefs.emailEnabled,
      pushEnabled: prefs.pushEnabled,
      smsEnabled: prefs.smsEnabled,
    };
  }

  @Get('preferences')
  async getPreferences(@Req() req: any) {
    const userId = req.user.userId;
    const prefs = await this.prisma.notificationPreference.findUnique({ where: { userId } });

    if (!prefs) {
      return { emailEnabled: true, pushEnabled: true, smsEnabled: false, categories: {} };
    }

    return {
      emailEnabled: prefs.emailEnabled,
      pushEnabled: prefs.pushEnabled,
      smsEnabled: prefs.smsEnabled,
      categories: prefs.categories ? JSON.parse(prefs.categories) : {},
    };
  }

  @Post('trigger')
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  async triggerNotification(@Body() body: { type: string; properties: Record<string, any> }, @Req() req: any) {
    // System-triggered notifications based on property changes
    const { type, properties } = body;

    const templates: Record<string, { title: string; message: string }> = {
      OVERDUE_PAYMENT: { title: 'Payment Overdue', message: `Payment of $${properties.amount} is overdue for ${properties.tenantName}` },
      MAINTENANCE_SCHEDULED: { title: 'Maintenance Scheduled', message: `Work order "${properties.title}" scheduled for ${properties.date}` },
      LEASE_EXPIRING: { title: 'Lease Expiring', message: `Lease for ${properties.tenantName} expires in ${properties.days} days` },
      APPLICATION_REVIEW: { title: 'Application Ready', message: `${properties.applicantName} application is ready for review` },
    };

    const template = templates[type];
    if (!template) throw new BadRequestException('Unknown notification type');

    const notification = await this.prisma.notification.create({
      data: {
        type: type === 'OVERDUE_PAYMENT' ? 'WARNING' : 'INFO',
        title: template.title,
        message: template.message,
        targetUserId: properties.targetUserId,
        senderId: 'system',
        propertyId: properties.propertyId,
        entityType: properties.entityType,
        entityId: properties.entityId,
        actionUrl: properties.actionUrl,
      },
    });

    return { id: notification.id, sent: true };
  }
}