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
    const user = await this.prisma.user.findUnique({ where: { id: userId }, include: { lease: true } });
    
    if (user?.role === Role.TENANT) {
      if (user.lease?.unitId !== data.unitId) {
        throw new ForbiddenException('Tenants can only schedule inspections for their assigned unit');
      }
    } else if (user?.role !== Role.PROPERTY_MANAGER && user?.role !== Role.ADMIN && user?.role !== Role.OWNER) {
      throw new ForbiddenException('Unauthorized to schedule inspections');
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
    const user = await this.prisma.user.findUnique({ where: { id: userId }, include: { lease: true } });

    const inspection = await this.prisma.unitInspection.findFirst({
      where: { id, ...(orgId ? { property: { organizationId: orgId } } : {}) },
    });

    if (!inspection) {
      throw new NotFoundException('Inspection not found');
    }

    if (user?.role === Role.TENANT) {
      if (user.lease?.unitId !== inspection.unitId) {
        throw new ForbiddenException('Tenants can only update inspections for their assigned unit');
      }
    } else if (user?.role !== Role.PROPERTY_MANAGER && user?.role !== Role.ADMIN && user?.role !== Role.OWNER) {
      throw new ForbiddenException('Unauthorized to update inspections');
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
    const user = await this.prisma.user.findUnique({ where: { id: userId }, include: { lease: true } });

    const inspection = await this.prisma.unitInspection.findFirst({
      where: { id, ...(orgId ? { property: { organizationId: orgId } } : {}) },
    });

    if (!inspection) {
      throw new NotFoundException('Inspection not found');
    }

    if (user?.role === Role.TENANT) {
      if (user.lease?.unitId !== inspection.unitId) {
        throw new ForbiddenException('Tenants can only complete inspections for their assigned unit');
      }
    } else if (user?.role !== Role.PROPERTY_MANAGER && user?.role !== Role.ADMIN && user?.role !== Role.OWNER) {
      throw new ForbiddenException('Unauthorized to complete inspections');
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
    if (user?.role !== Role.PROPERTY_MANAGER && user?.role !== Role.ADMIN && user?.role !== Role.OWNER) {
      throw new ForbiddenException('Only property managers/admins can delete inspections');
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

  async approveInspection(id: number, userId: string, orgId?: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user?.role !== Role.PROPERTY_MANAGER && user?.role !== Role.ADMIN && user?.role !== Role.OWNER) {
      throw new ForbiddenException('Only authorized staff can approve inspections and trigger estimates.');
    }

    const inspection = await this.prisma.unitInspection.findFirst({
      where: { id, ...(orgId ? { property: { organizationId: orgId } } : {}) },
    });

    if (!inspection || inspection.status !== InspectionStatus.COMPLETED) {
      throw new NotFoundException('Inspection must exist and be COMPLETED to approve.');
    }

    // Set inspection to APPROVED state (bypassing strict typing by casting due to Prisma not strictly being generated in local mock environment)
    const updatedInspection = await this.prisma.unitInspection.update({
      where: { id },
      data: { status: 'APPROVED' as any },
    });

    // Auto-generate Repair Estimate
    const estimate = await this.generateEstimateFromInspection(id, userId, orgId);

    return { inspection: updatedInspection, generatedEstimate: estimate };
  }

  /**
   * Automated Estimating Engine: Digessts findings and translates to estimated labor & materials.
   */
  async generateEstimateFromInspection(inspectionId: number, generatedById: string, orgId?: string) {
    const inspection = await this.prisma.unitInspection.findUnique({
      where: { id: inspectionId },
    });

    if (!inspection) throw new Error('Inspection not found for estimating engine.');

    let findings = [];
    if (inspection.findings) {
      if (Array.isArray(inspection.findings)) findings = inspection.findings;
      else if (typeof inspection.findings === 'string') {
        try { findings = JSON.parse(inspection.findings); } catch(e) {}
      }
    }

    // Mock pricing dictionary engine
    const repairPricingEngine: Record<string, { material: number, hours: number, actionPlan: string }> = {
      'drywall_hole': { material: 35.0, hours: 2.5, actionPlan: '1. Cut out damaged drywall square. 2. Install backing blocks. 3. Insert fresh drywall patch. 4. Tape and mud edges (wait 24h). 5. Sand and texture. 6. Prime and paint.' },
      'broken_blind': { material: 55.0, hours: 1.0, actionPlan: '1. Remove old blind hardware. 2. Measure and cut new blind if necessary. 3. Install new brackets. 4. Mount blinds and test string mechanism.' },
      'clogged_drain': { material: 10.0, hours: 1.5, actionPlan: '1. Remove P-trap underneath sink. 2. Clear out blockage manually. 3. Re-install P-trap and run water to check for leaks.' },
      'scratched_floor': { material: 20.0, hours: 3.0, actionPlan: '1. Clean specific scratched area. 2. Apply wood filler to deep gouges. 3. Sand area flush. 4. Apply matching stain/finish.' },
    };

    let totalLaborCost = 0;
    let totalMaterialCost = 0;
    let totalLaborHours = 0;
    let itemsToRepair = 0;
    let itemsToReplace = 0;
    
    let stepByStepMarkdown = `## Comprehensive Repair Action Plan\\n\\n`;

    const laborRatePerHour = 65.00; // Standard PM maintenance rate

    const lineItemsData = [];

    findings.forEach((finding: any, index: number) => {
      // Very naive NLP/keyword mapping for demonstration of predictive estimating
      let mappedKey = 'drywall_hole'; // default fallback
      const desc = (finding.description || '').toLowerCase();
      
      if (desc.includes('blind') || desc.includes('window')) mappedKey = 'broken_blind';
      else if (desc.includes('drain') || desc.includes('sink') || desc.includes('plumbing')) mappedKey = 'clogged_drain';
      else if (desc.includes('floor') || desc.includes('wood')) mappedKey = 'scratched_floor';

      const specs = repairPricingEngine[mappedKey];

      const lineItemLaborCost = specs.hours * laborRatePerHour;
      totalLaborCost += lineItemLaborCost;
      totalMaterialCost += specs.material;
      totalLaborHours += specs.hours;
      
      if (mappedKey === 'broken_blind') itemsToReplace++; else itemsToRepair++;

      stepByStepMarkdown += `### Task ${index + 1}: ${finding.location || 'General Unit'} - ${finding.issueType || 'Repair'}\\n`;
      stepByStepMarkdown += `**Issue:** ${finding.description || 'General damage'}\\n`;
      stepByStepMarkdown += `**Material Estimate:** $${specs.material.toFixed(2)}\\n`;
      stepByStepMarkdown += `**Labor Estimate:** ${specs.hours} hrs ($${lineItemLaborCost.toFixed(2)})\\n`;
      stepByStepMarkdown += `**Action Items:**\\n${specs.actionPlan}\\n\\n`;

      lineItemsData.push({
        itemDescription: finding.description || 'General repair',
        location: finding.location || 'Unit',
        category: finding.category || 'General',
        issueType: finding.issueType || 'Repair',
        laborHours: specs.hours,
        laborRate: laborRatePerHour,
        laborCost: lineItemLaborCost,
        materialCost: specs.material,
        totalCost: lineItemLaborCost + specs.material
      });
    });

    const totalProjectCost = totalLaborCost + totalMaterialCost;
    
    // Create RepairEstimate
    const estimate = await this.prisma.repairEstimate.create({
      data: {
        inspectionId: inspection.id,
        propertyId: inspection.propertyId,
        unitId: inspection.unitId,
        totalLaborCost,
        totalMaterialCost,
        totalProjectCost,
        itemsToRepair,
        itemsToReplace,
        generatedById,
        status: 'DRAFT', // EstimateStatus enum
        // Casting to any to bypass un-generated local prisma client types
        ...({ totalLaborHours, stepByStepPlan: stepByStepMarkdown } as any),
        lineItems: {
          create: lineItemsData
        }
      }
    });

    return estimate;
  }
}
