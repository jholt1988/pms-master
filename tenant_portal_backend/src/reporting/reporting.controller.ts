import { Controller, Get, Query, UseGuards, Req, ParseIntPipe } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { OrgContextGuard } from '../common/org-context/org-context.guard';
import { OrgId } from '../common/org-context/org-id.decorator';
import { LeaseStatus } from '@prisma/client';
import { ReportingService } from './reporting.service';
import { Request } from 'express';

interface AuthenticatedRequest extends Request {
  user: {
    sub: string;
    username: string;
    role: string;
  };
}

@Controller('reporting')
@UseGuards(AuthGuard('jwt'), RolesGuard, OrgContextGuard)
@Roles('PROPERTY_MANAGER', 'OWNER')
export class ReportingController {
  constructor(private readonly reportingService: ReportingService) {}

  @Get('rent-roll')
  async getRentRoll(
    @Query('propertyId') propertyId?: string,
    @Query('status') status?: LeaseStatus,
    @OrgId() orgId?: string,
  ) {
    return this.reportingService.getRentRoll({
      propertyId: propertyId && propertyId.trim() ? propertyId.trim() : undefined,
      status,
      orgId,
    });
  }

  @Get('profit-loss')
  async getProfitAndLoss(
    @Query('propertyId') propertyId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @OrgId() orgId?: string,
  ) {
    return this.reportingService.getProfitAndLoss({
      propertyId: propertyId && propertyId.trim() ? propertyId.trim() : undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      orgId,
    });
  }

  @Get('maintenance-analytics')
  async getMaintenanceAnalytics(
    @Query('propertyId') propertyId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @OrgId() orgId?: string,
  ) {
    return this.reportingService.getMaintenanceResolutionAnalytics({
      propertyId: propertyId && propertyId.trim() ? propertyId.trim() : undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      orgId,
    });
  }

  @Get('vacancy-rate')
  async getVacancyRate(@Query('propertyId') propertyId?: string, @OrgId() orgId?: string) {
    return this.reportingService.getVacancyRate({
      propertyId: propertyId && propertyId.trim() ? propertyId.trim() : undefined,
      orgId,
    });
  }

  @Get('payment-history')
  async getPaymentHistory(
    @Query('userId') userId?: string,
    @Query('propertyId') propertyId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @OrgId() orgId?: string,
  ) {
    return this.reportingService.getPaymentHistory({
      userId: userId && userId.trim() ? userId.trim() : undefined,
      propertyId: propertyId && propertyId.trim() ? propertyId.trim() : undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      orgId,
    });
  }

  @Get('manual-payments-summary')
  async getManualPaymentsSummary(
    @Query('propertyId') propertyId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @OrgId() orgId?: string,
  ) {
    return this.reportingService.getManualPaymentsSummary({
      propertyId: propertyId && propertyId.trim() ? propertyId.trim() : undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      orgId,
    });
  }

  @Get('manual-charges-summary')
  async getManualChargesSummary(
    @Query('propertyId') propertyId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @OrgId() orgId?: string,
  ) {
    return this.reportingService.getManualChargesSummary({
      propertyId: propertyId && propertyId.trim() ? propertyId.trim() : undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      orgId,
    });
  }
}
