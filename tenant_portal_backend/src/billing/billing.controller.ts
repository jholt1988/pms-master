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
  @Roles('PROPERTY_MANAGER')
  @Get('schedules')
  async listSchedules(@OrgId() orgId: string) {
    return this.billingService.listSchedules(orgId);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard, OrgContextGuard)
  @Roles('PROPERTY_MANAGER')
  @Post('schedules')
  async upsertSchedule(@Body() dto: UpsertScheduleDto, @Req() req: AuthenticatedRequest, @OrgId() orgId: string) {
    return this.billingService.upsertSchedule(
      { userId: req.user.userId, username: req.user.username, role: req.user.role },
      dto,
      orgId,
    );
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard, OrgContextGuard)
  @Roles('PROPERTY_MANAGER')
  @Patch('schedules/:leaseId/deactivate')
  async deactivate(@Param('leaseId') leaseId: string, @Req() req: AuthenticatedRequest, @OrgId() orgId: string) {
    return this.billingService.deactivateSchedule(
      { userId: req.user.userId, username: req.user.username, role: req.user.role },
      leaseId,
      orgId,
    );
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard, OrgContextGuard)
  @Roles('TENANT', 'PROPERTY_MANAGER')
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
  @Roles('TENANT', 'PROPERTY_MANAGER')
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
  @Roles('TENANT', 'PROPERTY_MANAGER')
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
  @Roles('TENANT', 'PROPERTY_MANAGER')
  @Get('autopay/needs-auth-attempts')
  async listNeedsAuthAttempts(@Req() req: AuthenticatedRequest) {
    if (req.user.role === Role.TENANT) {
      return this.billingService.listNeedsAuthAttemptsForTenant(req.user.userId);
    }
    throw new BadRequestException('Property manager view not implemented for this endpoint');
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard, OrgContextGuard)
  @Roles('TENANT', 'PROPERTY_MANAGER')
  @Post('autopay/needs-auth-attempts/:attemptId/recover')
  async recoverNeedsAuthAttempt(@Param('attemptId') attemptId: string, @Req() req: AuthenticatedRequest) {
    const orgId = (req as any).org?.orgId as string | undefined;
    return this.billingService.recoverNeedsAuthAttempt(
      { userId: req.user.userId, username: req.user.username, role: req.user.role },
      attemptId,
      orgId,
    );
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard, OrgContextGuard)
  @Roles('PROPERTY_MANAGER')
  @Get('connected-account')
  async getConnectedAccount(@OrgId() orgId: string) {
    return this.billingService.getConnectedAccount(orgId);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard, OrgContextGuard)
  @Roles('PROPERTY_MANAGER')
  @Patch('connected-account')
  async upsertConnectedAccount(
    @OrgId() orgId: string,
    @Body()
    body: {
      stripeConnectedAccountId?: string;
      stripeOnboardingStatus?: 'NOT_STARTED' | 'PENDING' | 'IN_REVIEW' | 'COMPLETED' | 'RESTRICTED';
      stripeChargesEnabled?: boolean;
      stripePayoutsEnabled?: boolean;
      stripeDetailsSubmitted?: boolean;
      stripeCapabilities?: Record<string, unknown>;
      stripeOnboardingCompletedAt?: string;
    },
  ) {
    return this.billingService.upsertConnectedAccount(orgId, body);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard, OrgContextGuard)
  @Roles('PROPERTY_MANAGER')
  @Post('connected-account/onboarding-link')
  async createOnboardingLink(
    @OrgId() orgId: string,
    @Body() body: { refreshUrl: string; returnUrl: string },
  ) {
    return this.billingService.createOnboardingLink(orgId, body);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard, OrgContextGuard)
  @Roles('PROPERTY_MANAGER')
  @Post('connected-account/refresh')
  async refreshConnectedAccountStatus(@OrgId() orgId: string) {
    return this.billingService.refreshConnectedAccountStatus(orgId);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard, OrgContextGuard)
  @Roles('PROPERTY_MANAGER')
  @Post('fee-schedules/versions')
  async createFeeScheduleVersion(
    @OrgId() orgId: string,
    @Req() req: AuthenticatedRequest,
    @Body() body: { versionLabel: string; effectiveAt: string; feeConfig: Record<string, unknown> },
  ) {
    return this.billingService.createFeeScheduleVersion(orgId, req.user.userId, body);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard, OrgContextGuard)
  @Roles('PROPERTY_MANAGER')
  @Post('plan-cycles')
  async createPlanCycle(
    @OrgId() orgId: string,
    @Body() body: { name: string; startsAt: string; endsAt: string; status?: 'DRAFT' | 'ACTIVE' | 'CLOSED'; activeFeeScheduleId?: string },
  ) {
    return this.billingService.createPlanCycle(orgId, body);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard, OrgContextGuard)
  @Roles('PROPERTY_MANAGER')
  @Post('pricing-snapshots')
  async createPricingSnapshot(
    @OrgId() orgId: string,
    @Body()
    body: {
      planCycleId: string;
      feeScheduleVersionId: string;
      snapshotType?: string;
      inputPayload?: Record<string, unknown>;
      computedFees: Record<string, unknown>;
    },
  ) {
    return this.billingService.createPricingSnapshot(orgId, body);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard, OrgContextGuard)
  @Roles('PROPERTY_MANAGER')
  @Get('pricing-snapshots')
  async listPricingSnapshots(@OrgId() orgId: string, @Query('planCycleId') planCycleId?: string) {
    return this.billingService.listPricingSnapshots(orgId, planCycleId);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard, OrgContextGuard)
  @Roles('PROPERTY_MANAGER')
  @Post('run')
  async runBilling() {
    return this.billingService.manualRun();
  }
}

