import { Body, Controller, Get, Patch, Param, Post, UseGuards, Request } from '@nestjs/common';
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

  @Get('calendar')
  @UseGuards(AuthGuard('jwt'), RolesGuard, OrgContextGuard)
  @Roles('PROPERTY_MANAGER', 'OWNER')
  getOperationalCalendar(
    @Request() req: AuthenticatedRequest,
    @OrgId() orgId?: string,
  ) {
    return this.dashboardService.getOperationalCalendar(orgId, {
      actorId: req.user.userId,
    });
  }

  @Get('action-intents')
  @UseGuards(AuthGuard('jwt'), RolesGuard, OrgContextGuard)
  @Roles('PROPERTY_MANAGER', 'OWNER')
  getActionIntents(@OrgId() orgId?: string) {
    return this.dashboardService.getActionIntents(orgId);
  }

  @Patch('action-intents/:id/resolve')
  @UseGuards(AuthGuard('jwt'), RolesGuard, OrgContextGuard)
  @Roles('PROPERTY_MANAGER', 'OWNER')
  resolveActionIntent(
    @Param('id') id: string,
    @Body() body: { action: string },
    @OrgId() orgId?: string,
  ) {
    return this.dashboardService.resolveActionIntent(id, body.action || 'RESOLVED', orgId);
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
