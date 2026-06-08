import { EstimateStatus, InspectionStatus, InspectionType, MaintenancePriority, Role } from '@prisma/client';

export type OperatorInspectionEstimateActor = {
  userId: string;
  username?: string;
  role: Role;
};

export type OperatorInspectionEstimateMetrics = {
  completedInspections: number;
  inspectionsNeedingEstimate: number;
  draftEstimates: number;
  pendingReviewEstimates: number;
  approvedEstimates: number;
  repairReadyEstimates: number;
};

export type OperatorInspectionEstimateItem = {
  inspectionId: number;
  type: InspectionType;
  status: InspectionStatus;
  propertyId: string;
  propertyName: string | null;
  unitId: string;
  unitLabel: string | null;
  scheduledDate: string;
  completedDate: string | null;
  findingsCount: number;
  photosCount: number;
  estimateCount: number;
  latestEstimate: OperatorRepairEstimateSummary | null;
  nextAction: 'complete_inspection' | 'generate_estimate' | 'review_estimate' | 'create_repair_request' | 'complete' | 'blocked';
  blockers: string[];
  canonicalRoute: string;
};

export type OperatorRepairEstimateSummary = {
  id: string;
  inspectionId: number | null;
  maintenanceRequestId: string | null;
  status: EstimateStatus;
  totalLaborCost: number;
  totalMaterialCost: number;
  totalProjectCost: number;
  itemsToRepair: number;
  itemsToReplace: number;
  totalLaborHours: number | null;
  generatedAt: string;
  approvedAt: string | null;
  lineItemCount: number;
  canonicalRoute: string;
};

export type OperatorInspectionEstimatesWorkbench = {
  generatedAt: string;
  metrics: OperatorInspectionEstimateMetrics;
  inspections: OperatorInspectionEstimateItem[];
  estimates: OperatorRepairEstimateSummary[];
  sourceLinks: Array<{ label: string; href: string; entityType: string }>;
};

export type CreateRepairRequestPayload = {
  title?: string;
  description?: string;
  priority?: MaintenancePriority;
  dueDate?: string;
};
