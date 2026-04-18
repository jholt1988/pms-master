// Story 19: Organization and Settings Management
// GET /settings, PATCH /settings, GET /settings/users, POST /settings/users, PATCH /settings/users/:id
// Dependencies: 12 | Estimate: Medium

import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards, NotFoundException, BadRequestException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import { PrismaService } from '../../prisma/prisma.service';

interface UpdateOrgSettingsDto {
  name?: string;
  timezone?: string;
  dateFormat?: string;
  currency?: string;
  lateFeeEnabled?: boolean;
  lateFeeGraceDays?: number;
  lateFeeAmount?: number;
}

interface InviteUserDto {
  email: string;
  role: 'ADMIN' | 'PROPERTY_MANAGER' | 'OWNER' | 'TENANT';
  propertyIds?: number[];
}

interface UpdateUserDto {
  role?: string;
  isActive?: boolean;
  propertyIds?: number[];
}

@Controller('settings')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class OrganizationSettingsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @Roles('ADMIN', 'PROPERTY_MANAGER')
  async getOrganizationSettings(@Req() req: any) {
    const orgId = req.user.organizationId;

    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
    });

    if (!org) throw new NotFoundException('Organization not found');

    return {
      id: org.id,
      name: org.name,
      timezone: org.timezone,
      dateFormat: org.dateFormat,
      currency: org.currency,
      settings: {
        lateFeeEnabled: org.lateFeeEnabled,
        lateFeeGraceDays: org.lateFeeGraceDays,
        lateFeeAmount: org.lateFeeAmount,
      },
      createdAt: org.createdAt,
    };
  }

  @Patch()
  @Roles('ADMIN')
  async updateOrganizationSettings(@Body() dto: UpdateOrgSettingsDto, @Req() req: any) {
    const orgId = req.user.organizationId;

    const updated = await this.prisma.organization.update({
      where: { id: orgId },
      data: {
        name: dto.name,
        timezone: dto.timezone,
        dateFormat: dto.dateFormat,
        currency: dto.currency,
        lateFeeEnabled: dto.lateFeeEnabled,
        lateFeeGraceDays: dto.lateFeeGraceDays,
        lateFeeAmount: dto.lateFeeAmount,
      },
    });

    console.log('[SETTINGS] Org updated:', orgId);

    return { id: updated.id, name: updated.name };
  }

  @Get('users')
  @Roles('ADMIN')
  async listOrganizationUsers(@Req() req: any) {
    const orgId = req.user.organizationId;

    const users = await this.prisma.user.findMany({
      where: { organizationId: orgId },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return { data: users, total: users.length };
  }

  @Post('users/invite')
  @Roles('ADMIN')
  async inviteUser(@Body() dto: InviteUserDto, @Req() req: any) {
    const orgId = req.user.organizationId;

    // Check if user already exists
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (existing) throw new BadRequestException('User with this email already exists');

    // Generate temporary password
    const tempPassword = Math.random().toString(36).slice(-8);
    const passwordHash = require('crypto').createHash('sha256').update(tempPassword).digest('hex');

    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        role: dto.role,
        organizationId: orgId,
        isActive: true,
        // In production, send invitation email instead
      },
    });

    console.log('[SETTINGS] User invited:', user.email, 'role:', dto.role);

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      // TEMP - remove in production
      tempPassword,
    };
  }

  @Patch('users/:id')
  @Roles('ADMIN')
  async updateUser(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    const userId = parseInt(id, 10);

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        role: dto.role as any,
        isActive: dto.isActive,
      },
    });

    console.log('[SETTINGS] User updated:', userId);

    return { id: updated.id, role: updated.role, isActive: updated.isActive };
  }

  @Post('users/:id/deactivate')
  @Roles('ADMIN')
  async deactivateUser(@Param('id') id: string) {
    const userId = parseInt(id, 10);

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    await this.prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
    });

    console.log('[SETTINGS] User deactivated:', userId);

    return { success: true };
  }

  @Get('integrations')
  @Roles('ADMIN')
  async listIntegrations(@Req() req: any) {
    const orgId = req.user.organizationId;

    // Get integration status
    const [org, connections] = await Promise.all([
      this.prisma.organization.findUnique({ where: { id: orgId } }),
      this.prisma.integrationConnection.findMany({
        where: { organizationId: orgId },
      }),
    ]);

    return {
      quickbooks: { connected: org?.quickbooksConnected || false },
      stripe: { connected: !!org?.stripeConnectedAccountId },
      integrations: connections,
    };
  }

  @Post('integrations/quickbooks/connect')
  @Roles('ADMIN')
  async connectQuickBooks(@Req() req: any) {
    // In production, redirect to OAuth flow
    return { authUrl: '/api/quickbooks/auth-url', message: 'Redirect to OAuth' };
  }

  @Post('integrations/quickbooks/disconnect')
  @Roles('ADMIN')
  async disconnectQuickBooks(@Req() req: any) {
    const orgId = req.user.organizationId;
    await this.prisma.organization.update({
      where: { id: orgId },
      data: { quickbooksConnected: false },
    });
    return { success: true };
  }

  @Get('audit-log')
  @Roles('ADMIN')
  async getAuditLog(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
    @Req() req: any,
  ) {
    const orgId = req.user.organizationId;
    const limitNum = parseInt(limit || '50', 10);

    const where: any = { orgId };
    if (startDate) where.createdAt = { gte: new Date(startDate) };
    if (endDate) where.createdAt = { ...where.createdAt, lte: new Date(endDate) };

    const logs = await this.prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limitNum,
    });

    return { data: logs, total: logs.length };
  }
}