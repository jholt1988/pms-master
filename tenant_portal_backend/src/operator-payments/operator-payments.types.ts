export interface OperatorPaymentLedgerAccount {
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
}

export interface OperatorPaymentException {
  id: string;
  description: string;
  amountCents: number;
  status: string;
  reason: string | null;
  sourceType: string;
  sourceId: string | null;
  date: string;
  canonicalRoute: string;
}

export interface OperatorPaymentWorkbench {
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
  ledgerAccounts: OperatorPaymentLedgerAccount[];
  delinquency: unknown;
  exceptions: OperatorPaymentException[];
  reconciliation: unknown;
  paymentExpansionGates: unknown;
}
