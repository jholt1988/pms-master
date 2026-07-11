import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

import { DashboardService } from './dashboard.service';

interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
    role: Role;
  };
}

@Controller('tenant')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('TENANT')
export class TenantDashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('dashboard')
  getTenantDashboard(@Request() req: AuthenticatedRequest) {
    return this.dashboardService.getTenantDashboard(req.user.userId);
  }
}
