export type CommandCenterDecisionType =
  | 'DELINQUENCY_FOLLOW_UP'
  | 'MAINTENANCE_TRIAGE'
  | 'APPLICATION_REVIEW'
  | 'RENEWAL_REVIEW'
  | 'PAYMENT_EXCEPTION'
  | 'INSPECTION_ACTION_ITEM';

export type CommandCenterPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface CommandCenterEvidence {
  label: string;
  value: string | number | boolean | null;
  source: string;
  entityType?: string;
  entityId?: string;
}

export interface CommandCenterAction {
  id: string;
  label: string;
  mode: 'APPROVAL_REQUIRED' | 'LOW_RISK_AUTO' | 'READ_ONLY';
  approvalTaskId?: string | null;
}

export interface CommandCenterTimelineItem {
  id: string;
  title: string;
  status: string;
  occurredAt: string;
  domain: string;
}

export interface CommandCenterDecisionCard {
  id: string;
  type: CommandCenterDecisionType;
  domain: 'payments' | 'maintenance' | 'leasing' | 'accounting' | 'inspections';
  title: string;
  summary: string;
  priority: CommandCenterPriority;
  score: number;
  entity: {
    type: string;
    id: string;
    label?: string | null;
  };
  propertyId?: string | null;
  unitId?: string | null;
  tenantId?: string | null;
  dueAt?: string | null;
  createdAt: string;
  recommendedAction: string;
  approvalTaskId?: string | null;
  decisionRecordId?: string | null;
  evidence: CommandCenterEvidence[];
  actions: CommandCenterAction[];
  timeline: CommandCenterTimelineItem[];
}

export interface CommandCenterMetrics {
  totalDecisions: number;
  criticalDecisions: number;
  pendingApprovals: number;
  generatedAt: string;
}

export interface CommandCenterResponse {
  metrics: CommandCenterMetrics;
  decisions: CommandCenterDecisionCard[];
  approvals: unknown[];
  timeline: CommandCenterTimelineItem[];
  dailyBriefing: unknown;
}

export interface CommandCenterDecisionDetail {
  decision: CommandCenterDecisionCard;
  decisionRecords: unknown[];
  approvalTask?: unknown | null;
  auditTrail: CommandCenterTimelineItem[];
  sourceLinks: Array<{
    label: string;
    entityType: string;
    entityId: string;
    route: string;
  }>;
}
