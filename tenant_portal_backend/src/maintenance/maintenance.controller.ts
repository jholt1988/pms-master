import { Body, Controller, Get, Param, Patch, Post, Query, Request, UseGuards, Put, ParseIntPipe } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { MaintenanceService } from './maintenance.service';
import { AIMaintenanceMetricsService } from './ai-maintenance-metrics.service';
import { MaintenancePriority, OrgRole, Role, Status } from '@prisma/client';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CreateMaintenanceRequestDto } from './dto/create-maintenance-request.dto';
import { UpdateMaintenanceStatusDto } from './dto/update-maintenance-status.dto';
import { AssignTechnicianDto } from './dto/assign-technician.dto';
import { AddMaintenanceNoteDto } from './dto/add-maintenance-note.dto';
import { AddMaintenancePhotoDto } from './dto/add-maintenance-photo.dto';
import { ConfirmMaintenanceCompleteDto } from './dto/confirm-maintenance-complete.dto';
import { ApiException } from '../common/errors';
import { ErrorCode } from '../common/errors/error-codes.enum';
import { OrgContextGuard } from '../common/org-context/org-context.guard';
import { OrgId } from '../common/org-context/org-id.decorator';

interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
    username: string;
    role: Role;
  };
}

type ManagerFilters = Parameters<MaintenanceService['findAllForOrgPaged']>[1];

@Controller('maintenance')
@UseGuards(AuthGuard('jwt'), RolesGuard, OrgContextGuard)
export class MaintenanceController {
  constructor(
    private readonly maintenanceService: MaintenanceService,
    private readonly aiMetrics: AIMaintenanceMetricsService,
  ) {}

  @Get()
  findAll(
    @Request() req: AuthenticatedRequest,
    @Query() query: Record<string, string | undefined>,
  ) {
    const filters = this.parseManagerFilters(query);

    if (req.user.role === Role.TENANT) {
      return this.maintenanceService.findAllForTenantPaged(req.user.userId, filters);
    }

    const orgId = (req as any).org?.orgId as string | undefined;
    return this.maintenanceService.findAllForOrgPaged(orgId, filters);
  }

  @Get('ai-metrics')
  @Roles(Role.PROPERTY_MANAGER, Role.ADMIN)
  async getAIMetrics() {
    return this.aiMetrics.getMetrics();
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedRequest,
  ) {
    const request = await this.maintenanceService.findById(id);

    if (req.user.role === Role.TENANT) {
      // Verify access: tenants can only see requests tied to their current lease.
      // This allows tenants to see PM-created requests for their unit/lease too.
      const lease = await this.maintenanceService.getLeaseForTenant(req.user.userId);
      if (!lease || request.leaseId !== lease.id) {
        throw ApiException.forbidden(
          ErrorCode.AUTH_FORBIDDEN,
          'You do not have access to this maintenance request',
          { userId: req.user.userId, requestId: id },
        );
      }
      return request;
    }

    // Org-scoped access for PM/Admin (single-org mode)
    const orgId = (req as any).org?.orgId as string | undefined;
    if (!orgId || request.property?.organizationId !== orgId) {
      throw ApiException.forbidden(
        ErrorCode.AUTH_FORBIDDEN,
        'You do not have access to this maintenance request',
        { userId: req.user.userId, requestId: id, orgId },
      );
    }

    return request;
  }

  @Post()
  async create(@Request() req: AuthenticatedRequest, @Body() dto: CreateMaintenanceRequestDto) {
    const orgId = (req as any).org?.orgId as string | undefined;
    const orgRole = (req as any).org?.orgRole as OrgRole | undefined;

    // Tenant creates are always derived from lease/unit/property
    if (req.user.role === Role.TENANT) {
      return this.maintenanceService.create(req.user.userId, req.user.role, dto, orgId);
    }

    // Owner creates must be tied to a specific property in-org.
    if (orgRole === OrgRole.OWNER && !dto.propertyId) {
      throw ApiException.badRequest(
        ErrorCode.VALIDATION_MISSING_REQUIRED_FIELD,
        'propertyId is required for owners when creating a maintenance request',
        { field: 'propertyId' },
      );
    }

    return this.maintenanceService.create(req.user.userId, req.user.role, dto, orgId);
  }

