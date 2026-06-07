import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EstimateStatus, InspectionStatus, MaintenancePriority, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { InspectionsService } from '../inspections/inspections.service';
import { MaintenanceService } from '../maintenance/maintenance.service';
import { AuditLogService } from '../shared/audit-log.service';
import {
  CreateRepairRequestPayload,
  OperatorInspectionEstimateActor,
  OperatorInspectionEstimateItem,
  OperatorInspectionEstimatesWorkbench,
  OperatorRepairEstimateSummary,
} from './operator-inspection-estimates.types';

type InspectionWithRelations = Awaited<ReturnType<OperatorInspectionEstimatesService['findInspections']>>[number];
type EstimateWithRelations = Awaited<ReturnType<OperatorInspectionEstimatesService['findEstimates']>>[number];

@Injectable()
export class OperatorInspectionEstimatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inspectionsService: InspectionsService,
    private readonly maintenanceService: MaintenanceService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async getWorkbench(
    orgId: string,
    _actor: OperatorInspectionEstimateActor,
    options: { propertyId?: string; status?: InspectionStatus; limit?: number } = {},
  ): Promise<OperatorInspectionEstimatesWorkbench> {
    const limit = Math.min(Math.max(options.limit ?? 50, 1), 100);
    const [inspections, estimates] = await Promise.all([
      this.findInspections(orgId, options.propertyId, options.status, limit),
      this.findEstimates(orgId, options.propertyId, limit),
    ]);
    const mappedInspections = inspections.map((inspection) => this.mapInspection(inspection));
    const mappedEstimates = estimates.map((estimate) => this.mapEstimate(estimate));

    return {
      generatedAt: new Date().toISOString(),
      metrics: {
        completedInspections: mappedInspections.filter((item) => item.status === InspectionStatus.COMPLETED || String(item.status) === 'APPROVED').length,
        inspectionsNeedingEstimate: mappedInspections.filter((item) => item.nextAction === 'generate_estimate').length,
        draftEstimates: mappedEstimates.filter((item) => item.status === EstimateStatus.DRAFT).length,
        pendingReviewEstimates: mappedEstimates.filter((item) => item.status === EstimateStatus.PENDING_REVIEW).length,
        approvedEstimates: mappedEstimates.filter((item) => item.status === EstimateStatus.APPROVED).length,
        repairReadyEstimates: mappedEstimates.filter((item) => item.status === EstimateStatus.APPROVED && !item.maintenanceRequestId).length,
      },
      inspections: mappedInspections,
      estimates: mappedEstimates,
      sourceLinks: [
        { label: 'Canonical inspections API', href: '/api/inspections', entityType: 'UnitInspection' },
        { label: 'Canonical estimates API', href: '/api/estimates', entityType: 'RepairEstimate' },
        { label: 'Canonical maintenance API', href: '/api/maintenance', entityType: 'MaintenanceRequest' },
      ],
    };
  }

  async generateEstimate(orgId: string, actor: OperatorInspectionEstimateActor, inspectionId: number) {
    const inspection = await this.getInspectionInOrg(orgId, inspectionId);
    if (inspection.status !== InspectionStatus.COMPLETED && String(inspection.status) !== 'APPROVED') {
      throw new BadRequestException('Inspection must be completed before generating a repair estimate.');
    }
    const estimate = await this.inspectionsService.generateEstimateFromInspection(inspectionId, actor.userId, orgId);
    await this.recordAudit(orgId, actor.userId, 'REPAIR_ESTIMATE_GENERATED', String(inspectionId), {
      estimateId: estimate.id,
    });
    return estimate;
  }

  async approveEstimate(orgId: string, actor: OperatorInspectionEstimateActor, estimateId: string) {
    await this.getEstimateInOrg(orgId, estimateId);
    const estimate = await this.prisma.repairEstimate.update({
      where: { id: estimateId },
      data: {
        status: EstimateStatus.APPROVED,
        approvedAt: new Date(),
        approvedById: actor.userId,
      },
      include: { lineItems: true },
    });
    await this.recordAudit(orgId, actor.userId, 'REPAIR_ESTIMATE_APPROVED', estimateId, {
      totalProjectCost: estimate.totalProjectCost,
    });
    return estimate;
  }

  async rejectEstimate(orgId: string, actor: OperatorInspectionEstimateActor, estimateId: string, reason?: string) {
    await this.getEstimateInOrg(orgId, estimateId);
    const estimate = await this.prisma.repairEstimate.update({
      where: { id: estimateId },
      data: { status: EstimateStatus.REJECTED },
      include: { lineItems: true },
    });
    await this.recordAudit(orgId, actor.userId, 'REPAIR_ESTIMATE_REJECTED', estimateId, { reason: reason ?? null });
    return estimate;
  }

  async createRepairRequest(
    orgId: string,
    actor: OperatorInspectionEstimateActor,
    estimateId: string,
    payload: CreateRepairRequestPayload,
  ) {
    const estimate = await this.getEstimateInOrg(orgId, estimateId);
    if (estimate.status !== EstimateStatus.APPROVED) {
      throw new BadRequestException('Only approved repair estimates can create repair requests.');
    }
    if (estimate.maintenanceRequestId) {
      return this.prisma.maintenanceRequest.findUnique({ where: { id: estimate.maintenanceRequestId } });
    }
    if (!estimate.propertyId || !estimate.unitId) {
      throw new BadRequestException('Estimate must have property and unit links before creating a repair request.');
    }

    const request = await this.maintenanceService.create(
      actor.userId,
      actor.role,
      {
        title: payload.title ?? `Repair estimate ${estimate.id.slice(0, 8)}`,
        description: payload.description ?? this.buildRepairDescription(estimate),
        priority: payload.priority ?? this.priorityFromEstimate(estimate.totalProjectCost),
        propertyId: estimate.propertyId,
        unitId: estimate.unitId,
        dueDate: payload.dueDate,
        category: 'inspection_repair',
      },
      orgId,
    );
    await this.prisma.repairEstimate.update({
      where: { id: estimate.id },
      data: { maintenanceRequestId: request.id },
    });
    await this.recordAudit(orgId, actor.userId, 'REPAIR_REQUEST_CREATED_FROM_ESTIMATE', request.id, {
      estimateId: estimate.id,
      inspectionId: estimate.inspectionId,
    });
    return request;
  }

  private async findInspections(orgId: string, propertyId?: string, status?: InspectionStatus, limit = 50) {
    return this.prisma.unitInspection.findMany({
      where: {
        ...(status ? { status } : {}),
        property: {
          organizationId: orgId,
          ...(propertyId ? { id: propertyId } : {}),
        },
      },
      include: {
        property: { select: { id: true, name: true } },
        unit: { select: { id: true, unitNumber: true, name: true } },
        photos: { select: { id: true } },
        repairEstimates: { include: { lineItems: true }, orderBy: { generatedAt: 'desc' }, take: 3 },
      },
      orderBy: [{ completedDate: 'desc' }, { scheduledDate: 'desc' }],
      take: limit,
    });
  }

  private async findEstimates(orgId: string, propertyId?: string, limit = 50) {
    return this.prisma.repairEstimate.findMany({
      where: {
        property: {
          organizationId: orgId,
          ...(propertyId ? { id: propertyId } : {}),
        },
      },
      include: { lineItems: true, inspection: true, maintenanceRequest: true },
      orderBy: { generatedAt: 'desc' },
      take: limit,
    });
  }

  private async getInspectionInOrg(orgId: string, inspectionId: number) {
    const inspection = await this.prisma.unitInspection.findFirst({
      where: { id: inspectionId, property: { organizationId: orgId } },
    });
    if (!inspection) throw new NotFoundException('Inspection not found.');
    return inspection;
  }

  private async getEstimateInOrg(orgId: string, estimateId: string) {
    const estimate = await this.prisma.repairEstimate.findFirst({
      where: { id: estimateId, property: { organizationId: orgId } },
      include: { lineItems: true },
    });
    if (!estimate) throw new NotFoundException('Repair estimate not found.');
    return estimate;
  }

  private mapInspection(inspection: InspectionWithRelations): OperatorInspectionEstimateItem {
    const findingsCount = this.countFindings(inspection.findings);
    const latestEstimate = inspection.repairEstimates[0] ? this.mapEstimate(inspection.repairEstimates[0] as any) : null;
    const blockers = [
      inspection.status !== InspectionStatus.COMPLETED && String(inspection.status) !== 'APPROVED' ? 'Inspection is not completed.' : null,
      findingsCount === 0 ? 'Inspection has no structured findings.' : null,
    ].filter(Boolean) as string[];

    return {
      inspectionId: inspection.id,
      type: inspection.type,
      status: inspection.status,
      propertyId: inspection.propertyId,
      propertyName: inspection.property?.name ?? null,
      unitId: inspection.unitId,
      unitLabel: inspection.unit?.unitNumber ?? inspection.unit?.name ?? null,
      scheduledDate: inspection.scheduledDate.toISOString(),
      completedDate: inspection.completedDate?.toISOString() ?? null,
      findingsCount,
      photosCount: inspection.photos.length,
      estimateCount: inspection.repairEstimates.length,
      latestEstimate,
      nextAction: this.getInspectionNextAction(inspection.status, latestEstimate, blockers),
      blockers,
      canonicalRoute: `/api/operator-inspection-estimates/inspections/${inspection.id}`,
    };
  }

  private mapEstimate(estimate: EstimateWithRelations): OperatorRepairEstimateSummary {
    return {
      id: estimate.id,
      inspectionId: estimate.inspectionId ?? null,
      maintenanceRequestId: estimate.maintenanceRequestId ?? null,
      status: estimate.status,
      totalLaborCost: estimate.totalLaborCost,
      totalMaterialCost: estimate.totalMaterialCost,
      totalProjectCost: estimate.totalProjectCost,
      itemsToRepair: estimate.itemsToRepair,
      itemsToReplace: estimate.itemsToReplace,
      totalLaborHours: estimate.totalLaborHours ?? null,
      generatedAt: estimate.generatedAt.toISOString(),
      approvedAt: estimate.approvedAt?.toISOString() ?? null,
      lineItemCount: estimate.lineItems.length,
      canonicalRoute: `/api/estimates/${estimate.id}`,
    };
  }

  private getInspectionNextAction(
    status: InspectionStatus,
    latestEstimate: OperatorRepairEstimateSummary | null,
    blockers: string[],
  ): OperatorInspectionEstimateItem['nextAction'] {
    if (status !== InspectionStatus.COMPLETED && String(status) !== 'APPROVED') return 'complete_inspection';
    if (!latestEstimate) return blockers.length > 0 ? 'blocked' : 'generate_estimate';
    if (
      latestEstimate.status === EstimateStatus.DRAFT ||
      latestEstimate.status === EstimateStatus.PENDING_REVIEW
    ) return 'review_estimate';
    if (latestEstimate.status === EstimateStatus.APPROVED && !latestEstimate.maintenanceRequestId) return 'create_repair_request';
    return 'complete';
  }

  private countFindings(findings: unknown): number {
    if (Array.isArray(findings)) return findings.length;
    if (findings && typeof findings === 'object') return Object.keys(findings as Record<string, unknown>).length;
    if (typeof findings === 'string' && findings.trim()) {
      try {
        const parsed = JSON.parse(findings);
        return this.countFindings(parsed);
      } catch {
        return 1;
      }
    }
    return 0;
  }

  private buildRepairDescription(estimate: Awaited<ReturnType<OperatorInspectionEstimatesService['getEstimateInOrg']>>) {
    const lines = estimate.lineItems.map((item) => `- ${item.location}: ${item.itemDescription} (${item.category}, ${item.issueType})`);
    return [
      `Repair work generated from inspection estimate ${estimate.id}.`,
      `Estimated total: $${estimate.totalProjectCost.toFixed(2)}.`,
      ...lines,
      estimate.stepByStepPlan ? `\nPlan:\n${estimate.stepByStepPlan}` : '',
    ].filter(Boolean).join('\n');
  }

  private priorityFromEstimate(totalProjectCost: number) {
    if (totalProjectCost >= 1500) return MaintenancePriority.HIGH;
    if (totalProjectCost <= 250) return MaintenancePriority.LOW;
    return MaintenancePriority.MEDIUM;
  }

  private async recordAudit(orgId: string, actorId: string, action: string, entityId: string, metadata: Record<string, unknown>) {
    await this.auditLogService.record({
      orgId,
      actorId,
      module: 'operator-inspection-estimates',
      action,
      entityType: action.includes('REQUEST') ? 'MaintenanceRequest' : 'RepairEstimate',
      entityId,
      result: 'SUCCESS',
      metadata,
    });
  }
}
