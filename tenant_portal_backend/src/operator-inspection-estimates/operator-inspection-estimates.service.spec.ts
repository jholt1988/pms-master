import { EstimateStatus, InspectionStatus, InspectionType, Role } from '@prisma/client';
import { OperatorInspectionEstimatesService } from './operator-inspection-estimates.service';

const inspection = {
  id: 12,
  type: InspectionType.MOVE_OUT,
  status: InspectionStatus.COMPLETED,
  propertyId: 'property-1',
  property: { id: 'property-1', name: 'Oak House' },
  unitId: 'unit-1',
  unit: { id: 'unit-1', unitNumber: '2A', name: null },
  scheduledDate: new Date('2026-06-01T00:00:00Z'),
  completedDate: new Date('2026-06-02T00:00:00Z'),
  findings: [{ description: 'Drywall hole', location: 'Bedroom' }],
  photos: [{ id: 1 }],
  repairEstimates: [],
};

const estimate = {
  id: 'estimate-1',
  inspectionId: 12,
  maintenanceRequestId: null,
  status: EstimateStatus.APPROVED,
  propertyId: 'property-1',
  unitId: 'unit-1',
  totalLaborCost: 100,
  totalMaterialCost: 35,
  totalProjectCost: 135,
  itemsToRepair: 1,
  itemsToReplace: 0,
  totalLaborHours: 2,
  stepByStepPlan: 'Patch drywall',
  generatedAt: new Date('2026-06-02T01:00:00Z'),
  approvedAt: new Date('2026-06-02T02:00:00Z'),
  lineItems: [{ id: 1, location: 'Bedroom', itemDescription: 'Drywall hole', category: 'General', issueType: 'Repair' }],
};

describe('OperatorInspectionEstimatesService', () => {
  it('returns inspection-to-estimate workbench metrics', async () => {
    const prisma = {
      unitInspection: { findMany: jest.fn().mockResolvedValue([inspection]) },
      repairEstimate: { findMany: jest.fn().mockResolvedValue([estimate]) },
    };
    const service = new OperatorInspectionEstimatesService(prisma as any, {} as any, {} as any, {} as any);

    const result = await service.getWorkbench('org-1', { userId: 'actor-1', role: Role.PROPERTY_MANAGER });

    expect(prisma.unitInspection.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { property: { organizationId: 'org-1' } },
    }));
    expect(result.metrics).toMatchObject({
      completedInspections: 1,
      inspectionsNeedingEstimate: 1,
      approvedEstimates: 1,
      repairReadyEstimates: 1,
    });
    expect(result.inspections[0].nextAction).toBe('generate_estimate');
  });

  it('creates a maintenance repair request from an approved estimate and links it', async () => {
    const prisma = {
      repairEstimate: {
        findFirst: jest.fn().mockResolvedValue(estimate),
        update: jest.fn().mockResolvedValue({ ...estimate, maintenanceRequestId: 'request-1' }),
      },
    };
    const maintenanceService = {
      create: jest.fn().mockResolvedValue({ id: 'request-1' }),
    };
    const auditLogService = { record: jest.fn().mockResolvedValue(undefined) };
    const service = new OperatorInspectionEstimatesService(prisma as any, {} as any, maintenanceService as any, auditLogService as any);

    await service.createRepairRequest(
      'org-1',
      { userId: 'actor-1', role: Role.PROPERTY_MANAGER },
      'estimate-1',
      {},
    );

    expect(maintenanceService.create).toHaveBeenCalledWith(
      'actor-1',
      Role.PROPERTY_MANAGER,
      expect.objectContaining({ propertyId: 'property-1', unitId: 'unit-1', category: 'inspection_repair' }),
      'org-1',
    );
    expect(prisma.repairEstimate.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'estimate-1' },
      data: { maintenanceRequestId: 'request-1' },
    }));
    expect(auditLogService.record).toHaveBeenCalledWith(expect.objectContaining({
      module: 'operator-inspection-estimates',
      action: 'REPAIR_REQUEST_CREATED_FROM_ESTIMATE',
      entityId: 'request-1',
    }));
  });
});