  @Patch(':id/status')
  @Roles(Role.PROPERTY_MANAGER, Role.ADMIN)
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateStatusDto: UpdateMaintenanceStatusDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const orgId = (req as any).org?.orgId as string | undefined;
    const orgRole = (req as any).org?.orgRole as OrgRole | undefined;
    return this.maintenanceService.updateStatusScoped(
      id,
      updateStatusDto,
      req.user.userId,
      req.user.role,
      orgId,
      orgRole,
    );
  }

  @Put(':id/status')
  @Roles(Role.PROPERTY_MANAGER, Role.ADMIN)
  async replaceStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateStatusDto: UpdateMaintenanceStatusDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const orgId = (req as any).org?.orgId as string | undefined;
    const orgRole = (req as any).org?.orgRole as OrgRole | undefined;
    return this.maintenanceService.updateStatusScoped(
      id,
      updateStatusDto,
      req.user.userId,
      req.user.role,
      orgId,
      orgRole,
    );
  }

  @Patch(':id/assign')
  @Roles(Role.PROPERTY_MANAGER, Role.ADMIN)
  async assignTechnician(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignTechnicianDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const orgId = (req as any).org?.orgId as string | undefined;
    const orgRole = (req as any).org?.orgRole as OrgRole | undefined;
    return this.maintenanceService.assignTechnicianScoped(
      id,
      dto,
      req.user.userId,
      req.user.role,
      orgId,
      orgRole,
    );
  }

  @Post(':id/notes')
  async addNote(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AddMaintenanceNoteDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const request = await this.maintenanceService.findById(id);

    if (req.user.role === Role.TENANT) {
      const lease = await this.maintenanceService.getLeaseForTenant(req.user.userId);
      if (!lease || request.leaseId !== lease.id) {
        throw ApiException.forbidden(
          ErrorCode.AUTH_FORBIDDEN,
          'You do not have access to this maintenance request',
          { userId: req.user.userId, requestId: id },
        );
      }
      return this.maintenanceService.addNoteScoped(
        id,
        dto,
        req.user.userId,
        req.user.role,
      );
    }

    const orgId = (req as any).org?.orgId as string | undefined;
    // Owners can add notes (read-mostly), but scoped to org.
    return this.maintenanceService.addNoteScoped(
      id,
      dto,
      req.user.userId,
      req.user.role,
      orgId,
    );
  }

  @Post(':id/photos')
  async addPhoto(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AddMaintenancePhotoDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const orgId = (req as any).org?.orgId as string | undefined;
    return this.maintenanceService.addPhotoScoped(
      id,
      dto,
      req.user.userId,
      req.user.role,
      orgId,
    );
  }

  @Post(':id/confirm-complete')
  @Roles(Role.TENANT)
  async confirmComplete(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ConfirmMaintenanceCompleteDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.maintenanceService.confirmCompleteScoped(id, req.user.userId, dto);
  }

  @Get('technicians')
  @Roles(Role.PROPERTY_MANAGER)
  listTechnicians() {
    return this.maintenanceService.listTechnicians();
  }

  @Post('technicians')
  @Roles(Role.PROPERTY_MANAGER)
  createTechnician(@Body() body: { name: string; phone?: string; email?: string; userId?: string; role?: string }) {
    return this.maintenanceService.createTechnician(body);
  }

  @Get('assets')
  @Roles(Role.PROPERTY_MANAGER)
  listAssets(
    @Query('propertyId') propertyId?: string,
    @Query('unitId') unitId?: string,
    @OrgId() orgId?: string,
  ) {
    const parsedUnitId = this.parseOptionalNumber(unitId, 'unitId');
    return this.maintenanceService.listAssets(propertyId, parsedUnitId, orgId);
  }

  @Post('assets')
  @Roles(Role.PROPERTY_MANAGER)
  createAsset(
    @Body()
    body: {
      propertyId: string;
      unitId?: string;
      name: string;
      category: string;
      manufacturer?: string;
      model?: string;
      serialNumber?: string;
      installDate?: string;
    },
    @OrgId() orgId?: string,
  ) {
    return this.maintenanceService.createAsset(body, orgId);
  }

  @Get('sla-policies')
  @Roles(Role.PROPERTY_MANAGER)
  getSlaPolicies(@Query('propertyId') propertyId?: string, @OrgId() orgId?: string) {
    return this.maintenanceService.getSlaPolicies(propertyId, orgId);
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

    const propertyId = query.propertyId;
    if (propertyId !== undefined) {
      filters.propertyId = propertyId;
    }

    const unitId = this.parseOptionalNumber(query.unitId, 'unitId');
    if (unitId !== undefined) {
      filters.unitId = unitId;
    }

    const assigneeId = this.parseOptionalNumber(query.assigneeId, 'assigneeId', { min: 1 });
    if (assigneeId !== undefined) {
      filters.assigneeId = assigneeId;
    }

    const unassigned = this.parseOptionalBoolean(query.unassigned);
    if (unassigned !== undefined) {
      filters.unassigned = unassigned;
    }

    const overdue = this.parseOptionalBoolean(query.overdue);
    if (overdue !== undefined) {
      filters.overdue = overdue;
    }

    const dueSoonHours = this.parseOptionalNumber(query.dueSoonHours, 'dueSoonHours', { min: 1 });
    if (dueSoonHours !== undefined) {
      filters.dueSoonHours = dueSoonHours;
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
    throw ApiException.badRequest(
      ErrorCode.VALIDATION_INVALID_INPUT,
      `Unsupported status filter: ${value}`,
      { field: 'status', value },
    );
  }

  private parsePriority(value?: string): MaintenancePriority | undefined {
    if (!value) {
      return undefined;
    }
    const normalized = value.trim().toUpperCase();
    if ((Object.values(MaintenancePriority) as string[]).includes(normalized)) {
      return normalized as MaintenancePriority;
    }
    throw ApiException.badRequest(
      ErrorCode.VALIDATION_INVALID_INPUT,
      `Unsupported priority filter: ${value}`,
      { field: 'priority', value },
    );
  }

  private parseOptionalBoolean(value: string | undefined): boolean | undefined {
    if (value === undefined || value === '') {
      return undefined;
    }
    const normalized = value.trim().toLowerCase();
    if (['1', 'true', 'yes', 'y', 'on'].includes(normalized)) {
      return true;
    }
    if (['0', 'false', 'no', 'n', 'off'].includes(normalized)) {
      return false;
    }
    throw ApiException.badRequest(
      ErrorCode.VALIDATION_INVALID_FORMAT,
      `Invalid boolean value: ${value}`,
      { value },
    );
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
      throw ApiException.badRequest(
        ErrorCode.VALIDATION_INVALID_FORMAT,
        `Invalid ${field} value: ${value}`,
        { field, value },
      );
    }
    const normalized = Math.trunc(parsed);
    if (options?.min !== undefined && normalized < options.min) {
      throw ApiException.badRequest(
        ErrorCode.VALIDATION_OUT_OF_RANGE,
        `${field} must be greater than or equal to ${options.min}`,
        { field, min: options.min, value: normalized },
      );
    }
    return normalized;
  }

}
