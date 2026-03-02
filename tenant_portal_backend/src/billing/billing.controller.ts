import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { BillingService } from './billing.service';
import { UpsertScheduleDto } from './dto/upsert-schedule.dto';
import { ConfigureAutopayDto } from './dto/configure-autopay.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { OrgContextGuard } from '../common/org-context/org-context.guard';
import { OrgId } from '../common/org-context/org-id.decorator';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { Request } from 'express';

interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
    username: string;
    role: Role;
  };
}

@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @UseGuards(AuthGuard('jwt'), RolesGuard, OrgContextGuard)
  @Roles(Role.PROPERTY_MANAGER)
  @Get('schedules')
  async listSchedules(@OrgId() orgId: string) {
    return this.billingService.listSchedules(orgId);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard, OrgContextGuard)
  @Roles(Role.PROPERTY_MANAGER)
  @Post('schedules')
  async upsertSchedule(@Body() dto: UpsertScheduleDto, @Req() req: AuthenticatedRequest, @OrgId() orgId: string) {
    return this.billingService.upsertSchedule(
      { userId: req.user.userId, username: req.user.username, role: req.user.role },
      dto,
      orgId,
    );
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard, OrgContextGuard)
  @Roles(Role.PROPERTY_MANAGER)
  @Patch('schedules/:leaseId/deactivate')
  async deactivate(@Param('leaseId') leaseId: string, @Req() req: AuthenticatedRequest, @OrgId() orgId: string) {
    return this.billingService.deactivateSchedule(
      { userId: req.user.userId, username: req.user.username, role: req.user.role },
      leaseId,
      orgId,
    );
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard, OrgContextGuard)
  @Roles(Role.TENANT, Role.PROPERTY_MANAGER)
  @Get('autopay')
  async getAutopay(@Req() req: AuthenticatedRequest, @Query('leaseId') leaseId?: string) {
    if (req.user.role === Role.TENANT) {
      return this.billingService.getAutopayForTenant(req.user.userId);
    }

    if (!leaseId) {
      throw new BadRequestException('leaseId query param required for property manager');
    }

    const orgId = (req as any).org?.orgId as string | undefined;
    const lease = await this.billingService.getAutopayForLease(leaseId, orgId);
    return {
      leaseId: lease.id,
      autopayEnrollment: lease.autopayEnrollment,
      tenant: lease.tenant,
      unit: lease.unit,
    };
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard, OrgContextGuard)
  @Roles(Role.TENANT, Role.PROPERTY_MANAGER)
  @Post('autopay')
  async configureAutopay(@Body() dto: ConfigureAutopayDto, @Req() req: AuthenticatedRequest) {
    const orgId = (req as any).org?.orgId as string | undefined;
    return this.billingService.configureAutopay(
      { userId: req.user.userId, username: req.user.username, role: req.user.role },
      dto,
      orgId,
    );
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard, OrgContextGuard)
  @Roles(Role.TENANT, Role.PROPERTY_MANAGER)
  @Patch('autopay/:leaseId/disable')
  async disableAutopay(@Param('leaseId') leaseId: string, @Req() req: AuthenticatedRequest) {
    const orgId = (req as any).org?.orgId as string | undefined;
    return this.billingService.disableAutopay(
      { userId: req.user.userId, username: req.user.username, role: req.user.role },
      leaseId,
      orgId,
    );
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard, OrgContextGuard)
  @Roles(Role.PROPERTY_MANAGER)
  @Post('run')
  async runBilling() {
    return this.billingService.manualRun();
  }
}

