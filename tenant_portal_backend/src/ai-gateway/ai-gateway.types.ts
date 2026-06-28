export type AiGatewayTask =
  | 'MAINTENANCE_CLASSIFICATION'
  | 'COMMUNICATION_DRAFT'
  | 'LEASE_SUMMARY'
  | 'APPLICATION_SUMMARY'
  | 'REPAIR_ESTIMATE'
  | 'BOOKKEEPING_CATEGORIZATION'
  | 'DECISION_RECOMMENDATION';

export type AiGatewayRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export type AiGatewayRequest = {
  task: AiGatewayTask;
  prompt: string;
  context?: Record<string, unknown>;
  entity?: {
    type: string;
    id: string;
    label?: string;
  };
  evidenceRefs?: Array<{ type: string; id: string; label?: string }>;
  riskLevel?: AiGatewayRiskLevel;
  maxTokens?: number;
};

export type AiGatewayResponse = {
  id: string;
  provider: 'mock' | 'openai' | 'anthropic' | 'lightning';
  model: string;
  task: AiGatewayTask;
  content: string;
  structured: Record<string, unknown>;
  confidence: number;
  requiresApproval: boolean;
  evidenceRefs: Array<{ type: string; id: string; label?: string }>;
  audit: {
    recorded: boolean;
    decisionRecordId?: string | null;
  };
};

export type AiEvaluationRequest = {
  task: AiGatewayTask;
  input: AiGatewayRequest;
  output: Pick<AiGatewayResponse, 'content' | 'structured' | 'confidence'>;
};

export type AiEvaluationResponse = {
  passed: boolean;
  score: number;
  checks: Array<{ id: string; passed: boolean; detail?: string }>;
};

export type MaintenanceClassificationRequest = {
  title: string;
  description: string;
  propertyId?: string;
  unitId?: string;
  tenantId?: string;
  source?: 'TENANT_PORTAL' | 'OPERATOR' | 'IMPORT' | 'VOICE';
};

export type MaintenanceClassificationResponse = {
  category: 'PLUMBING' | 'ELECTRICAL' | 'HVAC' | 'APPLIANCE' | 'LOCK_SECURITY' | 'PEST' | 'STRUCTURAL' | 'COSMETIC' | 'GENERAL';
  trade: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  habitabilityRisk: boolean;
  safetyRisk: boolean;
  emergency: boolean;
  suggestedSlaHours: number;
  recommendedAction: string;
  tenantAcknowledgementDraft: string;
  confidence: number;
  requiresApproval: boolean;
  evidence: Array<{ label: string; value: string | number | boolean }>;
  gatewayResponseId: string;
};

export type CommunicationAudience = 'TENANT' | 'APPLICANT' | 'OWNER' | 'VENDOR' | 'INTERNAL';
export type CommunicationChannel = 'EMAIL' | 'SMS' | 'IN_APP';
export type CommunicationPurpose =
  | 'MAINTENANCE_ACK'
  | 'PAYMENT_REMINDER'
  | 'APPLICATION_UPDATE'
  | 'RENEWAL_FOLLOW_UP'
  | 'OWNER_STATEMENT'
  | 'VENDOR_COORDINATION'
  | 'LEGAL_NOTICE'
  | 'ADVERSE_ACTION'
  | 'GENERAL';

export type CommunicationDraftRequest = {
  audience: CommunicationAudience;
  channel?: CommunicationChannel;
  purpose: CommunicationPurpose;
  prompt?: string;
  facts?: string[];
  tone?: 'NEUTRAL' | 'FRIENDLY' | 'FORMAL';
  entity?: {
    type: string;
    id: string;
    label?: string;
  };
  evidenceRefs?: Array<{ type: string; id: string; label?: string }>;
};

export type CommunicationDraftResponse = {
  subject: string;
  body: string;
  smsBody?: string;
  audience: CommunicationAudience;
  channel: CommunicationChannel;
  purpose: CommunicationPurpose;
  riskFlags: string[];
  complianceFlags: string[];
  requiresApproval: boolean;
  blockedAutoSend: boolean;
  recommendedApprovalReason?: string;
  confidence: number;
  gatewayResponseId: string;
};

export type ApplicationReviewSummaryRequest = {
  applicationId?: string;
  applicantName?: string;
  propertyId?: string;
  unitId?: string;
  monthlyRent?: number;
  monthlyIncome?: number;
  creditScore?: number;
  screeningScore?: number;
  screeningPolicyVersion?: string;
  status?: string;
  screeningReasons?: string[];
  adverseActionReasons?: string[];
  accommodationRequested?: boolean;
  facts?: string[];
  evidenceRefs?: Array<{ type: string; id: string; label?: string }>;
};

export type ApplicationReviewSummaryResponse = {
  summary: string;
  recommendation: 'APPROVE_REVIEW' | 'CONDITIONAL_REVIEW' | 'DENIAL_REVIEW' | 'NEEDS_MORE_INFO';
  recommendedNextAction: string;
  incomeToRentRatio?: number | null;
  objectiveSignals: Array<{ label: string; value: string | number | boolean; severity: 'INFO' | 'WARNING' | 'BLOCKER' }>;
  missingInformation: string[];
  riskFlags: string[];
  complianceFlags: string[];
  requiresApproval: boolean;
  blockedAutoDecision: boolean;
  approvalReason: string;
  confidence: number;
  gatewayResponseId: string;
};

