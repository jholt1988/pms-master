import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Query, Request, UploadedFiles, UseGuards, UseInterceptors, Put } from '@nestjs/common';
import { isUUID } from 'class-validator';
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
import { AuditLogService } from '../shared/audit-log.service';
import { MaintenanceFeatureExtractionService } from './ai/maintenance-feature-extraction.service';
import { MaintenanceDataQualityService } from './ai/maintenance-data-quality.service';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import * as fs from 'fs/promises';
import * as path from 'path';
import { randomBytes } from 'crypto';

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
    private readonly auditLogService: AuditLogService,
    private readonly featureExtractionService: MaintenanceFeatureExtractionService,
    private readonly dataQualityService: MaintenanceDataQualityService,
  ) {
    this.ensureUploadDir();
  }

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
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  async getAIMetrics() {
    return this.aiMetrics.getMetrics();
  }

  @Get('diagnostics/data-quality')
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  async getDataQualityDiagnostics() {
    return this.dataQualityService.getReport();
  }

  @Get('ai/features/:id')
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  async getMaintenanceFeatures(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    const request = await this.maintenanceService.findById(id);

    const orgId = (req as any).org?.orgId as string | undefined;
    if (!orgId || request.property?.organizationId !== orgId) {
      throw ApiException.forbidden(
        ErrorCode.AUTH_FORBIDDEN,
        'You do not have access to this maintenance request',
        { userId: req.user.userId, requestId: id, orgId },
      );
    }

    return this.featureExtractionService.extractFeatures(request as any);
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
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
      const created = await this.maintenanceService.create(req.user.userId, req.user.role, dto, orgId);
    await this.auditLogService.record({
      orgId,
      actorId: req.user.userId,
      module: 'MAINTENANCE',
      action: 'REQUEST_CREATED',
      entityType: 'MaintenanceRequest',
      entityId: created.id,
      result: 'SUCCESS',
      metadata: { priority: dto.priority, category: dto.category },
    });
    return created;
    }

    // Owner creates must be tied to a specific property in-org.
    if (orgRole === OrgRole.OWNER && !dto.propertyId) {
      throw ApiException.badRequest(
        ErrorCode.VALIDATION_MISSING_REQUIRED_FIELD,
        'propertyId is required for owners when creating a maintenance request',
        { field: 'propertyId' },
      );
    }

    const created = await this.maintenanceService.create(req.user.userId, req.user.role, dto, orgId);
    await this.auditLogService.record({
      orgId,
      actorId: req.user.userId,
      module: 'MAINTENANCE',
      action: 'REQUEST_CREATED',
      entityType: 'MaintenanceRequest',
      entityId: created.id,
      result: 'SUCCESS',
      metadata: { priority: dto.priority, category: dto.category },
    });
    return created;
  }

  @Patch(':id/status')
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  async updateStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateMaintenanceStatusDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const orgId = (req as any).org?.orgId as string | undefined;
    const orgRole = (req as any).org?.orgRole as OrgRole | undefined;
    const updated = await this.maintenanceService.updateStatusScoped(
      id,
      updateStatusDto,
      req.user.userId,
      req.user.role,
      orgId,
      orgRole,
    );
    await this.auditLogService.record({
      orgId,
      actorId: req.user.userId,
      module: 'MAINTENANCE',
      action: 'STATUS_UPDATED',
      entityType: 'MaintenanceRequest',
      entityId: updated.id,
      result: 'SUCCESS',
      metadata: { status: updateStatusDto.status },
    });
    return updated;
  }

  @Put(':id/status')
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  async replaceStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateMaintenanceStatusDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const orgId = (req as any).org?.orgId as string | undefined;
    const orgRole = (req as any).org?.orgRole as OrgRole | undefined;
    const updated = await this.maintenanceService.updateStatusScoped(
      id,
      updateStatusDto,
      req.user.userId,
      req.user.role,
      orgId,
      orgRole,
    );
    await this.auditLogService.record({
      orgId,
      actorId: req.user.userId,
      module: 'MAINTENANCE',
      action: 'STATUS_UPDATED',
      entityType: 'MaintenanceRequest',
      entityId: updated.id,
      result: 'SUCCESS',
      metadata: { status: updateStatusDto.status },
    });
    return updated;
  }

  @Patch(':id/assign')
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  async assignTechnician(
    @Param('id') id: string,
    @Body() dto: AssignTechnicianDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const orgId = (req as any).org?.orgId as string | undefined;
    const orgRole = (req as any).org?.orgRole as OrgRole | undefined;
    const assigned = await this.maintenanceService.assignTechnicianScoped(
      id,
      dto,
      req.user.userId,
      req.user.role,
      orgId,
      orgRole,
    );
    await this.auditLogService.record({
      orgId,
      actorId: req.user.userId,
      module: 'MAINTENANCE',
      action: 'ASSIGNED',
      entityType: 'MaintenanceRequest',
      entityId: assigned.id,
      result: 'SUCCESS',
      metadata: { technicianId: dto.technicianId ?? null },
    });
    return assigned;
  }

  @Post(':id/notes')
  async addNote(
    @Param('id') id: string,
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
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      storage: memoryStorage(),
      limits: {
        fileSize: 10 * 1024 * 1024,
      },
      fileFilter: (_req, file, cb) => {
        if (MaintenanceController.allowedMimeTypes.has(file.mimetype)) {
          cb(null, true);
          return;
        }
        cb(new BadRequestException(`Unsupported file type: ${file.mimetype}`), false);
      },
    }),
  )
  async addPhoto(
    @Param('id') id: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Body() dto: AddMaintenancePhotoDto,
    @Request() req: AuthenticatedRequest,
  ) {
    if (!files?.length) {
      throw new BadRequestException('No files provided');
    }

    const orgId = (req as any).org?.orgId as string | undefined;
    const uploaded: Array<{ id: number; url: string; caption?: string | null; createdAt: Date; mimeType: string; size: number; originalName: string; }> = [];

    for (const file of files) {
      const fileExt = path.extname(file.originalname) || '';
      const fileName = `${randomBytes(16).toString('hex')}${fileExt.toLowerCase()}`;
      const filePath = path.join(this.uploadDir, fileName);
      await fs.writeFile(filePath, file.buffer);
      const photoUrl = `/uploads/maintenance/${fileName}`;

      const photo = await this.maintenanceService.addPhotoScoped(
        id,
        dto,
        req.user.userId,
        req.user.role,
        orgId,
        photoUrl,
      );

      uploaded.push({
        id: photo.id,
        url: photo.url,
        caption: photo.caption,
        createdAt: photo.createdAt,
        mimeType: file.mimetype,
        size: file.size,
        originalName: file.originalname,
      });
    }

    return {
      uploaded,
      count: uploaded.length,
    };
  }

  @Post(':id/confirm-complete')
  @Roles('TENANT')
  async confirmComplete(
    @Param('id') id: string,
    @Body() dto: ConfirmMaintenanceCompleteDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.maintenanceService.confirmCompleteScoped(id, req.user.userId, dto);
  }

  @Get('technicians')
  @Roles('PROPERTY_MANAGER')
  listTechnicians(@OrgId() orgId?: string) {
    return this.maintenanceService.listTechnicians(orgId);
  }

  @Post('technicians')
  @Roles('PROPERTY_MANAGER')
  createTechnician(
    @Body() body: { name: string; phone?: string; email?: string; userId?: string; role?: string },
    @OrgId() orgId?: string,
  ) {
    return this.maintenanceService.createTechnician(body, orgId);
  }

  @Get('assets')
  @Roles('PROPERTY_MANAGER')
  listAssets(
    @Query('propertyId') propertyId?: string,
    @Query('unitId') unitId?: string,
    @OrgId() orgId?: string,
  ) {
    const parsedUnitId = this.parseOptionalUuid(unitId, 'unitId');
    return this.maintenanceService.listAssets(propertyId, parsedUnitId, orgId);
  }

  @Post('assets')
  @Roles('PROPERTY_MANAGER')
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
  @Roles('PROPERTY_MANAGER')
  getSlaPolicies(@Query('propertyId') propertyId?: string, @OrgId() orgId?: string) {
    return this.maintenanceService.getSlaPolicies(propertyId, orgId);
  }

  private readonly uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads', 'maintenance');
  private static readonly allowedMimeTypes = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
  ]);

  private async ensureUploadDir() {
    try {
      await fs.access(this.uploadDir);
    } catch {
      await fs.mkdir(this.uploadDir, { recursive: true });
    }
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

    const unitId = this.parseOptionalUuid(query.unitId, 'unitId');
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

  private parseOptionalUuid(value: string | undefined, field: string): string | undefined {
    if (value === undefined || value === '') {
      return undefined;
    }
    const normalized = value.trim();
    if (!isUUID(normalized)) {
      throw ApiException.badRequest(
        ErrorCode.VALIDATION_INVALID_FORMAT,
        `Invalid ${field} value: ${value}`,
        { field, value },
      );
    }
    return normalized;
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
