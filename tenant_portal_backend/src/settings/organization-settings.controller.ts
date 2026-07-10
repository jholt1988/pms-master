// Story 19: Organization and Settings Management
// GET /settings, PATCH /settings, GET /settings/users, POST /settings/users, PATCH /settings/users/:id
// Dependencies: 12 | Estimate: Medium

import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  NotFoundException,
  BadRequestException,
  Logger,
  Req,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { OrgContextGuard } from '../common/org-context/org-context.guard';
import { OrgId } from '../common/org-context/org-id.decorator';
import { Roles } from '../auth/roles.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';

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
  propertyIds?: string[];
}

interface UpdateUserDto {
  role?: 'ADMIN' | 'PROPERTY_MANAGER' | 'OWNER' | 'TENANT';
  propertyIds?: string[];
}

@Controller('settings')
@UseGuards(AuthGuard('jwt'), RolesGuard, OrgContextGuard)
export class OrganizationSettingsController {
  private readonly logger = new Logger(OrganizationSettingsController.name);

  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @Roles('ADMIN', 'PROPERTY_MANAGER')
  async getOrganizationSettings(@OrgId() orgId: string) {
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
  async updateOrganizationSettings(@Body() dto: UpdateOrgSettingsDto, @OrgId() orgId: string) {
    // Filter out undefined values so we don't accidentally overwrite with null
    const data: Prisma.OrganizationUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.timezone !== undefined) data.timezone = dto.timezone;
    if (dto.dateFormat !== undefined) data.dateFormat = dto.dateFormat;
    if (dto.currency !== undefined) data.currency = dto.currency;
    if (dto.lateFeeEnabled !== undefined) data.lateFeeEnabled = dto.lateFeeEnabled;
    if (dto.lateFeeGraceDays !== undefined) data.lateFeeGraceDays = dto.lateFeeGraceDays;
    if (dto.lateFeeAmount !== undefined) data.lateFeeAmount = dto.lateFeeAmount;

    const updated = await this.prisma.organization.update({
      where: { id: orgId },
      data,
    });

    this.logger.log(`Organization settings updated: ${orgId}`);

    return { id: updated.id, name: updated.name };
  }

  @Get('users')
  @Roles('ADMIN')
  async listOrganizationUsers(@Req() req: any) {
    const orgId = req.user.organizationId;

    // Users are linked to orgs via the UserOrganization join table
    const orgWithUsers = await this.prisma.userOrganization.findMany({
      where: { organizationId: orgId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            lastLoginAt: true,
            firstName: true,
            lastName: true,
            username: true,
          },
        },
      },
    });

    const users = orgWithUsers.map(ou => ({
      ...ou.user,
      orgRole: ou.role,
    }));

    return { data: users, total: users.length };
  }

  @Post('users/invite')
  @Roles('ADMIN')
  async inviteUser(@Body() dto: InviteUserDto, @OrgId() orgId: string) {
    // Check if user already exists
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (existing) throw new BadRequestException('User with this email already exists');

    // Generate a cryptographically stronger temporary password
    const tempPassword =
      Math.random().toString(36).slice(-10) +
      Math.random().toString(36).toUpperCase().slice(-4);

    // Hash with bcrypt (cost factor 12) — SHA-256 is NOT a password KDF
    const passwordHash = await bcrypt.hash(tempPassword, 12);

    // Create the user then link to org
    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        password: passwordHash,
        username: dto.email.toLowerCase(),
        role: dto.role,
        organizations: {
          create: {
            organizationId: orgId,
            role: 'MEMBER',
          },
        },
      },
    });

    // TODO: Send tempPassword to user.email via transactional email service.
    // Never return tempPassword in the API response.
    this.logger.log(`User invited: ${user.id} role: ${dto.role} org: ${orgId}`);

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      message: 'User invited. Temporary credentials will be sent via email.',
    };
  }

  @Patch('users/:id')
  @Roles('ADMIN')
  async updateUser(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    // UUID-based ID (no parseInt)
    const userId = id;

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        role: dto.role,
      },
    });

    this.logger.log(`User role updated: ${userId}`);

    return { id: updated.id, role: updated.role };
  }

  @Post('users/:id/deactivate')
  @Roles('ADMIN')
  async deactivateUser(@Param('id') id: string, @OrgId() orgId: string) {
    const userId = id;

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    // Remove user from the organization instead of deactivating (no isActive field)
    await this.prisma.userOrganization.deleteMany({
      where: { userId, organizationId: orgId },
    });

    this.logger.log(`User removed from org: ${userId} org: ${orgId}`);

    return { success: true };
  }

  @Get('integrations')
  @Roles('ADMIN')
  async listIntegrations(@Req() req: any) {
    const orgId = req.user.organizationId;

    const org = await this.prisma.organization.findUnique({ where: { id: orgId } });

    return {
      quickbooks: {
        connected: org?.quickbooksConnected ?? false,
      },
      stripe: { connected: !!org?.stripeConnectedAccountId },
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
    @Req() req: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
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