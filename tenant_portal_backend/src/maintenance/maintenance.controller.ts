import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Query, Request, UseGuards, Put } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { MaintenanceService } from './maintenance.service';
import { MaintenancePriority, Role, Status } from '@prisma/client';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CreateMaintenanceRequestDto } from './dto/create-maintenance-request.dto';
import { UpdateMaintenanceStatusDto } from './dto/update-maintenance-status.dto';
import { AssignTechnicianDto } from './dto/assign-technician.dto';
import { AddMaintenanceNoteDto } from './dto/add-maintenance-note.dto';

interface AuthenticatedRequest extends Request {
  user: {
    userId: number;
    username: string;
    role: Role;
  };
}

type ManagerFilters = Parameters<MaintenanceService['findAll']>[0];

@Controller('maintenance')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class MaintenanceController {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  @Get()
  findAll(
    @Request() req: AuthenticatedRequest,
    @Query() query: Record<string, string | undefined>,
  ) {
    if (req.user.role === Role.PROPERTY_MANAGER) {
      const filters = this.parseManagerFilters(query);
      return this.maintenanceService.findAll(filters);
    }
    return this.maintenanceService.findAllForUser(req.user.userId);
  }

  @Post()
  async create(@Request() req: AuthenticatedRequest, @Body() dto: CreateMaintenanceRequestDto) {
    return this.maintenanceService.create(req.user.userId, dto);
  }

  @Patch(':id/status')
  @Roles(Role.PROPERTY_MANAGER)
  async updateStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateMaintenanceStatusDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.maintenanceService.updateStatus(Number(id), updateStatusDto, req.user.userId);
  }

  @Put(':id/status')
  @Roles(Role.PROPERTY_MANAGER)
  async replaceStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateMaintenanceStatusDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.maintenanceService.updateStatus(Number(id), updateStatusDto, req.user.userId);
  }

  @Patch(':id/assign')
  @Roles(Role.PROPERTY_MANAGER)
  async assignTechnician(
    @Param('id') id: string,
    @Body() dto: AssignTechnicianDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.maintenanceService.assignTechnician(Number(id), dto, req.user.userId);
  }

  @Post(':id/notes')
  async addNote(
    @Param('id') id: string,
    @Body() dto: AddMaintenanceNoteDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.maintenanceService.addNote(Number(id), dto, req.user.userId);
  }

  @Get('technicians')
  @Roles(Role.PROPERTY_MANAGER)
  listTechnicians() {
    return this.maintenanceService.listTechnicians();
  }

  @Post('technicians')
  @Roles(Role.PROPERTY_MANAGER)
  createTechnician(@Body() body: { name: string; phone?: string; email?: string; userId?: number; role?: string }) {
    return this.maintenanceService.createTechnician(body);
  }

  @Get('assets')
  @Roles(Role.PROPERTY_MANAGER)
  listAssets(@Query('propertyId') propertyId?: string, @Query('unitId') unitId?: string) {
    const parsedPropertyId = this.parseOptionalNumber(propertyId, 'propertyId', { min: 1 });
    const parsedUnitId = this.parseOptionalNumber(unitId, 'unitId', { min: 1 });
    return this.maintenanceService.listAssets(parsedPropertyId, parsedUnitId);
  }

  @Post('assets')
  @Roles(Role.PROPERTY_MANAGER)
  createAsset(
    @Body()
    body: {
      propertyId: number;
      unitId?: number;
      name: string;
      category: string;
      manufacturer?: string;
      model?: string;
      serialNumber?: string;
      installDate?: string;
    },
  ) {
    return this.maintenanceService.createAsset(body);
  }

  @Get('sla-policies')
  @Roles(Role.PROPERTY_MANAGER)
  getSlaPolicies(@Query('propertyId') propertyId?: string) {
    const parsedPropertyId = this.parseOptionalNumber(propertyId, 'propertyId', { min: 1 });
    return this.maintenanceService.getSlaPolicies(parsedPropertyId);
  }

  private parseManagerFilters(query: Record<string, string | undefined>): ManagerFilters {
    const filters: ManagerFilters = {};

    const status = this.parseStatus(query.status);
    if (status) {
      filters.status = status;
    }

    const priority = this.parsePriority(query.priority);
    if (priority) {
      filters.priority = priority;
    }

    const propertyId = this.parseOptionalNumber(query.propertyId, 'propertyId', { min: 1 });
    if (propertyId !== undefined) {
      filters.propertyId = propertyId;
    }

    const unitId = this.parseOptionalNumber(query.unitId, 'unitId', { min: 1 });
    if (unitId !== undefined) {
      filters.unitId = unitId;
    }

    const assigneeId = this.parseOptionalNumber(query.assigneeId, 'assigneeId', { min: 1 });
    if (assigneeId !== undefined) {
      filters.assigneeId = assigneeId;
    }

    const page = this.parseOptionalNumber(query.page, 'page', { min: 1 });
    if (page !== undefined) {
      filters.page = page;
    }

    const pageSize = this.parseOptionalNumber(query.pageSize, 'pageSize', { min: 1 });
    if (pageSize !== undefined) {
      filters.pageSize = pageSize;
    }

    return filters;
  }

  private parseStatus(value?: string): Status | undefined {
    if (!value) {
      return undefined;
    }
    const normalized = value.trim().toUpperCase();
    if ((Object.values(Status) as string[]).includes(normalized)) {
      return normalized as Status;
    }
    throw new BadRequestException(`Unsupported status filter: ${value}`);
  }

  private parsePriority(value?: string): MaintenancePriority | undefined {
    if (!value) {
      return undefined;
    }
    const normalized = value.trim().toUpperCase();
    if ((Object.values(MaintenancePriority) as string[]).includes(normalized)) {
      return normalized as MaintenancePriority;
    }
    throw new BadRequestException(`Unsupported priority filter: ${value}`);
  }

  private parseOptionalNumber(
    value: string | undefined,
    field: string,
    options?: { min?: number },
  ): number | undefined {
    if (value === undefined || value === '') {
      return undefined;
    }
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      throw new BadRequestException(`Invalid ${field} value: ${value}`);
    }
    const normalized = Math.trunc(parsed);
    if (options?.min !== undefined && normalized < options.min) {
      throw new BadRequestException(`${field} must be greater than or equal to ${options.min}`);
    }
    return normalized;
  }
}