export type LeaseRiskSummaryRequest = {
  leaseId?: string;
  tenantName?: string;
  propertyId?: string;
  unitId?: string;
  jurisdiction?: {
    state?: string;
    county?: string;
    city?: string;
  };
  leaseTemplateVersion?: string;
  startDate?: string;
  endDate?: string;
  monthlyRent?: number;
  securityDeposit?: number;
  petDeposit?: number;
  furnished?: boolean;
  petsAllowed?: boolean;
  renewalDueAt?: string;
  moveOutNoticeDate?: string;
  clauses?: Array<{ name: string; text: string }>;
  facts?: string[];
  evidenceRefs?: Array<{ type: string; id: string; label?: string }>;
};

export type LeaseRiskSummaryResponse = {
  summary: string;
  keyTerms: Array<{ label: string; value: string | number | boolean | null }>;
  riskFlags: string[];
  complianceFlags: string[];
  missingInformation: string[];
  blockedActions: string[];
  recommendedNextAction: string;
  requiresApproval: boolean;
  blockedAutoDecision: boolean;
  approvalReason: string;
  confidence: number;
  gatewayResponseId: string;
};

export type RepairEstimateDraftRequest = {
  source?: 'INSPECTION' | 'MAINTENANCE_REQUEST' | 'OPERATOR';
  inspectionId?: string;
  maintenanceRequestId?: string;
  propertyId?: string;
  unitId?: string;
  location?: string;
  items: Array<{
    location?: string;
    category?: string;
    issueType?: string;
    description: string;
    severity?: 'LOW' | 'MEDIUM' | 'HIGH';
    estimatedAgeYears?: number;
  }>;
  laborRate?: number;
  vendorThreshold?: number;
  facts?: string[];
  evidenceRefs?: Array<{ type: string; id: string; label?: string }>;
};

export type RepairEstimateDraftResponse = {
  summary: string;
  lineItems: Array<{
    location: string;
    description: string;
    trade: string;
    laborHours: number;
    laborCost: number;
    materialCost: number;
    totalCost: number;
    repairOrReplace: 'REPAIR' | 'REPLACE' | 'EVALUATE';
  }>;
  totalLaborHours: number;
  totalLaborCost: number;
  totalMaterialCost: number;
  totalEstimatedCost: number;
  costRange: { low: number; high: number };
  assumptions: string[];
  riskFlags: string[];
  approvalRequired: boolean;
  blockedAutoActions: string[];
  recommendedNextAction: string;
  confidence: number;
  gatewayResponseId: string;
};

export type BookkeepingCategorizationRequest = {
  transactionId?: string;
  date?: string;
  description: string;
  amount: number;
  direction?: 'INFLOW' | 'OUTFLOW';
  merchant?: string;
  propertyId?: string;
  unitId?: string;
  existingCategory?: string;
  chartOfAccounts?: Array<{ code: string; name: string; type: string }>;
  facts?: string[];
  evidenceRefs?: Array<{ type: string; id: string; label?: string }>;
};

export type BookkeepingCategorizationResponse = {
  summary: string;
  suggestedAccount: { code: string; name: string; type: string };
  alternateAccounts: Array<{ code: string; name: string; type: string; reason: string }>;
  allocationSuggestion: Array<{ accountCode: string; percent: number; amount: number }>;
  riskFlags: string[];
  reviewRequired: boolean;
  blockedAutoActions: string[];
  reconciliationHints: string[];
  quickBooksMappingRequired: boolean;
  recommendedNextAction: string;
  confidence: number;
  gatewayResponseId: string;
};

export type DecisionRecommendationRequest = {
  workflowId: string;
  decisionType:
    | 'DELINQUENCY_FOLLOW_UP'
    | 'MAINTENANCE_TRIAGE'
    | 'APPLICATION_REVIEW'
    | 'RENEWAL_REVIEW'
    | 'PAYMENT_EXCEPTION'
    | 'INSPECTION_ACTION'
    | 'ACCOUNTING_REVIEW'
    | 'GENERAL';
  entity: {
    type: string;
    id: string;
    label?: string;
  };
  signal: {
    title: string;
    summary: string;
    priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    dueAt?: string;
    amount?: number;
  };
  options?: Array<{ id: string; label: string; riskLevel?: AiGatewayRiskLevel }>;
  facts?: string[];
  policyFlags?: string[];
  evidenceRefs?: Array<{ type: string; id: string; label?: string }>;
};

export type DecisionRecommendationResponse = {
  recommendation: string;
  recommendedOptionId?: string | null;
  rationale: string[];
  riskFlags: string[];
  approvalBlockers: string[];
  blockedAutoActions: string[];
  requiresApproval: boolean;
  decisionRecordId?: string | null;
  confidence: number;
  gatewayResponseId: string;
};

export type AiGatewayCapability = {
  id: string;
  route: string;
  method: 'GET' | 'POST';
  task: AiGatewayTask | 'CAPABILITY_MANIFEST';
  workflowIds: string[];
  description: string;
  riskLevel: AiGatewayRiskLevel;
  requiresApprovalForExternalAction: boolean;
  persistsDecisionRecord: boolean;
  blockedAutoActions: string[];
  primaryGuardrails: string[];
};

export type AiGatewayCapabilityManifestResponse = {
  mode: 'openai' | 'anthropic' | 'lightning' | 'mock';
  model: string;
  capabilities: AiGatewayCapability[];
};
