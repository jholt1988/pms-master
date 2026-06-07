import { BidStatus, MaintenancePriority, Role, Status } from '@prisma/client';

export type OperatorMaintenanceDispatchActor = {
  userId: string;
  username?: string;
  role: Role;
};

export type OperatorMaintenanceDispatchMetrics = {
  openRequests: number;
  emergencyRequests: number;
  unassignedRequests: number;
  vendorReadyRequests: number;
  bidsOpen: number;
  dispatchedRequests: number;
  completedDispatches: number;
  dispatchBlocked: number;
};

export type OperatorMaintenanceDispatchItem = {
  requestId: string;
  title: string;
  description: string;
  status: Status;
  priority: MaintenancePriority;
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
  latestBid: OperatorContractorBidSummary | null;
  latestDispatch: OperatorContractorBidSummary | null;
  dispatchHistory: OperatorContractorBidSummary[];
  nextAction: 'triage' | 'assign_technician' | 'dispatch_vendor' | 'monitor_vendor' | 'complete' | 'blocked';
  blockers: string[];
  canonicalRoute: string;
};

export type OperatorVendorSummary = {
  id: string;
  name: string;
  type: string;
  email: string | null;
  phone: string | null;
  complianceStatus: 'READY' | 'REVIEW' | 'BLOCKED';
  verifiedComplianceCount: number;
  expiredComplianceCount: number;
};

export type OperatorContractorBidSummary = {
  id: string;
  maintenanceRequestId: string | null;
  propertyId: string;
  vendorId: string | null;
  vendorName: string | null;
  vendorEmail: string | null;
  scope: string;
  status: BidStatus;
  bidAmountCents: number | null;
  aiScore: number | null;
  dueDate: string | null;
  awardedAt: string | null;
  responseNotes: string | null;
  createdAt: string;
};

export type OperatorMaintenanceDispatchWorkbench = {
  generatedAt: string;
  metrics: OperatorMaintenanceDispatchMetrics;
  requests: OperatorMaintenanceDispatchItem[];
  vendors: OperatorVendorSummary[];
  openBids: OperatorContractorBidSummary[];
  sourceLinks: Array<{ label: string; href: string; entityType: string }>;
};

export type DispatchVendorPayload = {
  vendorId: string;
  notes?: string;
  notifyTenant?: boolean;
  tenantMessage?: string;
};

export type RequestBidPayload = {
  vendorId?: string;
  vendorName?: string;
  vendorEmail?: string;
  scope?: string;
  bidAmountCents?: number;
  dueDate?: string;
};

export type AwardVendorBidPayload = {
  note?: string;
  notifyTenant?: boolean;
  tenantMessage?: string;
};

export type CompleteVendorDispatchPayload = {
  note?: string;
  completeRequest?: boolean;
};

export type RejectVendorBidPayload = {
  reason?: string;
};
