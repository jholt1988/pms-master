import { OwnerStatementStatus, Role } from '@prisma/client';

export type OperatorOwnerStatementActor = {
  userId: string;
  username?: string;
  role: Role;
};

export type OperatorOwnerStatementMetrics = {
  statements: number;
  draftStatements: number;
  approvedStatements: number;
  sentStatements: number;
  netDistributionCents: number;
  closeLockedProperties: number;
  closeUnlockedProperties: number;
};

export type OperatorOwnerStatementItem = {
  id: string;
  ownerId: string;
  ownerName: string;
  month: string;
  status: OwnerStatementStatus;
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
  metrics: OperatorOwnerStatementMetrics;
  statements: OperatorOwnerStatementItem[];
  monthlyClose: unknown;
  paymentExpansionGates: unknown;
  sourceLinks: Array<{ label: string; href: string; entityType: string }>;
};

export type GenerateOwnerStatementsPayload = {
  month: string;
};
