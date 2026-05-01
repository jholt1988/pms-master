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
  Req 
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { PrismaService } from '../prisma/prisma.service';

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
  role?: string;
  propertyIds?: string[];
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

    // Filter out undefined values so we don't accidentally overwrite with null
    const data: Record<string, any> = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.timezone !== undefined) data.timezone = dto.timezone;
    if (dto.dateFormat !== undefined) data.dateFormat = dto.dateFormat;
    if (dto.currency !== undefined) data.currency = dto.currency;
    if (dto.lateFeeEnabled !== undefined) data.lateFeeEnabled = dto.lateFeeEnabled;
    if (dto.lateFeeGraceDays !== undefined) data.lateFeeGraceDays = dto.lateFeeGraceDays;
    if (dto.lateFeeAmount !== undefined) data.lateFeeAmount = dto.lateFeeAmount;

    const updated = await this.prisma.organization.update({
      where: { id: orgId },
      data: data as any,
    });

    console.log('[SETTINGS] Org updated:', orgId);

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

    // Create the user then link to org
    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        // Use 'password' field (the schema field name)
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
    // UUID-based ID (no parseInt)
    const userId = id;

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        role: dto.role as any,
      },
    });

    console.log('[SETTINGS] User updated:', userId);

    return { id: updated.id, role: updated.role };
  }

  @Post('users/:id/deactivate')
  @Roles('ADMIN')
  async deactivateUser(@Param('id') id: string, @Req() req: any) {
    const userId = id;
    const orgId = req.user.organizationId;

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    // Remove user from the organization instead of deactivating (no isActive field)
    await this.prisma.userOrganization.deleteMany({
      where: { userId, organizationId: orgId },
    });

    console.log('[SETTINGS] User removed from org:', userId);

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
      data: { quickbooksConnected: false } as any,
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