import { Controller, Get, Request, UseGuards } from '@nestjs/common';
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

@Controller('api/tenant')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(Role.TENANT)
export class TenantDashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('dashboard')
  getTenantDashboard(@Request() req: AuthenticatedRequest) {
    return this.dashboardService.getTenantDashboard(req.user.userId);
  }
}
