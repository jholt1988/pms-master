import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
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

  @Get('/tenant')
  @UseGuards(AuthGuard('jwt'), RolesGuard, OrgContextGuard)
  @Roles('TENANT')
  getTenantDashboard(@Request() req: AuthenticatedRequest) {
    return this.dashboardService.getTenantDashboard(req.user.userId);
  }
}
