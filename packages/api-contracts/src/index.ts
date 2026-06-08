export type ApiError = {
  code: string;
  message: string;
  field?: string;
  details?: unknown;
  retryable?: boolean;
};

export type ApiMeta = {
  requestId?: string;
  pagination?: {
    total: number;
    skip: number;
    take: number;
  };
  [key: string]: unknown;
};

export type ApiEnvelope<T> = {
  data: T;
  meta: ApiMeta;
  errors: ApiError[];
};

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

export function ok<T>(data: T, meta: ApiMeta = {}): ApiEnvelope<T> {
  return { data, meta, errors: [] };
}

export function fail(errors: ApiError[], meta: ApiMeta = {}): ApiEnvelope<null> {
  return { data: null, meta, errors };
}
