import { Controller, Get, Put, Param, Body, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { MaintenanceService } from '../maintenance/maintenance.service';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { AssignTechnicianDto } from '../maintenance/dto/assign-technician.dto';

interface AuthenticatedRequest {
  user: {
    userId: number;
    role: Role;
  };
}

@Controller('api')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(Role.PROPERTY_MANAGER)
export class MaintenanceLegacyController {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  @Get('maintenance-requests')
  async listRequests() {
    return this.maintenanceService.findAll({});
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
    return this.maintenanceService.assignTechnician(Number(requestId), dto, req.user.userId);
  }
}
