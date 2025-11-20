import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
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
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: number, dto: CreateMaintenanceRequestDto): Promise<MaintenanceRequest> {
    const priority = dto.priority ?? MaintenancePriority.MEDIUM;
    const { resolutionDueAt, responseDueAt, policyId } = await this.computeSlaTargets(
      dto.propertyId ?? null,
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
        property: dto.propertyId ? { connect: { id: dto.propertyId } } : undefined,
        unit: dto.unitId ? { connect: { id: dto.unitId } } : undefined,
        asset: dto.assetId ? { connect: { id: dto.assetId } } : undefined,
      },
      include: this.defaultRequestInclude,
    });

    await this.recordHistory(request.id, {
      toStatus: request.status,
      note: 'Request created',
      changedById: userId,
    });

    return request;
  }

  async findAllForUser(userId: number): Promise<MaintenanceRequest[]> {
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
      where.propertyId = propertyId;
    }
    if (unitId !== undefined) {
      where.unitId = unitId;
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
    id: number,
    dto: UpdateMaintenanceStatusDto,
    actorId: number,
  ): Promise<MaintenanceRequest> {
    const existing = await this.prisma.maintenanceRequest.findUnique({
      where: { id },
      include: this.defaultRequestInclude,
    });
    if (!existing) {
      throw new NotFoundException('Maintenance request not found');
    }

    const updateData: any = { status: dto.status };
    if (!existing.acknowledgedAt && dto.status === Status.IN_PROGRESS) {
      updateData.acknowledgedAt = new Date();
    }
    if (dto.status === Status.COMPLETED) {
      updateData.completedAt = new Date();
    }

    const updated = await this.prisma.maintenanceRequest.update({
      where: { id },
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
    id: number,
    dto: AssignTechnicianDto,
    actorId: number,
  ): Promise<MaintenanceRequest> {
    const existing = await this.prisma.maintenanceRequest.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        assigneeId: true,
      },
    });
    if (!existing) {
      throw new NotFoundException('Maintenance request not found');
    }

    if (existing.assigneeId === dto.technicianId) {
      return this.prisma.maintenanceRequest.findUniqueOrThrow({
        where: { id },
        include: this.defaultRequestInclude,
      });
    }

    const updated = await this.prisma.maintenanceRequest.update({
      where: { id },
      data: {
        assignee: { connect: { id: dto.technicianId } },
      },
      include: this.defaultRequestInclude,
    });

    await this.recordHistory(id, {
      changedById: actorId,
      fromAssignee: existing.assigneeId ?? undefined,
      fromStatus: existing.status,
      toAssignee: updated.assigneeId ?? undefined,
      toStatus: updated.status,
      note: 'Technician assigned',
    });

    return updated;
  }

  async addNote(
    requestId: number,
    dto: AddMaintenanceNoteDto,
    authorId: number,
  ): Promise<MaintenanceNote> {
    const note = await this.prisma.maintenanceNote.create({
      data: {
        request: { connect: { id: requestId } },
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

  async createTechnician(data: { name: string; phone?: string; email?: string; userId?: number; role?: string }): Promise<Technician> {
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
    propertyId: number;
    unitId?: number;
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
        property: { connect: { id: data.propertyId } },
        unit: data.unitId ? { connect: { id: data.unitId } } : undefined,
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
    requestId: number,
    data: {
      changedById?: number;
      fromStatus?: Status;
      toStatus?: Status;
      fromAssignee?: number;
      toAssignee?: number;
      note?: string;
    },
  ): Promise<MaintenanceRequestHistory> {
    return this.prisma.maintenanceRequestHistory.create({
      data: {
        request: { connect: { id: requestId } },
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

    throw new BadRequestException(`Unsupported technician role: ${role}`);
  }

  private parseAssetCategory(category: string): MaintenanceAssetCategory {
    if (!category) {
      throw new BadRequestException('Asset category is required');
    }
    const normalized = category.trim().toUpperCase().replace(/[\s-]+/g, '_');
    if ((Object.values(MaintenanceAssetCategory) as string[]).includes(normalized)) {
      return normalized as MaintenanceAssetCategory;
    }
    throw new BadRequestException(`Unsupported asset category: ${category}`);
  }

  private parseOptionalDate(value: string | Date | undefined, field: string): Date | undefined {
    if (!value) {
      return undefined;
    }

    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`Invalid ${field} supplied`);
    }
    return date;
  }
}



