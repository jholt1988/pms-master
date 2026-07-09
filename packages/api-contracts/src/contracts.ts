/**
 * Cross-cutting contracts shared across the PropertyOS system: the event
 * envelope carried on the RabbitMQ `property_os_events` exchange, and the
 * autonomy/decision records surfaced by the workflow engine.
 *
 * (Moved verbatim from the original `index.ts` so existing imports of
 * `@propertyos/api-contracts` keep resolving.)
 */

export type EventEnvelope<TPayload = unknown> = {
  id: string;
  type: string;
  version: 1;
  source: string;
  occurredAt: string;
  organizationId?: string;
  actorId?: string;
  correlationId?: string;
  idempotencyKey?: string;
  subject?: {
    type: string;
    id: string;
  };
  payload: TPayload;
};

export type DecisionRecord = {
  id: string;
  workflowId: string;
  workflowInstanceId?: string;
  organizationId: string;
  actorId?: string;
  entityType: string;
  entityId: string;
  recommendation: string;
  rationale: string[];
  confidence?: number;
  evidenceRefs: Array<{
    type: string;
    id: string;
    label?: string;
  }>;
  approvalTaskId?: string;
  result?: 'APPROVED' | 'REJECTED' | 'EXECUTED' | 'FAILED' | 'DEFERRED';
  createdAt: string;
};

export type ApprovalTaskContract = {
  id: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXECUTED' | 'FAILED' | 'CANCELLED';
  title: string;
  summary?: string | null;
  propertyId?: string | null;
  tenantId?: string | null;
  unitId?: string | null;
  leaseId?: string | null;
  workOrderId?: string | null;
  createdAt: string;
  decidedAt?: string | null;
  executedAt?: string | null;
  actions: unknown;
  results?: unknown;
};

export type IdempotencyContract = {
  key: string;
  scope: string;
  status: 'RESERVED' | 'COMPLETED' | 'FAILED';
  firstSeenAt: string;
  completedAt?: string;
};
