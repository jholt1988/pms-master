import { Body, Controller, Get, Param, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { EstimateStatus } from '@prisma/client';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { OrgContextGuard } from '../common/org-context/org-context.guard';
import { OrgId } from '../common/org-context/org-id.decorator';
import { PrismaService } from '../prisma/prisma.service';

type AuthenticatedRequest = Request & {
  user?: {
    id?: string;
    userId?: string;
  };
};

type CreateEstimateBody = {
  inspectionId?: number;
  maintenanceRequestId?: string;
  propertyId?: string;
  unitId?: string;
  totalLaborCost?: number;
  totalMaterialCost?: number;
  totalProjectCost?: number;
  itemsToRepair?: number;
  itemsToReplace?: number;
  totalLaborHours?: number;
  stepByStepPlan?: string;
  lineItems?: Array<{
    itemDescription?: string;
    description?: string;
    location?: string;
    category?: string;
    issueType?: string;
    laborHours?: number;
    laborRate?: number;
    laborCost?: number;
    materialCost?: number;
    totalCost?: number;
    notes?: string;
  }>;
};

@Controller('estimates')
@UseGuards(AuthGuard('jwt'), RolesGuard, OrgContextGuard)
export class EstimatesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @Roles('PROPERTY_MANAGER', 'ADMIN', 'OWNER')
  async listEstimates(
    @Query('status') status?: EstimateStatus,
    @Query('propertyId') propertyId?: string,
    @OrgId() orgId?: string,
  ) {
    return this.prisma.repairEstimate.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(propertyId ? { propertyId } : {}),
        ...(orgId ? { property: { organizationId: orgId } } : {}),
      },
      include: { lineItems: true, property: true, unit: true, maintenanceRequest: true },
      orderBy: { generatedAt: 'desc' },
    });
  }

  @Post()
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  async createEstimate(@Body() body: CreateEstimateBody, @Request() req: AuthenticatedRequest) {
    const generatedById = req.user?.userId ?? req.user?.id;
    if (!generatedById) {
      throw new Error('Authenticated user is required to create an estimate');
    }

    const lineItems = body.lineItems ?? [];
    const totalLaborCost = Number(body.totalLaborCost ?? lineItems.reduce((sum, item) => sum + Number(item.laborCost ?? 0), 0));
    const totalMaterialCost = Number(body.totalMaterialCost ?? lineItems.reduce((sum, item) => sum + Number(item.materialCost ?? 0), 0));
    const totalProjectCost = Number(body.totalProjectCost ?? lineItems.reduce((sum, item) => sum + Number(item.totalCost ?? 0), totalLaborCost + totalMaterialCost));

    return this.prisma.repairEstimate.create({
      data: {
        inspectionId: body.inspectionId,
        maintenanceRequestId: body.maintenanceRequestId,
        propertyId: body.propertyId,
        unitId: body.unitId,
        totalLaborCost,
        totalMaterialCost,
        totalProjectCost,
        itemsToRepair: Number(body.itemsToRepair ?? lineItems.length),
        itemsToReplace: Number(body.itemsToReplace ?? 0),
        totalLaborHours: body.totalLaborHours,
        stepByStepPlan: body.stepByStepPlan,
        generatedById,
        status: EstimateStatus.PENDING_REVIEW,
        lineItems: lineItems.length > 0 ? {
          create: lineItems.map((item) => ({
            itemDescription: item.itemDescription ?? item.description ?? 'Repair estimate item',
            location: item.location ?? 'Unspecified',
            category: item.category ?? 'general',
            issueType: item.issueType ?? 'repair',
            laborHours: item.laborHours,
            laborRate: item.laborRate,
            laborCost: Number(item.laborCost ?? 0),
            materialCost: Number(item.materialCost ?? 0),
            totalCost: Number(item.totalCost ?? Number(item.laborCost ?? 0) + Number(item.materialCost ?? 0)),
            notes: item.notes,
          })),
        } : undefined,
      },
      include: { lineItems: true },
    });
  }

  @Patch(':id/approve')
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  async approveEstimate(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.prisma.repairEstimate.update({
      where: { id },
      data: {
        status: EstimateStatus.APPROVED,
        approvedAt: new Date(),
        approvedById: req.user?.userId ?? req.user?.id,
      },
      include: { lineItems: true },
    });
  }

  @Patch(':id/reject')
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  async rejectEstimate(@Param('id') id: string) {
    return this.prisma.repairEstimate.update({
      where: { id },
      data: { status: EstimateStatus.REJECTED },
      include: { lineItems: true },
    });
  }
}
