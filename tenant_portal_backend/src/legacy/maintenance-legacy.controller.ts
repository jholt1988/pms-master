import { Controller, Get, Put, Param, Body, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';
import { MaintenanceService } from '../maintenance/maintenance.service';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

import { AssignTechnicianDto } from '../maintenance/dto/assign-technician.dto';

interface AuthenticatedRequest {
  user: {
    userId: string;
    role: Role;
  };
}

// Global prefix 'api' is applied at bootstrap; declare no extra segment so routes
// resolve to /api/maintenance-requests, /api/users/technicians, etc.
@Controller()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('PROPERTY_MANAGER')
export class MaintenanceLegacyController {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  @Get('maintenance-requests')
  async listRequests(@Request() req: AuthenticatedRequest) {
    const orgId = (req as any).org?.orgId as string | undefined;
    return this.maintenanceService.findAllForOrgPaged(orgId, {});
  }

  @Get('users/technicians')
  async listTechnicians(@Request() req: AuthenticatedRequest) {
    const orgId = (req as any).org?.orgId as string | undefined;
    return this.maintenanceService.listTechnicians(orgId);
  }

  @Put('maintenance/:requestId/assignee')
  async assignRequest(
    @Param('requestId') requestId: string,
    @Body() dto: AssignTechnicianDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const orgId = (req as any).org?.orgId as string | undefined;
    const orgRole = (req as any).org?.orgRole as any;
    return this.maintenanceService.assignTechnicianScoped(
      requestId,
      dto,
      req.user.userId,
      req.user.role,
      orgId,
      orgRole,
    );
  }
}
