import { Body, Controller, Get, Post, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';
import { RolesGuard } from '../auth/roles.guard';
import { OrgContextGuard } from '../common/org-context/org-context.guard';
import { OrgId } from '../common/org-context/org-id.decorator';
import { Roles } from '../auth/roles.decorator';

import { DashboardService } from './dashboard.service';

interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
    role: Role;
  };
}

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('metrics')
  @UseGuards(AuthGuard('jwt'), RolesGuard, OrgContextGuard)
  @Roles('PROPERTY_MANAGER', 'OWNER')
  getPropertyManagerDashboardMetrics(@OrgId() orgId?: string) {
    return this.dashboardService.getPropertyManagerDashboardMetrics(orgId);
  }

  @Get('action-intents')
  @UseGuards(AuthGuard('jwt'), RolesGuard, OrgContextGuard)
  @Roles('PROPERTY_MANAGER', 'OWNER')
  getActionIntents(@OrgId() orgId?: string) {
    // Return mock data for now to satisfy frontend contract
    return {
      intents: [
        { id: '1', type: 'RISK_MITIGATION', description: 'HVAC unit #3 at 123 Main St showing signs of failure. Proactive maintenance suggested.', status: 'PENDING', priority: 'HIGH', createdAt: new Date().toISOString() },
        { id: '2', type: 'AUTOMATION', description: 'Rent payment for Unit 5B automatically processed.', status: 'EXECUTED', priority: 'LOW', createdAt: new Date(Date.now() - 3600000).toISOString() },
        { id: '3', type: 'ALERT', description: 'Lease for 7A expires in 30 days. Renewal notice prepared.', status: 'PENDING', priority: 'MEDIUM', createdAt: new Date(Date.now() - 7200000).toISOString() },
      ]
    };
  }

  @Get('property-locations')
  @UseGuards(AuthGuard('jwt'), RolesGuard, OrgContextGuard)
  @Roles('PROPERTY_MANAGER', 'OWNER')
  getPropertyLocations(@OrgId() orgId?: string) {
    return this.dashboardService.getPropertyLocations(orgId);
  }

  @Post('property-locations/geocode-missing')
  @UseGuards(AuthGuard('jwt'), RolesGuard, OrgContextGuard)
  @Roles('PROPERTY_MANAGER', 'OWNER')
  geocodeMissingPropertyLocations(
    @OrgId() orgId?: string,
    @Body() body?: { propertyIds?: string[] },
  ) {
    return this.dashboardService.geocodeMissingPropertyLocations(orgId, body?.propertyIds);
  }

  @Get('property-locations/geocode-audit')
  @UseGuards(AuthGuard('jwt'), RolesGuard, OrgContextGuard)
  @Roles('PROPERTY_MANAGER', 'OWNER')
  getGeocodeAudit(@OrgId() orgId?: string) {
    return this.dashboardService.getRecentGeocodeAudit(orgId);
  }

  @Get('/tenant')
  @UseGuards(AuthGuard('jwt'), RolesGuard, OrgContextGuard)
  @Roles('TENANT')
  getTenantDashboard(@Request() req: AuthenticatedRequest) {
    return this.dashboardService.getTenantDashboard(req.user.userId);
  }
}
