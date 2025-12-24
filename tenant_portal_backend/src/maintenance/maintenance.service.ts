import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  MaintenanceAsset,
  MaintenanceAssetCategory,
  MaintenanceNote,
  MaintenancePriority,
  MaintenanceRequest,
  MaintenanceRequestHistory,
  MaintenanceSlaPolicy,
  Prisma,
  Status,
  Technician,
  TechnicianRole,
} from '@prisma/client';
import { CreateMaintenanceRequestDto } from './dto/create-maintenance-request.dto';
import { UpdateMaintenanceStatusDto } from './dto/update-maintenance-status.dto';
import { AssignTechnicianDto } from './dto/assign-technician.dto';
import { AddMaintenanceNoteDto } from './dto/add-maintenance-note.dto';
import { AIMaintenanceService } from './ai-maintenance.service';
import { SystemUserService } from '../shared/system-user.service';
import { AIMaintenanceMetricsService } from './ai-maintenance-metrics.service';
import { ApiException } from '../common/errors';
import { ErrorCode } from '../common/errors/error-codes.enum';

interface MaintenanceListFilters {
  status?: Status;
  priority?: MaintenancePriority;
  propertyId?: number;
  unitId?: number;
  assigneeId?: number;
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

  async create(userId: string, dto: CreateMaintenanceRequestDto): Promise<MaintenanceRequest> {
    // Resolve Property and Unit from User's Lease if not provided
    let propertyId = dto.propertyId ? Number(dto.propertyId) : undefined;
    let unitId = dto.unitId ? Number(dto.unitId) : undefined;

    if (propertyId == null || unitId == null) {
      // Some test doubles only provide findFirst, so guard against missing functions
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
            // Lease doesn't have direct propertyId, get it from unit
            propertyId = userWithLease.lease.unit.propertyId;
          }
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

  async findById(id: string | number): Promise<MaintenanceRequest> {
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

  async findAllForUser(userId: string): Promise<MaintenanceRequest[]> {
    return this.prisma.maintenanceRequest.findMany({
      where: { authorId: userId },
      include: this.defaultRequestInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAll(filters: MaintenanceListFilters = {}): Promise<MaintenanceRequest[]> {
    const {
      status,
      priority,
      propertyId,
      unitId,
      assigneeId,
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
      where.propertyId = Number(propertyId);
    }
    if (unitId !== undefined) {
      where.unitId = Number(unitId);
    }
    if (assigneeId !== undefined) {
      where.assigneeId = assigneeId;
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

  async updateStatus(
    id: string | number,
    dto: UpdateMaintenanceStatusDto,
    actorId: string,
  ): Promise<MaintenanceRequest> {
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

  async assignTechnician(
    id: string | number,
    dto: AssignTechnicianDto,
    actorId: string,
  ): Promise<MaintenanceRequest> {
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

    // If technician not provided, use AI to assign
    let technicianId = dto.technicianId;
    let aiAssignmentUsed = false;
    let assignmentDetails: { score?: number; reasons?: string[] } = {};

    if (!technicianId) {
      try {
        const startTime = Date.now();
        const aiMatch = await this.aiMaintenanceService.assignTechnician(existing);
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
    const systemUserIdStr = typeof systemUserId === 'string' ? systemUserId : String(systemUserId);
    await this.recordHistory(requestId, {
      fromStatus: existing.status,
      toStatus: updated.status,
      note: escalationNote,
      changedById: systemUserIdStr,
    });

    // Add a note about the escalation using system user
    try {
      const systemUserId = await this.systemUserService.getSystemUserId();
      const systemUserIdStr = typeof systemUserId === 'string' ? systemUserId : String(systemUserId);
      await this.addNote(requestId, { body: escalationNote }, systemUserIdStr);
    } catch (error) {
      // If note creation fails, log but don't fail the escalation
      this.logger.warn(`Failed to add escalation note for request ${requestId}:`, error);
    }

    this.logger.log(
      `Escalated maintenance request ${requestId} from ${existing.priority} to ${newPriority}: ${options.reason}`,
    );

    return updated;
  }

  async addNote(
    requestId: string | number,
    dto: AddMaintenanceNoteDto,
    authorId: string,
  ): Promise<MaintenanceNote> {
    const numericRequestId = this.toRequestId(requestId);
    const note = await this.prisma.maintenanceNote.create({
      data: {
        request: { connect: { id: numericRequestId } },
        author: { connect: { id: authorId } },
        body: dto.body,
      },
      include: { author: true },
    });

    return note;
  }

  async listTechnicians(): Promise<Technician[]> {
    return this.prisma.technician.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
    });
  }

  async createTechnician(data: { name: string; phone?: string; email?: string; userId?: string; role?: string }): Promise<Technician> {
    const role = this.parseTechnicianRole(data.role);
    return this.prisma.technician.create({
      data: {
        name: data.name,
        phone: data.phone,
        email: data.email,
        user: data.userId ? { connect: { id: data.userId } } : undefined,
        role,
      },
    });
  }

  async listAssets(propertyId?: number, unitId?: number): Promise<MaintenanceAsset[]> {
    const where: Prisma.MaintenanceAssetWhereInput = {};
    if (propertyId !== undefined) {
      where.propertyId = propertyId;
    }
    if (unitId !== undefined) {
      where.unitId = unitId;
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
  }): Promise<MaintenanceAsset> {
    const category = this.parseAssetCategory(data.category);
    const installDate = this.parseOptionalDate(data.installDate, 'installDate');

    return this.prisma.maintenanceAsset.create({
      data: {
        property: { connect: { id: Number(data.propertyId) } },
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

  async getSlaPolicies(propertyId?: number): Promise<MaintenanceSlaPolicy[]> {
    const where: Prisma.MaintenanceSlaPolicyWhereInput = {
      active: true,
    };
    if (propertyId) {
      where.OR = [{ propertyId }, { propertyId: null }];
    } else {
      where.propertyId = null;
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
    propertyId: number | null,
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

  private toRequestId(id: string | number): number {
    const parsed = typeof id === 'number' ? id : Number(id);
    if (Number.isNaN(parsed)) {
      throw ApiException.badRequest(
        ErrorCode.VALIDATION_INVALID_INPUT,
        `Invalid maintenance request id: ${id}`,
        { requestId: id },
      );
    }
    return parsed;
  }
}
