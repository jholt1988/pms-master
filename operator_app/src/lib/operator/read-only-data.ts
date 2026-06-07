import { apiRequest, OperatorApiError, type ApiClientOptions } from '../api/client';
import type { paths } from '../api/generated/schema';

export type DashboardMetrics = {
  occupancy?: {
    total?: number;
    occupied?: number;
    vacant?: number;
    percentage?: number;
  };
  financials?: {
    monthlyRevenue?: number;
    collectedThisMonth?: number;
    outstanding?: number;
  };
  maintenance?: {
    open?: number;
    urgent?: number;
    total?: number;
  };
  applications?: {
    pending?: number;
    approved?: number;
    rejected?: number;
  };
  recentActivity?: Array<{
    id: string;
    type: string;
    title: string;
    date?: string;
    priority?: string;
  }>;
};

export type BriefingSignal = {
  id: string;
  severity?: string;
  domain?: string;
  title: string;
  summary?: string;
  monetaryImpact?: number;
  actionLabel?: string;
  createdAt?: string;
};

export type DailyBriefing = {
  signals: BriefingSignal[];
  decisions: BriefingSignal[];
  events: BriefingSignal[];
  metrics?: {
    atRiskAmount?: number;
    pendingDecisions?: number;
    todayEvents?: number;
    vacantUnits?: number;
    overduePayments?: number;
  };
};

export type FeedItem = {
  id: string;
  kind: string;
  domain: string;
  title: string;
  summary: string;
  priority: number;
  timestamp?: string;
  actions?: Array<{
    id: string;
    label: string;
    type: string;
    variant?: string;
    href?: string;
  }>;
  metadata?: {
    confidenceScore?: number;
    impact?: {
      financial?: number;
      timeline?: string;
      risk?: string;
    };
    reasoning?: string[];
    [key: string]: unknown;
  };
};

export type PropertyUnit = {
  id: string;
  name?: string | null;
  unitNumber?: string | null;
  status?: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  squareFeet?: number | null;
};

export type PortfolioProperty = {
  id: string;
  name: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  propertyType?: string | null;
  minRent?: number | null;
  maxRent?: number | null;
  units?: PropertyUnit[];
};

export type PortfolioResponse = {
  data: PortfolioProperty[];
  meta?: {
    page?: number;
    limit?: number;
    totalItems?: number;
    totalPages?: number;
  };
};

export type ApprovalTask = {
  id: string;
  status: string;
  title: string;
  summary?: string | null;
  propertyId?: string | null;
  tenantId?: string | null;
  leaseId?: string | null;
  workOrderId?: string | null;
  createdAt: string;
  actions?: unknown;
};

export type CommandCenterDecision = {
  id: string;
  type: string;
  domain: string;
  title: string;
  summary: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
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
  evidence: Array<{
    label: string;
    value: string | number | boolean | null;
    source: string;
    entityType?: string;
    entityId?: string;
  }>;
  actions: Array<{
    id: string;
    label: string;
    mode: string;
    approvalTaskId?: string | null;
  }>;
  timeline?: Array<{
    id: string;
    title: string;
    status: string;
    occurredAt: string;
    domain: string;
  }>;
};

export type CommandCenterDecisionDetail = {
  decision: CommandCenterDecision;
  decisionRecords: unknown[];
  approvalTask?: ApprovalTask | null;
  auditTrail: Array<{
    id: string;
    title: string;
    status: string;
    occurredAt: string;
    domain: string;
  }>;
  sourceLinks: Array<{
    label: string;
    entityType: string;
    entityId: string;
    route: string;
  }>;
};

export type CommandCenterResponse = {
  metrics: {
    totalDecisions: number;
    criticalDecisions: number;
    pendingApprovals: number;
    generatedAt: string;
  };
  decisions: CommandCenterDecision[];
  approvals: ApprovalTask[];
  timeline: Array<{
    id: string;
    title: string;
    status: string;
    occurredAt: string;
    domain: string;
  }>;
  dailyBriefing?: DailyBriefing;
};

export type OperatorWorkflowItem = {
  id: string;
  workflowId: string;
  title: string;
  summary: string;
  status: string;
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
};

export type OperatorWorkflowGroup = {
  workflowId: string;
  label: string;
  count: number;
  items: OperatorWorkflowItem[];
};

