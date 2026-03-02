import { Injectable, Logger } from '@nestjs/common';
import { isUUID } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import {
  MaintenanceAsset,
  MaintenanceAssetCategory,
  MaintenanceNote,
  MaintenancePhoto,
  MaintenancePriority,
  MaintenanceRequest,
  MaintenanceRequestHistory,
  MaintenanceSlaPolicy,
  OrgRole,
  Prisma,
  Role,
  Status,
  Technician,
  TechnicianRole,
} from '@prisma/client';
import { CreateMaintenanceRequestDto } from './dto/create-maintenance-request.dto';
import { UpdateMaintenanceStatusDto } from './dto/update-maintenance-status.dto';
import { AssignTechnicianDto } from './dto/assign-technician.dto';
import { AddMaintenanceNoteDto } from './dto/add-maintenance-note.dto';
import { AddMaintenancePhotoDto } from './dto/add-maintenance-photo.dto';
import { ConfirmMaintenanceCompleteDto } from './dto/confirm-maintenance-complete.dto';
import { AIMaintenanceService } from './ai-maintenance.service';
import { SystemUserService } from '../shared/system-user.service';
import { AIMaintenanceMetricsService } from './ai-maintenance-metrics.service';
import { ApiException } from '../common/errors';
import { ErrorCode } from '../common/errors/error-codes.enum';

interface MaintenanceListFilters {
  status?: Status;
  priority?: MaintenancePriority;
  propertyId?: string;
  unitId?: number;
  assigneeId?: number;
  unassigned?: boolean;
  overdue?: boolean;
  dueSoonHours?: number;
  page?: number;
  pageSize?: number;
}

@Injectable()
export class MaintenanceService {
  private readonly logger = new Logger(MaintenanceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiMaintenanceService: AIMaintenanceService,
    private readonly systemUserService: SystemUserService,
    private readonly aiMetrics?: AIMaintenanceMetricsService,
  ) { }

