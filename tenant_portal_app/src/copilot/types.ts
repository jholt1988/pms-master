export type Severity = 'critical' | 'high' | 'medium' | 'low';
export type Domain = 'payments' | 'leasing' | 'screening' | 'repairs' | 'renewals' | 'financials';
export type Urgency = 'immediate' | 'today' | 'this_week';

export interface Signal {
  id: string;
  severity: Severity;
  domain: Domain;
  title: string;
  summary: string;
  monetaryImpact?: number;
  actionUrl: string;
  actionLabel: string;
  createdAt: string;
}

export interface Decision {
  id: string;
  domain: Domain;
  entityType: string;
  entityId: string;
  title: string;
  context: string;
  aiRecommendation?: string;
  actions: DecisionAction[];
  urgency: Urgency;
}

export interface DecisionAction {
  label: string;
  endpoint: string;
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: Record<string, unknown>;
  variant: 'primary' | 'danger' | 'neutral';
  confirmRequired?: boolean;
}

export interface ScheduledEvent {
  id: string;
  type: 'tour' | 'move_in' | 'move_out' | 'inspection' | 'maintenance' | 'lease_expiration' | 'signing';
  title: string;
  scheduledAt: string;
  propertyName: string;
  unitName?: string;
}

export interface BriefingData {
  signals: Signal[];
  decisions: Decision[];
  events: ScheduledEvent[];
  metrics: {
    atRiskAmount: number;
    pendingDecisions: number;
    todayEvents: number;
    vacantUnits: number;
    overduePayments: number;
  };
}

export interface PolicyCriterion {
  rule: 'credit_score' | 'eviction_history' | 'income_ratio';
  passed: boolean;
  actual: string;
  threshold: string;
  explanation: string;
}

export interface PolicyEvaluation {
  applicationId: string;
  verdict: 'approve' | 'conditional' | 'deny';
  criteria: PolicyCriterion[];
  conditionalTerms?: { requiredDeposit: number; requiresCosigner: boolean };
  overrideAllowed: boolean;
  confidence: number;
}

export interface IntentChip {
  label: string;
  icon: string;
  domain: Domain;
  route: string;
}

// --- Financials / Bookkeeping Types ---

export type TransactionStatus = 'pending_review' | 'categorized' | 'allocated' | 'reconciled' | 'exception' | 'posted';
export type ReconciliationStatus = 'unmatched' | 'matched' | 'confirmed' | 'exception';
export type MonthlyCloseStep = 'open' | 'reconciling' | 'review' | 'locked' | 'reported';
export type JournalEntryType = 'standard' | 'adjusting' | 'closing' | 'reversing';

export interface FinancialTransaction {
  id: string;
  date: string;
  description: string;
  amountCents: number;
  status: TransactionStatus;
  category?: string;
  categoryConfidence?: number;
  allocations: TransactionAllocation[];
  sourceType: 'bank_import' | 'manual_entry' | 'stripe' | 'invoice' | 'expense';
  sourceId?: string;
  reconciledAt?: string;
  createdAt: string;
}

export interface TransactionAllocation {
  propertyId?: string;
  propertyName?: string;
  unitId?: string;
  unitName?: string;
  leaseId?: string;
  vendorId?: string;
  vendorName?: string;
  ownerId?: string;
  ownerName?: string;
  accountCode: string;
  accountName: string;
  amountCents: number;
}

export interface ReconciliationItem {
  id: string;
  bankTransactionId: string;
  ledgerEntryId?: string;
  bankAmount: number;
  ledgerAmount?: number;
  status: ReconciliationStatus;
  matchConfidence?: number;
  suggestedMatch?: string;
  resolvedAt?: string;
}

export interface MonthlyCloseState {
  propertyId: string;
  propertyName: string;
  month: string;
  step: MonthlyCloseStep;
  unreconciledCount: number;
  exceptionCount: number;
  pendingJournalEntries: number;
  closedAt?: string;
  closedBy?: string;
}

export interface OwnerStatement {
  ownerId: string;
  ownerName: string;
  month: string;
  grossIncome: number;
  totalExpenses: number;
  managementFee: number;
  netDistribution: number;
  propertyBreakdown: {
    propertyId: string;
    propertyName: string;
    income: number;
    expenses: number;
  }[];
  status: 'draft' | 'approved' | 'sent';
}

export interface FinancialsWorkspaceData {
  pendingTransactions: FinancialTransaction[];
  exceptions: FinancialTransaction[];
  reconciliation: {
    unmatchedCount: number;
    matchedCount: number;
    exceptionCount: number;
    items: ReconciliationItem[];
  };
  monthlyClose: MonthlyCloseState[];
  ownerStatements: OwnerStatement[];
  metrics: {
    unreconciledAmount: number;
    pendingCategorization: number;
    exceptionsCount: number;
    monthsOpen: number;
    ownerDistributionsDue: number;
  };
}