export type OperatorWorkflowsResponse = {
  generatedAt: string;
  groups: OperatorWorkflowGroup[];
  totals: {
    workflows: number;
    items: number;
    highPriority: number;
    blocked: number;
  };
};

export type OperatorPaymentWorkbench = {
  generatedAt: string;
  metrics: {
    ledgerAccounts: number;
    totalBalanceCents: number;
    delinquentLeases: number;
    delinquentAmountCents: number;
    paymentExceptions: number;
    unreconciledItems: number;
    paymentExpansionBlocked: boolean;
  };
  ledgerAccounts: Array<{
    leaseId: string;
    tenantId: string;
    tenantName: string;
    propertyId: string | null;
    propertyName: string | null;
    unitId: string | null;
    unitName: string | null;
    currentBalanceCents: number;
    entryCount: number;
    lastActivityAt: string | null;
    canonicalRoute: string;
  }>;
  delinquency: unknown;
  exceptions: Array<{
    id: string;
    description: string;
    amountCents: number;
    status: string;
    reason: string | null;
    sourceType: string;
    sourceId: string | null;
    date: string;
    canonicalRoute: string;
  }>;
  reconciliation: unknown;
  paymentExpansionGates: unknown;
};

export type OperatorSetupSummary = {
  generatedAt: string;
  metrics: {
    properties: number;
    units: number;
    vacantUnits: number;
    listedUnits: number;
    unitsMissingDetails: number;
    propertiesMissingAddress: number;
  };
  properties: Array<{
    id: string;
    name: string;
    address: string | null;
    city: string | null;
    state: string | null;
    unitCount: number;
    vacantUnits: number;
    listedUnits: number;
    setupWarnings: string[];
  }>;
};

export type OperatorApplicationItem = {
  id: number;
  applicantName: string;
  email: string;
  phoneNumber: string;
  status: string;
  propertyId: string;
  propertyName: string | null;
  unitId: string;
  unitLabel: string | null;
  income: number;
  creditScore: number | null;
  qualificationStatus: string | null;
  recommendation: string | null;
  screeningScore: number | null;
  screenedAt: string | null;
  decisionedAt: string | null;
  convertedLeaseId: string | null;
  submittedAt: string;
  updatedAt: string;
  nextAction: 'screen' | 'review' | 'resolve_conditions' | 'convert_to_lease' | 'complete' | 'none';
  canonicalRoute: string;
};

export type OperatorApplicationLeaseHandoff = {
  applicationId: number;
  applicantName: string;
  propertyName: string | null;
  unitLabel: string | null;
  recommendedRentAmount: number;
  recommendedDepositAmount: number;
  readinessWarnings: string[];
};

export type OperatorApplicationsWorkbench = {
  generatedAt: string;
  metrics: {
    totalApplications: number;
    pendingReview: number;
    needsScreening: number;
    approvedReadyForLease: number;
    conditionallyApproved: number;
    denied: number;
    convertedToLease: number;
  };
  applications: OperatorApplicationItem[];
  leaseHandoffs: OperatorApplicationLeaseHandoff[];
  reviewActions: string[];
  denialReasonCodes: string[];
  sourceLinks: Array<{ label: string; href: string; entityType: string }>;
};

export type OperatorLeaseSigningItem = {
  leaseId: string;
  leaseStatus: string;
  tenantId: string;
  tenantName: string;
  tenantEmail: string | null;
  propertyId: string | null;
  propertyName: string | null;
  unitId: string;
  unitLabel: string | null;
  startDate: string;
  endDate: string;
  rentAmount: number;
  depositAmount: number;
  documentCount: number;
  latestEnvelope: {
    id: number;
    providerEnvelopeId: string;
    status: string;
    providerStatus: string | null;
    createdAt: string;
    updatedAt: string;
    signedPdfDocumentId: number | null;
    auditTrailDocumentId: number | null;
    canonicalRoute: string;
    participants: Array<{
      id: number;
      name: string;
      email: string;
      role: string;
      status: string;
      userId: string | null;
    }>;
  } | null;
  nextAction: 'generate_packet' | 'send_for_signature' | 'monitor_signature' | 'complete' | 'blocked';
  blockers: string[];
  canonicalRoute: string;
};

