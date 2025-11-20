import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { DashboardService } from './dashboard.service';

interface AuthenticatedRequest extends Request {
  user: {
    userId: number;
    role: Role;
  };
}

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('metrics')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.PROPERTY_MANAGER)
  getPropertyManagerDashboardMetrics() {
    return this.dashboardService.getPropertyManagerDashboardMetrics();
  }

  @Get('/tenant')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.TENANT)
  getTenantDashboard(@Request() req: AuthenticatedRequest) {
    return this.dashboardService.getTenantDashboard(req.user.userId);
  }
}
