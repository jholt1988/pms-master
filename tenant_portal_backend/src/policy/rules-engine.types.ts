import { PolicyBundle, Decision } from './policy.types';

export interface RuleContext {
  propertyId: string;
  actorId?: string;
  workflowEventId?: string;
  eventType: string;
  timestamp: string;
  payload: Record<string, unknown>;
  policy: PolicyBundle;
}

export type RuleAction =
  | {
      type: 'SEND_NOTIFICATION';
      channels: string[];
      template: string;
      recipientRefs: string[];
      metadata?: Record<string, unknown>;
    }
  | {
      type: 'CREATE_SERVICE_PROOF_REQUIREMENT';
      relatedEntityType: string;
      relatedEntityId: string;
    }
  | {
      type: 'APPLY_LEDGER_ENTRY';
      tenantId: string;
      amount: number;
      entryType: string;
      metadata?: Record<string, unknown>;
    }
  | {
      type: 'CREATE_PAYMENT_PLAN_PROPOSAL';
      tenantId: string;
      installmentCount: number;
      metadata?: Record<string, unknown>;
    }
  | {
      type: 'GENERATE_DOCUMENT';
      documentType: string;
      templateVersion: string;
      metadata?: Record<string, unknown>;
    }
  | {
      type: 'CREATE_ATTORNEY_REFERRAL';
      tenantId: string;
      requiredArtifacts: string[];
      metadata?: Record<string, unknown>;
    }
  | {
      type: 'DISPATCH_AFTER_HOURS_VENDOR';
      requestId: string;
      strategy: string;
      metadata?: Record<string, unknown>;
    };

export interface RuleResult {
  ruleName: string;
  decision: Decision;
  confidence?: number;
  reasons: string[];
  requiresApproval: boolean;
  approvalRequirement?: string;
  actions: RuleAction[];
  stateTransitions?: Array<{
    entityType: string;
    entityId: string;
    from?: string;
    to: string;
  }>;
}

