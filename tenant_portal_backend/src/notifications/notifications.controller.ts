import { Controller, Get, Post, Param, Query, Delete, UseGuards, Req, ParseIntPipe, Put, Body } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { NotificationsService } from './notifications.service';
import { NotificationPreferencesService, NotificationPreferencesDto } from './notification-preferences.service';
import { NotificationType } from '@prisma/client';
import { Request } from 'express';

interface AuthenticatedRequest extends Request {
  user: {
    sub: number;
    username: string;
    role: string;
  };
}

@Controller('notifications')
@UseGuards(AuthGuard('jwt'))
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly preferencesService: NotificationPreferencesService,
  ) {}

  @Get()
  async getNotifications(
    @Req() req: AuthenticatedRequest,
    @Query('read') read?: string,
    @Query('type') type?: NotificationType,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    const userId = req.user.sub;
    const result = await this.notificationsService.findAll(userId, {
      read: read === 'true' ? true : read === 'false' ? false : undefined,
      type,
      skip: skip ? parseInt(skip, 10) : undefined,
      take: take ? parseInt(take, 10) : undefined,
    });

    return result.data;
  }

  @Get('unread-count')
  async getUnreadCount(@Req() req: AuthenticatedRequest) {
    const userId = req.user.sub;
    const count = await this.notificationsService.getUnreadCount(userId);
    return { count };
  }

  @Put(':id/read')
  async markAsRead(@Req() req: AuthenticatedRequest, @Param('id', ParseIntPipe) id: number) {
    const userId = req.user.sub;
    const notification = await this.notificationsService.markAsRead(userId, id);
    return notification;
  }

  @Post('read-all')
  async markAllAsRead(@Req() req: AuthenticatedRequest) {
    const userId = req.user.sub;
    await this.notificationsService.markAllAsRead(userId);
    return { success: true };
  }

  @Delete(':id')
  async deleteNotification(@Req() req: AuthenticatedRequest, @Param('id', ParseIntPipe) id: number) {
    const userId = req.user.sub;
    await this.notificationsService.delete(userId, id);
    return { success: true };
  }

  @Get('preferences')
  async getPreferences(@Req() req: AuthenticatedRequest) {
    const userId = req.user.sub;
    const preferences = await this.preferencesService.getPreferences(userId);
    return preferences;
  }

  @Put('preferences')
  async updatePreferences(
    @Req() req: AuthenticatedRequest,
    @Body() dto: NotificationPreferencesDto,
  ) {
    const userId = req.user.sub;
    const preferences = await this.preferencesService.updatePreferences(userId, dto);
    return preferences;
  }
}

