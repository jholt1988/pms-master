import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InspectionType, InspectionStatus, Role, Prisma } from '@prisma/client';

interface CreateInspectionDto {
  unitId: number;
  propertyId: number;
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

  async create(data: CreateInspectionDto, userId: number) {
    // Verify user is a property manager
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user?.role !== Role.PROPERTY_MANAGER) {
      throw new ForbiddenException('Only property managers can schedule inspections');
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
    userId?: number;
    userRole?: Role;
    unitId?: number;
    propertyId?: number;
    status?: InspectionStatus;
    type?: InspectionType;
    startDate?: Date;
    endDate?: Date;
    skip?: number;
    take?: number;
  }) {
    let where: Prisma.UnitInspectionWhereInput = {};

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

  async findOne(id: number, userId: number, userRole: Role) {
    const inspection = await this.prisma.unitInspection.findUnique({
      where: { id },
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

  async update(id: number, data: UpdateInspectionDto, userId: number) {
    // Only property managers can update
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user?.role !== Role.PROPERTY_MANAGER) {
      throw new ForbiddenException('Only property managers can update inspections');
    }

    const inspection = await this.prisma.unitInspection.findUnique({
      where: { id },
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

  async complete(id: number, data: CompleteInspectionDto, userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user?.role !== Role.PROPERTY_MANAGER) {
      throw new ForbiddenException('Only property managers can complete inspections');
    }

    const inspection = await this.prisma.unitInspection.findUnique({
      where: { id },
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

  async delete(id: number, userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user?.role !== Role.PROPERTY_MANAGER) {
      throw new ForbiddenException('Only property managers can delete inspections');
    }

    const inspection = await this.prisma.unitInspection.findUnique({
      where: { id },
    });

    if (!inspection) {
      throw new NotFoundException('Inspection not found');
    }

    await this.prisma.unitInspection.delete({
      where: { id },
    });

    return { success: true };
  }

  async addPhoto(inspectionId: number, url: string, caption: string | undefined, userId: number) {
    const inspection = await this.prisma.unitInspection.findUnique({
      where: { id: inspectionId },
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