export type OperatorLeaseSigningWorkbench = {
  generatedAt: string;
  metrics: {
    draftLeases: number;
    packetsReady: number;
    envelopesSent: number;
    signaturesCompleted: number;
    signingBlocked: number;
    riskItems: number;
  };
  items: OperatorLeaseSigningItem[];
  riskQueue: unknown;
  sourceLinks: Array<{ label: string; href: string; entityType: string }>;
};

export type OperatorMaintenanceDispatchItem = {
  requestId: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  propertyId: string | null;
  propertyName: string | null;
  unitId: string | null;
  unitLabel: string | null;
  tenantId: string;
  tenantName: string;
  assigneeId: number | null;
  assigneeName: string | null;
  dueAt: string | null;
  responseDueAt: string | null;
  createdAt: string;
  updatedAt: string;
  notesCount: number;
  photosCount: number;
  bidsCount: number;
  latestBid: OperatorMaintenanceBidSummary | null;
  latestDispatch: OperatorMaintenanceBidSummary | null;
  dispatchHistory: OperatorMaintenanceBidSummary[];
  nextAction: 'triage' | 'assign_technician' | 'dispatch_vendor' | 'monitor_vendor' | 'complete' | 'blocked';
  blockers: string[];
  canonicalRoute: string;
};

export type OperatorMaintenanceBidSummary = {
    id: string;
    maintenanceRequestId?: string | null;
    propertyId?: string;
    vendorId?: string | null;
    vendorName: string | null;
    vendorEmail?: string | null;
    scope?: string;
    status: string;
    bidAmountCents: number | null;
    aiScore: number | null;
    dueDate: string | null;
    awardedAt?: string | null;
    responseNotes?: string | null;
    createdAt?: string;
};

export type OperatorMaintenanceDispatchWorkbench = {
  generatedAt: string;
  metrics: {
    openRequests: number;
    emergencyRequests: number;
    unassignedRequests: number;
    vendorReadyRequests: number;
    bidsOpen: number;
    dispatchedRequests: number;
    completedDispatches: number;
    dispatchBlocked: number;
  };
  requests: OperatorMaintenanceDispatchItem[];
  vendors: Array<{
    id: string;
    name: string;
    type: string;
    email: string | null;
    phone: string | null;
    complianceStatus: string;
    verifiedComplianceCount: number;
    expiredComplianceCount: number;
  }>;
  openBids: unknown[];
  sourceLinks: Array<{ label: string; href: string; entityType: string }>;
};