  /**
   * Create a maintenance request.
   *
   * Backward compatibility:
   * - Older call sites/tests call create(userId, dto). We still support that signature.
   *
   * New behavior:
   * - Tenant requests ALWAYS attach to { leaseId, unitId, propertyId } from current lease.
   * - PM/Admin may provide propertyId/unitId; if orgId is provided, enforce org scope.
   */
  async create(
    userId: string,
    roleOrDto: Role | CreateMaintenanceRequestDto,
    dtoMaybe?: CreateMaintenanceRequestDto,
    orgId?: string,
  ): Promise<MaintenanceRequest> {
    let role: Role;
    let dto: CreateMaintenanceRequestDto;

    // Legacy signature: create(userId, dto)
    if (typeof roleOrDto === 'object') {
      role = Role.TENANT;
      dto = roleOrDto;
    } else {
      role = roleOrDto;
      dto = dtoMaybe as CreateMaintenanceRequestDto;
    }

    // Tenant rule: ALWAYS derive leaseId + unitId + propertyId from the tenant's current lease.
    // PM/Admin rule: may supply propertyId/unitId; if orgId is present, enforce property org scope.
    // Legacy signature uses the old "derive from user->lease include" behavior.

    let leaseId: number | undefined;
    let propertyId: string | undefined;
    let unitId: string | undefined;

    if (typeof roleOrDto === 'object') {
      // Old behavior: resolve Property + Unit from User's Lease if not provided.
      propertyId = dto.propertyId ?? undefined;
      unitId = dto.unitId ?? undefined;

      if (propertyId == null || unitId == null) {
        const userLookup = this.prisma.user?.findUnique ?? this.prisma.user?.findFirst;
        if (userLookup) {
          type UserWithLease = Prisma.UserGetPayload<{
            include: {
              lease: {
                include: {
                  unit: true;
                };
              };
            };
          } | null>;

          const userWithLease = (await userLookup.call(this.prisma.user, {
            where: { id: userId },
            include: {
              lease: {
                include: { unit: true },
              },
            },
          })) as UserWithLease;

          if (userWithLease?.lease) {
            if (unitId == null) {
              unitId = userWithLease.lease.unitId;
            }
            if (propertyId == null) {
              propertyId = userWithLease.lease.unit.propertyId;
            }
          }
        }
      }
    } else if (role === Role.TENANT) {
      const lease = await this.prisma.lease.findUnique({
        where: { tenantId: userId },
        include: { unit: { select: { id: true, propertyId: true } } },
      });

      if (!lease) {
        throw ApiException.badRequest(
          ErrorCode.VALIDATION_MISSING_REQUIRED_FIELD,
          'Tenant does not have an active lease to attach this request to',
          { userId },
        );
      }

      leaseId = lease.id;
      unitId = lease.unitId;
      propertyId = lease.unit.propertyId;
    } else {
      propertyId = dto.propertyId ?? undefined;
      unitId = dto.unitId ?? undefined;

      if (propertyId && orgId) {
        const property = await this.prisma.property.findFirst({
          where: { id: propertyId, organizationId: orgId },
          select: { id: true },
        });

        if (!property) {
          throw ApiException.forbidden(
            ErrorCode.AUTH_FORBIDDEN,
            'Property does not belong to your organization',
            { propertyId, orgId, userId },
          );
        }
      }

      // Guardrail: if unitId + propertyId provided, validate the unit belongs to the property.
      if (propertyId && unitId) {
        const unit = await this.prisma.unit.findFirst({
          where: { id: unitId, propertyId },
          select: { id: true },
        });

        if (!unit) {
          throw ApiException.badRequest(
            ErrorCode.VALIDATION_INVALID_INPUT,
            'unitId does not belong to the given propertyId',
            { unitId, propertyId },
          );
        }
      }
    }

    // Use AI to assign priority if not provided
    let priority = dto.priority;
    let aiPriorityUsed = false;

    if (!priority) {
      try {
        const startTime = Date.now();
        priority = await this.aiMaintenanceService.assignPriorityWithAI(
          dto.title,
          dto.description,
        );
        const responseTime = Date.now() - startTime;

        this.logger.log(
          `AI assigned priority: ${priority} for request: "${dto.title}" (${responseTime}ms)`,
        );
        aiPriorityUsed = true;

        // Record metric
        this.aiMetrics?.recordMetric({
          operation: 'assignPriority',
          success: true,
          responseTime,
          fallbackUsed: false,
        });
      } catch (error) {
        const fallbackStartTime = Date.now();
        this.logger.warn(
          `AI priority assignment failed for request: "${dto.title}", using fallback`,
          error instanceof Error ? error.message : String(error),
        );
        // Fallback to keyword-based priority assignment
        priority = this.fallbackPriorityAssignment(dto.title, dto.description);
        const fallbackResponseTime = Date.now() - fallbackStartTime;

        // Record metric with fallback
        this.aiMetrics?.recordMetric({
          operation: 'assignPriority',
          success: true, // Fallback succeeded
          responseTime: fallbackResponseTime,
          fallbackUsed: true,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    priority = priority ?? MaintenancePriority.MEDIUM;
    const { resolutionDueAt, responseDueAt, policyId } = await this.computeSlaTargets(
      propertyId ?? null,
      priority,
    );

    const request = await this.prisma.maintenanceRequest.create({
      data: {
        title: dto.title,
        description: dto.description,
        priority,
        dueAt: resolutionDueAt,
        responseDueAt,
        slaPolicy: policyId ? { connect: { id: policyId } } : undefined,
        author: { connect: { id: userId } },
        lease: leaseId ? { connect: { id: leaseId } } : undefined,
        property: propertyId ? { connect: { id: propertyId } } : undefined,
        unit: unitId ? { connect: { id: unitId } } : undefined,
        asset: dto.assetId ? { connect: { id: dto.assetId } } : undefined,
      },
      include: this.defaultRequestInclude,
    });

    await this.recordHistory(request.id, {
      toStatus: request.status,
      note: aiPriorityUsed
        ? `Request created with AI-assigned priority: ${priority}`
        : 'Request created',
      changedById: userId,
    });

    return request;
  }

  async findById(id: string | number): Promise<Prisma.MaintenanceRequestGetPayload<{ include: Prisma.MaintenanceRequestInclude }>> {
    const requestId = this.toRequestId(id);
    const request = await this.prisma.maintenanceRequest.findUnique({
      where: { id: requestId },
      include: this.defaultRequestInclude,
    });

    if (!request) {
      throw ApiException.notFound(
        ErrorCode.MAINTENANCE_REQUEST_NOT_FOUND,
        `Maintenance request with ID ${id} not found`,
        { requestId: id },
      );
    }

    return request;
  }

  async getLeaseForTenant(userId: string): Promise<{ id: number } | null> {
    return this.prisma.lease.findUnique({
      where: { tenantId: userId },
      select: { id: true },
    });
  }

  async findAllForTenant(userId: string): Promise<MaintenanceRequest[]> {
    const lease = await this.getLeaseForTenant(userId);

    if (!lease) {
      return [];
    }

    return this.prisma.maintenanceRequest.findMany({
      where: { leaseId: lease.id },
      include: this.defaultRequestInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAllForTenantPaged(userId: string, filters: MaintenanceListFilters = {}) {
    const lease = await this.getLeaseForTenant(userId);
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 25;

    if (!lease) {
      return { items: [], page, pageSize, total: 0 };
    }

    const where: Prisma.MaintenanceRequestWhereInput = { leaseId: lease.id };

    const total = await this.prisma.maintenanceRequest.count({ where });

    const take = Math.min(Math.max(pageSize, 1), 100);
    const skip = Math.max(page - 1, 0) * take;

    const items = await this.prisma.maintenanceRequest.findMany({
      where,
      include: this.defaultRequestInclude,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    });

    return { items, page, pageSize, total };
  }

  // Backward-compatible alias (some controllers/services may still call this)
  async findAllForUser(userId: string): Promise<MaintenanceRequest[]> {
    return this.findAllForTenant(userId);
  }

  /**
   * Unscoped list (used by background jobs / legacy flows).
   * Prefer findAllForOrg for authenticated PM/Admin requests.
   */
  async findAll(filters: MaintenanceListFilters = {}): Promise<MaintenanceRequest[]> {
    const {
      status,
      priority,
      propertyId,
      unitId,
      assigneeId,
      unassigned,
      overdue,
      dueSoonHours,
      page = 1,
      pageSize = 25,
    } = filters;

    const where: Prisma.MaintenanceRequestWhereInput = {};
    if (status) {
      where.status = status;
    }
    if (priority) {
      where.priority = priority;
    }
    if (propertyId !== undefined) {
      where.propertyId = propertyId;
    }
    if (unitId !== undefined) {
      where.unitId = Number(unitId);
    }
    if (assigneeId !== undefined) {
      where.assigneeId = assigneeId;
    }
    if (unassigned === true) {
      where.assigneeId = null;
    }

    if (overdue === true) {
      where.dueAt = { lt: new Date() };
      where.status = { not: Status.COMPLETED };
    }

    if (dueSoonHours !== undefined) {
      const now = new Date();
      const upper = new Date(now.getTime() + Math.max(dueSoonHours, 1) * 60 * 60 * 1000);
      where.dueAt = { gte: now, lte: upper };
      where.status = { not: Status.COMPLETED };
    }

    const take = Math.min(Math.max(pageSize, 1), 100);
    const skip = Math.max(page - 1, 0) * take;

    return this.prisma.maintenanceRequest.findMany({
      where,
      include: this.defaultRequestInclude,
      orderBy: [
        { status: 'asc' },
        { priority: 'desc' },
        { dueAt: 'asc' },
      ],
      skip,
      take,
    });
  }

  async findAllForOrg(orgId: string | undefined, filters: MaintenanceListFilters = {}): Promise<MaintenanceRequest[]> {
    // NOTE: legacy array-returning method. Prefer findAllForOrgPaged.
    const { items } = await this.findAllForOrgPaged(orgId, filters);
    return items;
  }

  async findAllForOrgPaged(orgId: string | undefined, filters: MaintenanceListFilters = {}) {
    const {
      status,
      priority,
      propertyId,
      unitId,
      assigneeId,
      unassigned,
      overdue,
      dueSoonHours,
      page = 1,
      pageSize = 25,
    } = filters;

    if (!orgId) {
      throw ApiException.forbidden(
        ErrorCode.AUTH_FORBIDDEN,
        'Organization context is required',
      );
    }

    const where: Prisma.MaintenanceRequestWhereInput = {
      property: { organizationId: orgId },
    };
    if (status) {
      where.status = status;
    }
    if (priority) {
      where.priority = priority;
    }
    if (propertyId !== undefined) {
      where.propertyId = propertyId;
    }
    if (unitId !== undefined) {
      where.unitId = Number(unitId);
    }
    if (assigneeId !== undefined) {
      where.assigneeId = assigneeId;
    }
    if (unassigned === true) {
      where.assigneeId = null;
    }

    if (overdue === true) {
      where.dueAt = { lt: new Date() };
      where.status = { not: Status.COMPLETED };
    }

    if (dueSoonHours !== undefined) {
      const now = new Date();
      const upper = new Date(now.getTime() + Math.max(dueSoonHours, 1) * 60 * 60 * 1000);
      where.dueAt = { gte: now, lte: upper };
      where.status = { not: Status.COMPLETED };
    }

    const total = await this.prisma.maintenanceRequest.count({ where });

    const take = Math.min(Math.max(pageSize, 1), 100);
    const skip = Math.max(page - 1, 0) * take;

    const items = await this.prisma.maintenanceRequest.findMany({
      where,
      include: this.defaultRequestInclude,
      orderBy: [
        { status: 'asc' },
        { priority: 'desc' },
        { dueAt: 'asc' },
      ],
      skip,
      take,
    });

    return { items, page, pageSize, total };
  }

  private readonly allowedStatusTransitions: Record<Status, Status[]> = {
    [Status.PENDING]: [Status.IN_PROGRESS],
    [Status.IN_PROGRESS]: [Status.COMPLETED],
    [Status.COMPLETED]: [],
  };

  async updateStatus(
    id: string | number,
    dto: UpdateMaintenanceStatusDto,
    actorId: string,
  ): Promise<MaintenanceRequest> {
    // NOTE: This method is intentionally unscoped for legacy/background usage.
    // Prefer updateStatusScoped from controllers.

    const requestNumericId = this.toRequestId(id);
    const existing = await this.prisma.maintenanceRequest.findUnique({
      where: { id: requestNumericId },
      include: this.defaultRequestInclude,
    });
    if (!existing) {
      throw ApiException.notFound(
        ErrorCode.MAINTENANCE_REQUEST_NOT_FOUND,
        'Maintenance request not found',
        { requestId: id },
      );
    }

    const allowedNext = this.allowedStatusTransitions[existing.status as Status] ?? [];
    if (!allowedNext.includes(dto.status)) {
      throw ApiException.badRequest(
        ErrorCode.BUSINESS_PRECONDITION_FAILED,
        `Invalid status transition: ${existing.status} -> ${dto.status}`,
        { requestId: requestNumericId, from: existing.status, to: dto.status },
      );
    }

    if (dto.status === Status.COMPLETED) {
      if (!existing.assigneeId) {
        throw ApiException.badRequest(
          ErrorCode.BUSINESS_PRECONDITION_FAILED,
          'Cannot close request without an assigned technician',
          { requestId: requestNumericId },
        );
      }
      if (!dto.note?.trim()) {
        throw ApiException.badRequest(
          ErrorCode.BUSINESS_PRECONDITION_FAILED,
          'Closure note is required when marking request completed',
          { requestId: requestNumericId },
        );
      }
    }

    const updateData: any = { status: dto.status };
    if (!existing.acknowledgedAt && dto.status === Status.IN_PROGRESS) {
      updateData.acknowledgedAt = new Date();
    }
    if (dto.status === Status.COMPLETED) {
      updateData.completedAt = new Date();
    }

    const updated = await this.prisma.maintenanceRequest.update({
      where: { id: requestNumericId },
      data: updateData,
      include: this.defaultRequestInclude,
    });

    await this.recordHistory(id, {
      fromStatus: existing.status,
      toStatus: dto.status,
      changedById: actorId,
      note: dto.note,
      toAssignee: updated.assigneeId ?? undefined,
      fromAssignee: existing.assigneeId ?? undefined,
    });

    if (dto.note) {
      await this.addNote(id, { body: dto.note }, actorId);
    }

    return updated;
  }

  async updateStatusScoped(
    id: string | number,
    dto: UpdateMaintenanceStatusDto,
    actorId: string,
    actorRole: Role,
    orgId?: string,
    orgRole?: OrgRole,
  ): Promise<MaintenanceRequest> {
    if (actorRole === Role.TENANT) {
      throw ApiException.forbidden(
        ErrorCode.AUTH_FORBIDDEN,
        'Tenants cannot change maintenance request status',
        { userId: actorId, requestId: id },
      );
    }

    if (orgRole === OrgRole.OWNER) {
      throw ApiException.forbidden(
        ErrorCode.AUTH_FORBIDDEN,
        'Owners are read-only for maintenance status changes',
        { userId: actorId, requestId: id, orgId },
      );
    }

    if (!orgId) {
      throw ApiException.forbidden(
        ErrorCode.AUTH_FORBIDDEN,
        'Organization context is required',
      );
    }

    await this.assertRequestInOrg(id, orgId);
    return this.updateStatus(id, dto, actorId);
  }

  async assignTechnician(
    id: string | number,
    dto: AssignTechnicianDto,
    actorId: string,
  ): Promise<MaintenanceRequest> {
    // NOTE: This method is intentionally unscoped for legacy/background usage.
    // Prefer assignTechnicianScoped from controllers.

    const requestNumericId = this.toRequestId(id);
    const existing = await this.prisma.maintenanceRequest.findUnique({
      where: { id: requestNumericId },
      include: {
        property: {
          select: {
            latitude: true,
            longitude: true,
          },
        },
        asset: {
          select: {
            category: true,
          },
        },
      },
    });

    if (!existing) {
      throw ApiException.notFound(
        ErrorCode.MAINTENANCE_REQUEST_NOT_FOUND,
        'Maintenance request not found',
        { requestId: id },
      );
    }

    if (existing.status === Status.COMPLETED) {
      throw ApiException.badRequest(
        ErrorCode.BUSINESS_PRECONDITION_FAILED,
        'Cannot assign technician to completed request',
        { requestId: id },
      );
    }

    // If technician not provided, use AI to assign
    let technicianId = dto.technicianId;
    let aiAssignmentUsed = false;
    let assignmentDetails: { score?: number; reasons?: string[] } = {};

    if (!technicianId) {
      try {
        const startTime = Date.now();
        const aiMatch = await this.aiMaintenanceService.assignTechnician(existing, orgId);
        const responseTime = Date.now() - startTime;

        if (aiMatch) {
          technicianId = aiMatch.technician.id;
          assignmentDetails = {
            score: aiMatch.score,
            reasons: aiMatch.reasons,
          };
          aiAssignmentUsed = true;

          this.logger.log(
            `AI assigned technician: ${aiMatch.technician.name} (ID: ${technicianId}) ` +
            `for request: ${id} with score: ${aiMatch.score.toFixed(1)} (${responseTime}ms)`,
          );

          // Record metric
          this.aiMetrics?.recordMetric({
            operation: 'assignTechnician',
            success: true,
            responseTime,
            requestId: requestNumericId,
            fallbackUsed: false,
          });
        } else {
          throw ApiException.badRequest(
            ErrorCode.BUSINESS_PRECONDITION_FAILED,
            'No suitable technician found. Please assign manually or ensure technicians are available.',
            { requestId: id },
          );
        }
      } catch (error) {
        this.logger.warn(
          `AI technician assignment failed for request: ${id}`,
          error instanceof Error ? error.message : String(error),
        );

        if (error instanceof ApiException) {
          throw error;
        }

        // If AI fails and no technician provided, throw error
        throw ApiException.badRequest(
          ErrorCode.BUSINESS_PRECONDITION_FAILED,
          'Technician assignment required. AI assignment failed. Please provide a technician ID.',
          { requestId: id },
        );
      }
    }

    if (existing.assigneeId === technicianId) {
      return this.prisma.maintenanceRequest.findUniqueOrThrow({
        where: { id: requestNumericId },
        include: this.defaultRequestInclude,
      });
    }

    const updated = await this.prisma.maintenanceRequest.update({
      where: { id: requestNumericId },
      data: {
        assignee: { connect: { id: technicianId } },
        ...(existing.status === Status.PENDING
          ? {
              status: Status.IN_PROGRESS,
              acknowledgedAt: existing.acknowledgedAt ?? new Date(),
            }
          : {}),
      },
      include: this.defaultRequestInclude,
    });

    const note = aiAssignmentUsed
      ? `Technician assigned via AI (score: ${assignmentDetails.score?.toFixed(1)}). ` +
      `Reasons: ${assignmentDetails.reasons?.join('; ')}`
      : 'Technician assigned';

    await this.recordHistory(id, {
      changedById: actorId,
      fromAssignee: existing.assigneeId ?? undefined,
      fromStatus: existing.status,
      toAssignee: updated.assigneeId ?? undefined,
      toStatus: updated.status,
      note,
    });

    return updated;
  }

  async assignTechnicianScoped(
    id: string | number,
    dto: AssignTechnicianDto,
    actorId: string,
    actorRole: Role,
    orgId?: string,
    orgRole?: OrgRole,
  ): Promise<MaintenanceRequest> {
    if (actorRole === Role.TENANT) {
      throw ApiException.forbidden(
        ErrorCode.AUTH_FORBIDDEN,
        'Tenants cannot assign technicians',
        { userId: actorId, requestId: id },
      );
    }

    if (orgRole === OrgRole.OWNER) {
      throw ApiException.forbidden(
        ErrorCode.AUTH_FORBIDDEN,
        'Owners are read-only for technician assignment',
        { userId: actorId, requestId: id, orgId },
      );
    }

    if (!orgId) {
      throw ApiException.forbidden(
        ErrorCode.AUTH_FORBIDDEN,
        'Organization context is required',
      );
    }

    await this.assertRequestInOrg(id, orgId);
    return this.assignTechnician(id, dto, actorId);
  }

  /**
   * Escalate a maintenance request (increase priority and add escalation note)
   */
  async escalate(
    requestId: string | number,
    options: {
      reason: string;
      factors?: string[] | Record<string, any>;
    },
  ): Promise<MaintenanceRequest> {
    const numericRequestId = this.toRequestId(requestId);
    const existing = await this.prisma.maintenanceRequest.findUnique({
      where: { id: numericRequestId },
      include: this.defaultRequestInclude,
    });

    if (!existing) {
      throw ApiException.notFound(
        ErrorCode.MAINTENANCE_REQUEST_NOT_FOUND,
        'Maintenance request not found',
        { requestId },
      );
    }

    // Determine new priority based on current priority
    let newPriority: MaintenancePriority;
    switch (existing.priority) {
      case MaintenancePriority.LOW:
        newPriority = MaintenancePriority.MEDIUM;
        break;
      case MaintenancePriority.MEDIUM:
        newPriority = MaintenancePriority.HIGH;
        break;
      case MaintenancePriority.HIGH:
        // Already at highest priority, keep it
        newPriority = MaintenancePriority.HIGH;
        break;
      default:
        newPriority = MaintenancePriority.MEDIUM;
    }

    // Recalculate SLA targets based on new priority
    const { resolutionDueAt, responseDueAt, policyId } = await this.computeSlaTargets(
      existing.propertyId ?? null,
      newPriority,
    );

    // Build escalation note
    const factorsText = options.factors
      ? Array.isArray(options.factors)
        ? options.factors.join(', ')
        : JSON.stringify(options.factors)
      : '';
    const escalationNote = `ESCALATED: ${options.reason}${factorsText ? `\nFactors: ${factorsText}` : ''}`;

    // Update the request
    const updated = await this.prisma.maintenanceRequest.update({
      where: { id: numericRequestId },
      data: {
        priority: newPriority,
        dueAt: resolutionDueAt,
        responseDueAt,
        slaPolicy: policyId ? { connect: { id: policyId } } : undefined,
      },
      include: this.defaultRequestInclude,
    });

    // Record history using system user
    const systemUserId = await this.systemUserService.getSystemUserId();
    await this.recordHistory(requestId, {
      fromStatus: existing.status,
      toStatus: updated.status,
      note: escalationNote,
      changedById: typeof systemUserId === 'string' ? systemUserId : String(systemUserId),
    });

    // Add a note about the escalation using system user
    try {
      const systemUserId = await this.systemUserService.getSystemUserId();
      await this.addNote(requestId, { body: escalationNote }, systemUserId as any);
    } catch (error) {
      // If note creation fails, log but don't fail the escalation
      this.logger.warn(`Failed to add escalation note for request ${requestId}:`, error);
    }

    this.logger.log(
      `Escalated maintenance request ${requestId} from ${existing.priority} to ${newPriority}: ${options.reason}`,
    );

    return updated;
  }

  private async assertRequestInOrg(requestId: string | number, orgId: string) {
    const numericRequestId = this.toRequestId(requestId);
    const req = await this.prisma.maintenanceRequest.findUnique({
      where: { id: numericRequestId },
      select: { id: true, property: { select: { organizationId: true } } },
    });

    if (!req || req.property?.organizationId !== orgId) {
      throw ApiException.forbidden(
        ErrorCode.AUTH_FORBIDDEN,
        'You do not have access to this maintenance request',
        { requestId: numericRequestId, orgId },
      );
    }
  }

  private async assertRequestInTenantLease(requestId: string | number, tenantId: string) {
    const lease = await this.getLeaseForTenant(tenantId);
    if (!lease) {
      throw ApiException.forbidden(
        ErrorCode.AUTH_FORBIDDEN,
        'You do not have access to this maintenance request',
        { userId: tenantId, requestId },
      );
    }

    const numericRequestId = this.toRequestId(requestId);
    const req = await this.prisma.maintenanceRequest.findUnique({
      where: { id: numericRequestId },
      select: { id: true, leaseId: true },
    });

    if (!req || req.leaseId !== lease.id) {
      throw ApiException.forbidden(
        ErrorCode.AUTH_FORBIDDEN,
        'You do not have access to this maintenance request',
        { userId: tenantId, requestId: numericRequestId },
      );
    }
  }

  async addNote(
    requestId: string | number,
    dto: AddMaintenanceNoteDto,
    authorId: string | number,
  ): Promise<MaintenanceNote> {
    const numericRequestId = this.toRequestId(requestId);
    const note = await this.prisma.maintenanceNote.create({
      data: {
        request: { connect: { id: numericRequestId } },
        author: { connect: { id: authorId as any } },
        body: dto.body,
      },
      include: { author: true },
    });

    return note;
  }

  async addNoteScoped(
    requestId: string | number,
    dto: AddMaintenanceNoteDto,
    authorId: string,
    authorRole: Role,
    orgId?: string,
  ): Promise<MaintenanceNote> {
    if (authorRole === Role.TENANT) {
      await this.assertRequestInTenantLease(requestId, authorId);
      return this.addNote(requestId, dto, authorId);
    }

    if (!orgId) {
      throw ApiException.forbidden(
        ErrorCode.AUTH_FORBIDDEN,
        'Organization context is required',
      );
    }

    await this.assertRequestInOrg(requestId, orgId);
    return this.addNote(requestId, dto, authorId);
  }

  async addPhoto(
    requestId: string | number,
    dto: AddMaintenancePhotoDto,
    uploadedById: string | number,
  ): Promise<MaintenancePhoto> {
    const numericRequestId = this.toRequestId(requestId);
    const photo = await this.prisma.maintenancePhoto.create({
      data: {
        request: { connect: { id: numericRequestId } },
        uploadedBy: { connect: { id: uploadedById as any } },
        url: dto.url,
        caption: dto.caption,
      },
      include: { uploadedBy: true },
    });

    return photo;
  }

  async addPhotoScoped(
    requestId: string | number,
    dto: AddMaintenancePhotoDto,
    uploadedById: string,
    uploadedByRole: Role,
    orgId?: string,
  ): Promise<MaintenancePhoto> {
    if (uploadedByRole === Role.TENANT) {
      await this.assertRequestInTenantLease(requestId, uploadedById);
      return this.addPhoto(requestId, dto, uploadedById);
    }

    if (!orgId) {
      throw ApiException.forbidden(
        ErrorCode.AUTH_FORBIDDEN,
        'Organization context is required',
      );
    }

    await this.assertRequestInOrg(requestId, orgId);
    return this.addPhoto(requestId, dto, uploadedById);
  }

  async confirmCompleteScoped(
    requestId: string | number,
    tenantId: string,
    dto: ConfirmMaintenanceCompleteDto,
  ): Promise<MaintenanceRequest> {
    await this.assertRequestInTenantLease(requestId, tenantId);

    const numericRequestId = this.toRequestId(requestId);
    const req = await this.prisma.maintenanceRequest.findUnique({
      where: { id: numericRequestId },
      include: this.defaultRequestInclude,
    });

    if (!req) {
      throw ApiException.notFound(
        ErrorCode.MAINTENANCE_REQUEST_NOT_FOUND,
        'Maintenance request not found',
        { requestId },
      );
    }

    if (req.status !== Status.COMPLETED) {
      throw ApiException.badRequest(
        ErrorCode.VALIDATION_INVALID_INPUT,
        'This request must be marked completed by the property manager before you can confirm it',
        { requestId: numericRequestId, status: req.status },
      );
    }

    const note = dto.note?.trim() ? `Tenant confirmed completion: ${dto.note.trim()}` : 'Tenant confirmed completion';

    await this.recordHistory(numericRequestId, {
      changedById: tenantId,
      note,
      fromStatus: req.status,
      toStatus: req.status,
      fromAssignee: req.assigneeId ?? undefined,
      toAssignee: req.assigneeId ?? undefined,
    });

    await this.addNote(numericRequestId, { body: note }, tenantId);

    // Return fresh copy
    return this.findById(numericRequestId);
  }

  async listTechnicians(orgId?: string): Promise<Technician[]> {
    return this.prisma.technician.findMany({
      where: {
        active: true,
        ...(orgId ? { organizationId: orgId } : {}),
      },
      orderBy: { name: 'asc' },
    });
  }

  async createTechnician(data: { name: string; phone?: string; email?: string; userId?: string; role?: string }, orgId?: string): Promise<Technician> {
    const role = this.parseTechnicianRole(data.role);
    if (!orgId) {
      throw new BadRequestException('Organization context is required');
    }
    return this.prisma.technician.create({
      data: {
        name: data.name,
        phone: data.phone,
        email: data.email,
        user: data.userId ? { connect: { id: data.userId } } : undefined,
        role,
        organization: { connect: { id: orgId } },
      },
    });
  }

  async listAssets(propertyId?: string, unitId?: number, orgId?: string): Promise<MaintenanceAsset[]> {
    const where: Prisma.MaintenanceAssetWhereInput = {};
    if (propertyId !== undefined) {
      where.propertyId = propertyId;
    }
    if (unitId !== undefined) {
      where.unitId = unitId;
    }
    if (orgId) {
      where.property = { organizationId: orgId };
    }

    return this.prisma.maintenanceAsset.findMany({
      where,
      orderBy: { name: 'asc' },
    });
  }

  async createAsset(data: {
    propertyId: string;
    unitId?: string;
    name: string;
    category: string;
    manufacturer?: string;
    model?: string;
    serialNumber?: string;
    installDate?: Date | string;
  }, orgId?: string): Promise<MaintenanceAsset> {
    const category = this.parseAssetCategory(data.category);
    const installDate = this.parseOptionalDate(data.installDate, 'installDate');

    if (orgId) {
      const property = await this.prisma.property.findFirst({
        where: { id: data.propertyId, organizationId: orgId },
        select: { id: true },
      });
      if (!property) {
        throw new BadRequestException('Property not found');
      }
    }

    return this.prisma.maintenanceAsset.create({
      data: {
        property: { connect: { id: data.propertyId } },
        unit: data.unitId ? { connect: { id: Number(data.unitId) } } : undefined,
        name: data.name,
        category,
        manufacturer: data.manufacturer,
        model: data.model,
        serialNumber: data.serialNumber,
        installDate,
      },
    });
  }

  async getSlaPolicies(propertyId?: string, orgId?: string): Promise<MaintenanceSlaPolicy[]> {
    const where: Prisma.MaintenanceSlaPolicyWhereInput = {
      active: true,
    };
    if (propertyId) {
      where.OR = [{ propertyId }, { propertyId: null }];
    } else {
      where.propertyId = null;
    }

    if (orgId && propertyId) {
      const property = await this.prisma.property.findFirst({
        where: { id: propertyId, organizationId: orgId },
        select: { id: true },
      });
      if (!property) {
        throw new BadRequestException('Property not found');
      }
    }

    if (!this.prisma.maintenanceSlaPolicy?.findMany) {
      return [];
    }

    return this.prisma.maintenanceSlaPolicy.findMany({
      where,
      orderBy: [{ propertyId: 'desc' }, { priority: 'asc' }],
    });
  }

  private async computeSlaTargets(
    propertyId: string | null,
    priority: MaintenancePriority,
  ): Promise<{ resolutionDueAt: Date | null; responseDueAt: Date | null; policyId: number | null }> {
    const policies = await this.getSlaPolicies(propertyId ?? undefined);
    const policy = policies.find((p) => p.priority === priority);
    if (!policy) {
      return { resolutionDueAt: null, responseDueAt: null, policyId: null };
    }
    const now = new Date();
    const resolutionDueAt = new Date(now.getTime() + policy.resolutionTimeMinutes * 60 * 1000);
    const responseDueAt = policy.responseTimeMinutes
      ? new Date(now.getTime() + policy.responseTimeMinutes * 60 * 1000)
      : null;
    return { resolutionDueAt, responseDueAt, policyId: policy.id };
  }

  private get defaultRequestInclude(): Prisma.MaintenanceRequestInclude {
    const include: Prisma.MaintenanceRequestInclude = {
      author: true,
      property: true,
      unit: true,
      asset: true,
      assignee: true,
      slaPolicy: true,
      notes: {
        include: { author: true },
        orderBy: { createdAt: 'desc' },
      },
      photos: {
        include: { uploadedBy: true },
        orderBy: { createdAt: 'desc' },
      },
      history: {
        include: {
          changedBy: true,
          fromAssignee: true,
          toAssignee: true,
        },
        orderBy: { createdAt: 'desc' },
      },
    };
    return include;
  }

  private async recordHistory(
    requestId: string | number,
    data: {
      changedById?: string;
      fromStatus?: Status;
      toStatus?: Status;
      fromAssignee?: number;
      toAssignee?: number;
      note?: string;
    },
  ): Promise<MaintenanceRequestHistory> {
    const numericRequestId = this.toRequestId(requestId);
    return this.prisma.maintenanceRequestHistory.create({
      data: {
        request: { connect: { id: numericRequestId } },
        changedBy: data.changedById ? { connect: { id: data.changedById } } : undefined,
        fromStatus: data.fromStatus,
        toStatus: data.toStatus,
        fromAssignee: data.fromAssignee ? { connect: { id: data.fromAssignee } } : undefined,
        toAssignee: data.toAssignee ? { connect: { id: data.toAssignee } } : undefined,
        note: data.note,
      },
    });
  }

  private parseTechnicianRole(role?: string): TechnicianRole {
    if (!role) {
      return TechnicianRole.IN_HOUSE;
    }

    const normalized = role.trim().toUpperCase().replace(/[\s-]+/g, '_');
    if ((Object.values(TechnicianRole) as string[]).includes(normalized)) {
      return normalized as TechnicianRole;
    }

    throw ApiException.badRequest(
      ErrorCode.VALIDATION_INVALID_INPUT,
      `Unsupported technician role: ${role}`,
      { role },
    );
  }

  private parseAssetCategory(category: string): MaintenanceAssetCategory {
    if (!category) {
      throw ApiException.badRequest(
        ErrorCode.VALIDATION_MISSING_REQUIRED_FIELD,
        'Asset category is required',
        { field: 'category' },
      );
    }
    const normalized = category.trim().toUpperCase().replace(/[\s-]+/g, '_');
    if ((Object.values(MaintenanceAssetCategory) as string[]).includes(normalized)) {
      return normalized as MaintenanceAssetCategory;
    }
    throw ApiException.badRequest(
      ErrorCode.VALIDATION_INVALID_INPUT,
      `Unsupported asset category: ${category}`,
      { category },
    );
  }

  private parseOptionalDate(value: string | Date | undefined, field: string): Date | undefined {
    if (!value) {
      return undefined;
    }

    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw ApiException.badRequest(
        ErrorCode.VALIDATION_INVALID_FORMAT,
        `Invalid ${field} supplied`,
        { field, value },
      );
    }
    return date;
  }

  /**
   * Fallback priority assignment using keyword matching when AI is unavailable
   */
  private fallbackPriorityAssignment(title: string, description: string): MaintenancePriority {
    const text = `${title} ${description}`.toLowerCase();

    // High priority keywords
    const highPriorityKeywords = [
      'leak', 'flood', 'flooding', 'water', 'fire', 'smoke', 'gas', 'electrical',
      'hazard', 'emergency', 'urgent', 'broken lock', 'security', 'break-in',
      'no heat', 'no hot water', 'sewage', 'backup', 'overflow', 'spark',
      'smell gas', 'carbon monoxide', 'co2', 'toxic', 'dangerous',
    ];

    // Low priority keywords
    const lowPriorityKeywords = [
      'paint', 'cosmetic', 'touch-up', 'touchup', 'routine', 'maintenance',
      'cleaning', 'aesthetic', 'decorative', 'minor', 'small', 'cosmetic issue',
      'nail hole', 'scratch', 'stain', 'dirty', 'dust',
    ];

    // Check for high priority keywords
    if (highPriorityKeywords.some((keyword) => text.includes(keyword))) {
      return MaintenancePriority.HIGH;
    }

    // Check for low priority keywords
    if (lowPriorityKeywords.some((keyword) => text.includes(keyword))) {
      return MaintenancePriority.LOW;
    }

    // Default to medium
    return MaintenancePriority.MEDIUM;
  }

  private toRequestId(id: string | number): string {
    const parsed = String(id);
    if (!isUUID(parsed)) {
      throw ApiException.badRequest(
        ErrorCode.VALIDATION_INVALID_INPUT,
        `Invalid maintenance request id: ${id}`,
        { requestId: id },
      );
    }
    return parsed;
  }
}
