export type OperatorWorkflowId =
  | 'WF-PAY-001'
  | 'WF-MNT-001'
  | 'WF-APP-001'
  | 'WF-LEASE-001'
  | 'WF-INSP-001'
  | 'WF-RENEW-001'
  | 'WF-OWNER-001';

export type OperatorWorkflowStatus = 'READY' | 'NEEDS_REVIEW' | 'BLOCKED' | 'IN_PROGRESS';

export interface OperatorWorkflowItem {
  id: string;
  workflowId: OperatorWorkflowId;
  title: string;
  summary: string;
  status: OperatorWorkflowStatus;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  entityType: string;
  entityId: string;
  propertyId?: string | null;
  unitId?: string | null;
  tenantId?: string | null;
  ownerId?: string | null;
  amountCents?: number | null;
  dueAt?: string | null;
  updatedAt: string;
  canonicalRoute: string;
  nextAction: string;
}

export interface OperatorWorkflowGroup {
  workflowId: OperatorWorkflowId;
  label: string;
  count: number;
  items: OperatorWorkflowItem[];
}

export interface OperatorWorkflowsResponse {
  generatedAt: string;
  groups: OperatorWorkflowGroup[];
  totals: {
    workflows: number;
    items: number;
    highPriority: number;
    blocked: number;
  };
}
