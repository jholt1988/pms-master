import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InspectionType, InspectionStatus, Role, Prisma } from '@prisma/client';

interface CreateInspectionDto {
  unitId: string;
  propertyId: string;
  type: InspectionType;
  scheduledDate: Date;
  notes?: string;
}

interface UpdateInspectionDto {
  scheduledDate?: Date;
  notes?: string;
  status?: InspectionStatus;
}

interface CompleteInspectionDto {
  findings: any;
  notes?: string;
}

@Injectable()
export class InspectionsService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertInspectionInOrg(id: number, orgId?: string) {
    if (!orgId) return;
    const inspection = await this.prisma.unitInspection.findFirst({
      where: { id, property: { organizationId: orgId } },
      select: { id: true },
    });
    if (!inspection) {
      throw new NotFoundException('Inspection not found');
    }
  }

  async create(data: CreateInspectionDto, userId: string, orgId?: string) {
    // Verify user is a property manager
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user?.role !== Role.PROPERTY_MANAGER) {
      throw new ForbiddenException('Only property managers can schedule inspections');
    }

    if (orgId) {
      const property = await this.prisma.property.findFirst({
        where: { id: data.propertyId, organizationId: orgId },
        select: { id: true },
      });
      if (!property) {
        throw new NotFoundException('Property not found');
      }

      const unit = await this.prisma.unit.findFirst({
        where: { id: data.unitId, property: { organizationId: orgId } },
        select: { id: true },
      });
      if (!unit) {
        throw new NotFoundException('Unit not found');
      }
    }

    return this.prisma.unitInspection.create({
      data: {
        unitId: data.unitId,
        propertyId: data.propertyId,
        type: data.type,
        scheduledDate: data.scheduledDate,
        notes: data.notes,
        createdById: userId,
        inspectorId: userId, // Default to creator, can be changed
      },
      include: {
        unit: {
          include: {
            property: true,
          },
        },
        inspector: {
          select: {
            id: true,
            username: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });
  }

  async findAll(filters: {
    userId?: string;
    userRole?: Role;
    unitId?: string;
    propertyId?: string;
    status?: InspectionStatus;
    type?: InspectionType;
    startDate?: Date;
    endDate?: Date;
    skip?: number;
    take?: number;
    orgId?: string;
  }) {
    let where: Prisma.UnitInspectionWhereInput = {};

    if (filters.orgId) {
      where.property = { organizationId: filters.orgId };
    }

    // Tenants can only see inspections for their unit
    if (filters.userRole === Role.TENANT && filters.userId) {
      const lease = await this.prisma.lease.findUnique({
        where: { tenantId: filters.userId },
        select: { unitId: true },
      });
      if (lease) {
        where.unitId = lease.unitId;
      } else {
        // Tenant has no lease, return empty
        return { data: [], total: 0 };
      }
    } else if (filters.userRole === Role.PROPERTY_MANAGER) {
      // Property managers can see all inspections with filters
      if (filters.unitId) {
        where.unitId = filters.unitId;
      }
      if (filters.propertyId) {
        where.propertyId = filters.propertyId;
      }
    }

    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.type) {
      where.type = filters.type;
    }
    if (filters.startDate || filters.endDate) {
      where.scheduledDate = {};
      if (filters.startDate) {
        where.scheduledDate.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.scheduledDate.lte = filters.endDate;
      }
    }

    const [inspections, total] = await Promise.all([
      this.prisma.unitInspection.findMany({
        where,
        include: {
          unit: {
            include: {
              property: true,
            },
          },
          inspector: {
            select: {
              id: true,
              username: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              username: true,
            },
          },
          photos: true,
        },
        orderBy: { scheduledDate: 'desc' },
        skip: filters.skip || 0,
        take: filters.take || 50,
      }),
      this.prisma.unitInspection.count({ where }),
    ]);

    return { data: inspections, total };
  }

  async findOne(id: number, userId: string, userRole: Role, orgId?: string) {
    const inspection = await this.prisma.unitInspection.findFirst({
      where: { id, ...(orgId ? { property: { organizationId: orgId } } : {}) },
      include: {
        unit: {
          include: {
            property: true,
          },
        },
        inspector: {
          select: {
            id: true,
            username: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            username: true,
          },
        },
        photos: {
          include: {
            uploadedBy: {
              select: {
                id: true,
                username: true,
              },
            },
          },
        },
      },
    });

    if (!inspection) {
      throw new NotFoundException('Inspection not found');
    }

    // Tenant can only view their unit's inspections
    if (userRole === Role.TENANT) {
      const lease = await this.prisma.lease.findUnique({
        where: { tenantId: userId },
        select: { unitId: true },
      });
      if (!lease || lease.unitId !== inspection.unitId) {
        throw new ForbiddenException('Access denied');
      }
    }

    return inspection;
  }

  async update(id: number, data: UpdateInspectionDto, userId: string, orgId?: string) {
    // Only property managers can update
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user?.role !== Role.PROPERTY_MANAGER) {
      throw new ForbiddenException('Only property managers can update inspections');
    }

    const inspection = await this.prisma.unitInspection.findFirst({
      where: { id, ...(orgId ? { property: { organizationId: orgId } } : {}) },
    });

    if (!inspection) {
      throw new NotFoundException('Inspection not found');
    }

    return this.prisma.unitInspection.update({
      where: { id },
      data: {
        scheduledDate: data.scheduledDate,
        notes: data.notes,
        status: data.status,
      },
      include: {
        unit: {
          include: {
            property: true,
          },
        },
        inspector: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });
  }

  async complete(id: number, data: CompleteInspectionDto, userId: string, orgId?: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user?.role !== Role.PROPERTY_MANAGER) {
      throw new ForbiddenException('Only property managers can complete inspections');
    }

    const inspection = await this.prisma.unitInspection.findFirst({
      where: { id, ...(orgId ? { property: { organizationId: orgId } } : {}) },
    });

    if (!inspection) {
      throw new NotFoundException('Inspection not found');
    }

    return this.prisma.unitInspection.update({
      where: { id },
      data: {
        status: InspectionStatus.COMPLETED,
        completedDate: new Date(),
        findings: data.findings,
        notes: data.notes || inspection.notes,
      },
      include: {
        unit: {
          include: {
            property: true,
          },
        },
        inspector: {
          select: {
            id: true,
            username: true,
          },
        },
        photos: true,
      },
    });
  }

  async delete(id: number, userId: string, orgId?: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user?.role !== Role.PROPERTY_MANAGER) {
      throw new ForbiddenException('Only property managers can delete inspections');
    }

    const inspection = await this.prisma.unitInspection.findFirst({
      where: { id, ...(orgId ? { property: { organizationId: orgId } } : {}) },
    });

    if (!inspection) {
      throw new NotFoundException('Inspection not found');
    }

    await this.prisma.unitInspection.delete({
      where: { id },
    });

    return { success: true };
  }

  async addPhoto(inspectionId: number, url: string, caption: string | undefined, userId: string, orgId?: string) {
    const inspection = await this.prisma.unitInspection.findFirst({
      where: { id: inspectionId, ...(orgId ? { property: { organizationId: orgId } } : {}) },
    });

    if (!inspection) {
      throw new NotFoundException('Inspection not found');
    }

    return this.prisma.unitInspectionPhoto.create({
      data: {
        inspectionId,
        url,
        caption,
        uploadedById: userId,
      },
    });
  }
}