export type OperatorRepairEstimateSummary = {
  id: string;
  inspectionId: number | null;
  maintenanceRequestId: string | null;
  status: string;
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

export type OperatorInspectionEstimateItem = {
  inspectionId: number;
  type: string;
  status: string;
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

export type OperatorInspectionEstimatesWorkbench = {
  generatedAt: string;
  metrics: {
    completedInspections: number;
    inspectionsNeedingEstimate: number;
    draftEstimates: number;
    pendingReviewEstimates: number;
    approvedEstimates: number;
    repairReadyEstimates: number;
  };
  inspections: OperatorInspectionEstimateItem[];
  estimates: OperatorRepairEstimateSummary[];
  sourceLinks: Array<{ label: string; href: string; entityType: string }>;
};

export type OperatorRenewalItem = {
  leaseId: string;
  leaseStatus: string;
  tenantId: string;
  tenantName: string;
  tenantEmail: string | null;
  propertyId: string | null;
  propertyName: string | null;
  unitId: string;
  unitLabel: string | null;
  currentRent: number;
  endDate: string;
  renewalDueAt: string | null;
  moveOutAt: string | null;
  latestOffer: {
    id: number;
    proposedRent: number;
    proposedStart: string;
    proposedEnd: string;
    status: string;
    expiresAt: string | null;
    respondedAt: string | null;
  } | null;
  latestEnvelope: {
    id: number;
    status: string;
    providerStatus: string | null;
    participants: Array<{ id: number; name: string; email: string; status: string }>;
  } | null;
  latestNotice: {
    id: number;
    type: string;
    sentAt: string;
    message: string | null;
  } | null;
  nextAction: 'create_offer' | 'await_response' | 'send_signature' | 'monitor_signature' | 'move_out' | 'complete' | 'blocked';
  blockers: string[];
  canonicalRoute: string;
};

export type OperatorRenewalsWorkbench = {
  generatedAt: string;
  metrics: {
    expiringLeases: number;
    needsOffer: number;
    offersPending: number;
    offersAccepted: number;
    signaturesPending: number;
    moveOutNotices: number;
  };
  leases: OperatorRenewalItem[];
  sourceLinks: Array<{ label: string; href: string; entityType: string }>;
};

export type OperatorOwnerStatementItem = {
  id: string;
  ownerId: string;
  ownerName: string;
  month: string;
  status: string;
  grossIncomeCents: number;
  totalExpensesCents: number;
  managementFeeCents: number;
  netDistributionCents: number;
  approvedAt: string | null;
  sentAt: string | null;
  createdAt: string;
  nextAction: 'generate' | 'review' | 'approve' | 'send' | 'complete' | 'blocked';
  blockers: string[];
  canonicalRoute: string;
};

export type OperatorOwnerStatementsWorkbench = {
  generatedAt: string;
  month: string;
  metrics: {
    statements: number;
    draftStatements: number;
    approvedStatements: number;
    sentStatements: number;
    netDistributionCents: number;
    closeLockedProperties: number;
    closeUnlockedProperties: number;
  };
  statements: OperatorOwnerStatementItem[];
  monthlyClose: unknown;
  paymentExpansionGates: unknown;
  sourceLinks: Array<{ label: string; href: string; entityType: string }>;
};

export type OperatorApplicationDetail = {
  generatedAt: string;
  application: OperatorApplicationItem & {
    decisionNotes: string | null;
    screeningDetails: string | null;
    screeningReasons: unknown;
    applicantId: string | null;
  };
  policyEvaluation: unknown;
  lifecycle: unknown;
  transitions: unknown;
  timeline: unknown[];
  leaseHandoff: OperatorApplicationLeaseHandoff | null;
  sourceLinks: Array<{ label: string; href: string; entityType: string; entityId: string }>;
};

export type AiGatewayCapability = {
  id: string;
  route: string;
  method: 'GET' | 'POST';
  task: string;
  workflowIds: string[];
  description: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  requiresApprovalForExternalAction: boolean;
  persistsDecisionRecord: boolean;
  blockedAutoActions: string[];
  primaryGuardrails: string[];
};

export type AiGatewayCapabilityManifest = {
  mode: 'mock' | 'openai';
  model: string;
  capabilities: AiGatewayCapability[];
};

export type ReadOnlyOperatorData = {
  commandCenter: CommandCenterResponse | null;
  aiCapabilities: AiGatewayCapabilityManifest | null;
  workflows: OperatorWorkflowsResponse | null;
  paymentWorkbench: OperatorPaymentWorkbench | null;
  setup: OperatorSetupSummary | null;
  applications: OperatorApplicationsWorkbench | null;
  leaseSigning: OperatorLeaseSigningWorkbench | null;
  maintenanceDispatch: OperatorMaintenanceDispatchWorkbench | null;
  inspectionEstimates: OperatorInspectionEstimatesWorkbench | null;
  renewals: OperatorRenewalsWorkbench | null;
  ownerStatements: OperatorOwnerStatementsWorkbench | null;
  metrics: DashboardMetrics | null;
  briefing: DailyBriefing | null;
  feed: FeedItem[];
  portfolio: PortfolioResponse;
  approvals: ApprovalTask[];
  errors: Array<{ area: string; message: string; status?: number }>;
};

export const emptyReadOnlyOperatorData: ReadOnlyOperatorData = {
  commandCenter: null,
  aiCapabilities: null,
  workflows: null,
  paymentWorkbench: null,
  setup: null,
  applications: null,
  leaseSigning: null,
  maintenanceDispatch: null,
  inspectionEstimates: null,
  renewals: null,
  ownerStatements: null,
  metrics: null,
  briefing: null,
  feed: [],
  portfolio: { data: [], meta: { page: 1, limit: 50, totalItems: 0, totalPages: 0 } },
  approvals: [],
  errors: [],
};

function captureError(area: string, error: unknown) {
  if (error instanceof OperatorApiError) {
    return { area, message: error.message, status: error.status };
  }

  return {
    area,
    message: error instanceof Error ? error.message : 'Unable to load data.',
  };
}

async function loadArea<T>(
  area: string,
  request: Promise<T>,
): Promise<{ data: T | null; error: ReturnType<typeof captureError> | null }> {
  try {
    return { data: unwrapEnvelope(await request), error: null };
  } catch (error) {
    return { data: null, error: captureError(area, error) };
  }
}

function unwrapEnvelope<T>(payload: T): T {
  if (payload && typeof payload === 'object' && 'data' in payload && 'meta' in payload && 'errors' in payload) {
    return (payload as { data: T }).data;
  }

  return payload;
}

export async function decideApprovalTask(
  taskId: string,
  decision: 'APPROVE' | 'REJECT',
  reason: string,
  options: ApiClientOptions,
): Promise<ApprovalTask> {
  const path = `/api/policy/approval-tasks/${taskId}/decision` as keyof paths & string;
  return unwrapEnvelope(
    await apiRequest<ApprovalTask>('post', path, {
      ...options,
      body: {
        decision,
        ...(reason.trim() ? { reason: reason.trim() } : {}),
      },
    }),
  );
}

export async function loadCommandCenterDecisionDetail(
  decisionId: string,
  options: ApiClientOptions,
): Promise<CommandCenterDecisionDetail> {
  const path = `/api/command-center/decisions/${encodeURIComponent(decisionId)}` as keyof paths & string;
  return unwrapEnvelope(await apiRequest<CommandCenterDecisionDetail>('get', path, options));
}

export async function executeCommandCenterAction(
  decisionId: string,
  actionId: string,
  note: string,
  options: ApiClientOptions,
): Promise<{ approvalTask: ApprovalTask; decision: CommandCenterDecision }> {
  const path = `/api/command-center/decisions/${encodeURIComponent(decisionId)}/actions/${encodeURIComponent(actionId)}` as keyof paths & string;
  return unwrapEnvelope(await apiRequest<{ approvalTask: ApprovalTask; decision: CommandCenterDecision }>('post', path, {
    ...options,
    body: note.trim() ? { note: note.trim() } : {},
  }));
}

export async function deferCommandCenterDecision(
  decisionId: string,
  reason: string,
  options: ApiClientOptions,
): Promise<{ decision: CommandCenterDecision; decisionRecord: unknown }> {
  const path = `/api/command-center/decisions/${encodeURIComponent(decisionId)}/defer` as keyof paths & string;
  return unwrapEnvelope(await apiRequest<{ decision: CommandCenterDecision; decisionRecord: unknown }>('post', path, {
    ...options,
    body: reason.trim() ? { reason: reason.trim() } : {},
  }));
}

export async function loadOperatorApplicationDetail(
  applicationId: number,
  options: ApiClientOptions,
): Promise<OperatorApplicationDetail> {
  const path = `/api/operator-applications/${applicationId}` as keyof paths & string;
  return unwrapEnvelope(await apiRequest<OperatorApplicationDetail>('get', path, options));
}

export async function screenOperatorApplication(
  applicationId: number,
  options: ApiClientOptions,
): Promise<OperatorApplicationItem> {
  const path = `/api/operator-applications/${applicationId}/screen` as keyof paths & string;
  return unwrapEnvelope(await apiRequest<OperatorApplicationItem>('post', path, options));
}

export async function performOperatorApplicationReviewAction(
  applicationId: number,
  input: {
    action: string;
    note?: string;
    reason?: string;
    reasonCode?: string;
    scheduledAt?: string;
    responseDeadline?: string;
    conditionalDeposit?: number;
    requiresCosigner?: boolean;
  },
  options: ApiClientOptions,
): Promise<OperatorApplicationItem> {
  const path = `/api/operator-applications/${applicationId}/review-action` as keyof paths & string;
  return unwrapEnvelope(await apiRequest<OperatorApplicationItem>('post', path, {
    ...options,
    body: input,
  }));
}

export async function convertOperatorApplicationToLease(
  applicationId: number,
  input: {
    startDate: string;
    endDate: string;
    rentAmount?: number;
    depositAmount?: number;
    moveInAt?: string;
    noticePeriodDays?: number;
  },
  options: ApiClientOptions,
): Promise<{ id: string; status?: string }> {
  const path = `/api/operator-applications/${applicationId}/convert-to-lease` as keyof paths & string;
  return unwrapEnvelope(await apiRequest<{ id: string; status?: string }>('post', path, {
    ...options,
    body: input,
  }));
}

export async function generateLeaseSigningPacket(
  leaseId: string,
  options: ApiClientOptions,
): Promise<unknown> {
  const path = `/api/operator-lease-signing/leases/${leaseId}/generate-packet` as keyof paths & string;
  return unwrapEnvelope(await apiRequest<unknown>('post', path, options));
}

export async function sendLeaseSigningEnvelope(
  leaseId: string,
  input: { templateId?: string; message?: string; signerEmail?: string; signerName?: string; provider?: string },
  options: ApiClientOptions,
): Promise<unknown> {
  const path = `/api/operator-lease-signing/leases/${leaseId}/send-envelope` as keyof paths & string;
  return unwrapEnvelope(await apiRequest<unknown>('post', path, {
    ...options,
    body: input,
  }));
}

export async function refreshLeaseSigningEnvelope(
  envelopeId: number,
  options: ApiClientOptions,
): Promise<unknown> {
  const path = `/api/operator-lease-signing/envelopes/${envelopeId}/refresh` as keyof paths & string;
  return unwrapEnvelope(await apiRequest<unknown>('post', path, options));
}

export async function resendLeaseSigningEnvelope(
  envelopeId: number,
  options: ApiClientOptions,
): Promise<unknown> {
  const path = `/api/operator-lease-signing/envelopes/${envelopeId}/resend` as keyof paths & string;
  return unwrapEnvelope(await apiRequest<unknown>('post', path, options));
}

export async function dispatchMaintenanceVendor(
  requestId: string,
  input: { vendorId: string; notes?: string; notifyTenant?: boolean; tenantMessage?: string },
  options: ApiClientOptions,
): Promise<unknown> {
  const path = `/api/operator-maintenance-dispatch/requests/${requestId}/dispatch-vendor` as keyof paths & string;
  return unwrapEnvelope(await apiRequest<unknown>('post', path, {
    ...options,
    body: input,
  }));
}

export async function requestMaintenanceVendorBid(
  requestId: string,
  input: { vendorId?: string; vendorName?: string; vendorEmail?: string; scope?: string; bidAmountCents?: number; dueDate?: string },
  options: ApiClientOptions,
): Promise<unknown> {
  const path = `/api/operator-maintenance-dispatch/requests/${requestId}/bids` as keyof paths & string;
  return unwrapEnvelope(await apiRequest<unknown>('post', path, {
    ...options,
    body: input,
  }));
}

export async function awardMaintenanceVendorBid(
  bidId: string,
  input: { note?: string; notifyTenant?: boolean; tenantMessage?: string },
  options: ApiClientOptions,
): Promise<unknown> {
  const path = `/api/operator-maintenance-dispatch/bids/${bidId}/award` as keyof paths & string;
  return unwrapEnvelope(await apiRequest<unknown>('patch', path, {
    ...options,
    body: input,
  }));
}

export async function completeMaintenanceVendorDispatch(
  bidId: string,
  input: { note?: string; completeRequest?: boolean },
  options: ApiClientOptions,
): Promise<unknown> {
  const path = `/api/operator-maintenance-dispatch/bids/${bidId}/complete` as keyof paths & string;
  return unwrapEnvelope(await apiRequest<unknown>('patch', path, {
    ...options,
    body: input,
  }));
}

export async function rejectMaintenanceVendorBid(
  bidId: string,
  input: { reason?: string },
  options: ApiClientOptions,
): Promise<unknown> {
  const path = `/api/operator-maintenance-dispatch/bids/${bidId}/reject` as keyof paths & string;
  return unwrapEnvelope(await apiRequest<unknown>('patch', path, {
    ...options,
    body: input,
  }));
}

export async function generateInspectionRepairEstimate(
  inspectionId: number,
  options: ApiClientOptions,
): Promise<unknown> {
  const path = `/api/operator-inspection-estimates/inspections/${inspectionId}/generate-estimate` as keyof paths & string;
  return unwrapEnvelope(await apiRequest<unknown>('post', path, options));
}

export async function approveInspectionRepairEstimate(
  estimateId: string,
  options: ApiClientOptions,
): Promise<unknown> {
  const path = `/api/operator-inspection-estimates/estimates/${estimateId}/approve` as keyof paths & string;
  return unwrapEnvelope(await apiRequest<unknown>('patch', path, options));
}

export async function rejectInspectionRepairEstimate(
  estimateId: string,
  reason: string,
  options: ApiClientOptions,
): Promise<unknown> {
  const path = `/api/operator-inspection-estimates/estimates/${estimateId}/reject` as keyof paths & string;
  return unwrapEnvelope(await apiRequest<unknown>('patch', path, {
    ...options,
    body: reason.trim() ? { reason: reason.trim() } : {},
  }));
}

export async function createRepairRequestFromEstimate(
  estimateId: string,
  input: { title?: string; description?: string; priority?: string; dueDate?: string },
  options: ApiClientOptions,
): Promise<unknown> {
  const path = `/api/operator-inspection-estimates/estimates/${estimateId}/create-repair-request` as keyof paths & string;
  return unwrapEnvelope(await apiRequest<unknown>('post', path, {
    ...options,
    body: input,
  }));
}

export async function createOperatorRenewalOffer(
  leaseId: string,
  input: { proposedRent?: number; proposedStart?: string; proposedEnd?: string; escalationPercent?: number; message?: string; expiresAt?: string },
  options: ApiClientOptions,
): Promise<unknown> {
  const path = `/api/operator-renewals/leases/${leaseId}/offers` as keyof paths & string;
  return unwrapEnvelope(await apiRequest<unknown>('post', path, { ...options, body: input }));
}

export async function recordOperatorRenewalResponse(
  leaseId: string,
  offerId: number,
  input: { decision: 'ACCEPTED' | 'DECLINED'; message?: string },
  options: ApiClientOptions,
): Promise<unknown> {
  const path = `/api/operator-renewals/leases/${leaseId}/offers/${offerId}/response` as keyof paths & string;
  return unwrapEnvelope(await apiRequest<unknown>('post', path, { ...options, body: input }));
}

export async function sendOperatorRenewalSignature(
  leaseId: string,
  input: { templateId?: string; message?: string; signerEmail?: string; signerName?: string },
  options: ApiClientOptions,
): Promise<unknown> {
  const path = `/api/operator-renewals/leases/${leaseId}/signature` as keyof paths & string;
  return unwrapEnvelope(await apiRequest<unknown>('post', path, { ...options, body: input }));
}

export async function refreshOperatorRenewalEnvelope(
  envelopeId: number,
  options: ApiClientOptions,
): Promise<unknown> {
  const path = `/api/operator-renewals/envelopes/${envelopeId}/refresh` as keyof paths & string;
  return unwrapEnvelope(await apiRequest<unknown>('patch', path, options));
}

export async function recordOperatorRenewalMoveOut(
  leaseId: string,
  input: { moveOutAt: string; message?: string; deliveryMethod?: string },
  options: ApiClientOptions,
): Promise<unknown> {
  const path = `/api/operator-renewals/leases/${leaseId}/move-out` as keyof paths & string;
  return unwrapEnvelope(await apiRequest<unknown>('post', path, { ...options, body: input }));
}

export async function generateOperatorOwnerStatements(
  month: string,
  options: ApiClientOptions,
): Promise<unknown> {
  return unwrapEnvelope(await apiRequest<unknown>('post', '/api/operator-owner-statements/generate', {
    ...options,
    body: { month },
  }));
}

export async function approveOperatorOwnerStatement(
  statementId: string,
  options: ApiClientOptions,
): Promise<unknown> {
  const path = `/api/operator-owner-statements/${statementId}/approve` as keyof paths & string;
  return unwrapEnvelope(await apiRequest<unknown>('patch', path, options));
}

export async function sendOperatorOwnerStatement(
  statementId: string,
  options: ApiClientOptions,
): Promise<unknown> {
  const path = `/api/operator-owner-statements/${statementId}/send` as keyof paths & string;
  return unwrapEnvelope(await apiRequest<unknown>('patch', path, options));
}

export async function loadReadOnlyOperatorData(options: ApiClientOptions): Promise<ReadOnlyOperatorData> {
  const [commandCenter, aiCapabilities, workflows, paymentWorkbench, setup, applications, leaseSigning, maintenanceDispatch, inspectionEstimates, renewals, ownerStatements, metrics, briefing, feed, portfolio, approvals] = await Promise.all([
    loadArea('command center', apiRequest<CommandCenterResponse>('get', '/api/command-center', options)),
    loadArea('AI capabilities', apiRequest<AiGatewayCapabilityManifest>('get', '/api/ai-gateway/capabilities', options)),
    loadArea('operator workflows', apiRequest<OperatorWorkflowsResponse>('get', '/api/operator-workflows', options)),
    loadArea('payment workbench', apiRequest<OperatorPaymentWorkbench>('get', '/api/operator-payments', options)),
    loadArea('property setup', apiRequest<OperatorSetupSummary>('get', '/api/operator-setup', options)),
    loadArea('application workbench', apiRequest<OperatorApplicationsWorkbench>('get', '/api/operator-applications', options)),
    loadArea('lease signing', apiRequest<OperatorLeaseSigningWorkbench>('get', '/api/operator-lease-signing', options)),
    loadArea('maintenance dispatch', apiRequest<OperatorMaintenanceDispatchWorkbench>('get', '/api/operator-maintenance-dispatch', options)),
    loadArea('inspection estimates', apiRequest<OperatorInspectionEstimatesWorkbench>('get', '/api/operator-inspection-estimates', options)),
    loadArea('renewals', apiRequest<OperatorRenewalsWorkbench>('get', '/api/operator-renewals', options)),
    loadArea('owner statements', apiRequest<OperatorOwnerStatementsWorkbench>('get', '/api/operator-owner-statements', options)),
    loadArea('dashboard metrics', apiRequest<DashboardMetrics>('get', '/api/dashboard/metrics', options)),
    loadArea('daily briefing', apiRequest<DailyBriefing>('get', '/api/briefing/daily', options)),
    loadArea('decision feed', apiRequest<{ items?: FeedItem[] }>('get', '/api/feed', { ...options, query: { limit: 12 } })),
    loadArea('portfolio', apiRequest<PortfolioResponse>('get', '/api/properties', { ...options, query: { page: 1, limit: 50 } })),
    loadArea('approval tasks', apiRequest<ApprovalTask[] | { data?: ApprovalTask[] }>('get', '/api/policy/approval-tasks/pending', options)),
  ]);

  const approvalPayload = approvals.data;
  const approvalData = Array.isArray(approvalPayload) ? approvalPayload : approvalPayload?.data ?? [];

  return {
    commandCenter: commandCenter.data,
    aiCapabilities: aiCapabilities.data,
    workflows: workflows.data,
    paymentWorkbench: paymentWorkbench.data,
    setup: setup.data,
    applications: applications.data,
    leaseSigning: leaseSigning.data,
    maintenanceDispatch: maintenanceDispatch.data,
    inspectionEstimates: inspectionEstimates.data,
    renewals: renewals.data,
    ownerStatements: ownerStatements.data,
    metrics: metrics.data,
    briefing: commandCenter.data?.dailyBriefing ?? briefing.data,
    feed: feed.data?.items ?? [],
    portfolio: portfolio.data ?? emptyReadOnlyOperatorData.portfolio,
    approvals: commandCenter.data?.approvals ?? approvalData,
    errors: [commandCenter.error, aiCapabilities.error, workflows.error, paymentWorkbench.error, setup.error, applications.error, leaseSigning.error, maintenanceDispatch.error, renewals.error, ownerStatements.error, metrics.error, briefing.error, feed.error, portfolio.error, approvals.error].filter((error) => error !== null),
  };
}

export async function createSetupProperty(
  input: { name: string; address: string; city?: string; state?: string; zipCode?: string; propertyType?: string },
  options: ApiClientOptions,
): Promise<PortfolioProperty> {
  return unwrapEnvelope(await apiRequest<PortfolioProperty>('post', '/api/operator-setup/properties', {
    ...options,
    body: input,
  }));
}

export async function createSetupUnit(
  propertyId: string,
  input: { name: string; unitNumber?: string; bedrooms?: number; bathrooms?: number; squareFeet?: number; status?: string },
  options: ApiClientOptions,
): Promise<PropertyUnit> {
  const path = `/api/operator-setup/properties/${propertyId}/units` as keyof paths & string;
  return unwrapEnvelope(await apiRequest<PropertyUnit>('post', path, {
    ...options,
    body: input,
  }));
}
