import { Controller, Get, Query, UseGuards, Req, ParseIntPipe } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { Role, LeaseStatus } from '@prisma/client';
import { ReportingService } from './reporting.service';
import { Request } from 'express';

interface AuthenticatedRequest extends Request {
  user: {
    sub: number;
    username: string;
    role: string;
  };
}

@Controller('reporting')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(Role.PROPERTY_MANAGER)
export class ReportingController {
  constructor(private readonly reportingService: ReportingService) {}

  @Get('rent-roll')
  async getRentRoll(
    @Query('propertyId') propertyId?: string,
    @Query('status') status?: LeaseStatus,
  ) {
    return this.reportingService.getRentRoll({
      propertyId: propertyId ? parseInt(propertyId, 10) : undefined,
      status,
    });
  }

  @Get('profit-loss')
  async getProfitAndLoss(
    @Query('propertyId') propertyId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportingService.getProfitAndLoss({
      propertyId: propertyId ? parseInt(propertyId, 10) : undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }

  @Get('maintenance-analytics')
  async getMaintenanceAnalytics(
    @Query('propertyId') propertyId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportingService.getMaintenanceResolutionAnalytics({
      propertyId: propertyId ? parseInt(propertyId, 10) : undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }

  @Get('vacancy-rate')
  async getVacancyRate(@Query('propertyId') propertyId?: string) {
    return this.reportingService.getVacancyRate({
      propertyId: propertyId ? parseInt(propertyId, 10) : undefined,
    });
  }

  @Get('payment-history')
  async getPaymentHistory(
    @Query('userId') userId?: string,
    @Query('propertyId') propertyId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportingService.getPaymentHistory({
      userId: userId ? parseInt(userId, 10) : undefined,
      propertyId: propertyId ? parseInt(propertyId, 10) : undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }
}

