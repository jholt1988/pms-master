import { Controller, Get, Put, Param, Body, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { MaintenanceService } from '../maintenance/maintenance.service';
import { RolesGuard } from '../auth/roles.guard';
import { OrgContextGuard } from '../common/org-context/org-context.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { AssignTechnicianDto } from '../maintenance/dto/assign-technician.dto';

interface AuthenticatedRequest {
  user: {
    userId: string;
    role: Role;
  };
}

@Controller('api')
@UseGuards(AuthGuard('jwt'), RolesGuard, OrgContextGuard)
@Roles(Role.PROPERTY_MANAGER)
export class MaintenanceLegacyController {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  @Get('maintenance-requests')
  async listRequests(@Request() req: AuthenticatedRequest) {
    const orgId = (req as any).org?.orgId as string | undefined;
    return this.maintenanceService.findAllForOrgPaged(orgId, {});
  }

  @Get('users/technicians')
  async listTechnicians() {
    return this.maintenanceService.listTechnicians();
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
