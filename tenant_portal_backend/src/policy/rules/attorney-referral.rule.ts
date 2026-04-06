import { RuleContext, RuleResult } from '../rules-engine.types';

export function evaluateAttorneyReferral(ctx: RuleContext): RuleResult {
  const payload = ctx.payload as {
    tenantId: string;
    leaseId: string;
    delinquencyCaseId: string;
    noticeId: string;
    noticeType: 'THREE_DAY' | 'FIVE_DAY' | 'CUSTOM';
    attorneyEmail?: string;
    attorneyName?: string;
    summary?: string;
    noticeServed: boolean;
    serviceProofPresent: boolean;
    noticeExpired: boolean;
    unpaidAfterNotice: boolean;
    outstandingBalance: number;
  };

  const reasons: string[] = [];
  const p = ctx.policy.attorneyHandoff;
  const j = ctx.policy.jurisdiction;

  if (!p.enabled) {
    return {
      ruleName: 'ATTORNEY_REFERRAL',
      decision: 'NO_ACTION',
      reasons: ['Attorney handoff disabled'],
      requiresApproval: false,
      actions: [],
    };
  }

  if (!payload.noticeServed) {
    return {
      ruleName: 'ATTORNEY_REFERRAL',
      decision: 'NO_ACTION',
      reasons: ['Required notice not served'],
      requiresApproval: false,
      actions: [],
    };
  }

  if (j.requireServiceProofForEscalation && !payload.serviceProofPresent) {
    return {
      ruleName: 'ATTORNEY_REFERRAL',
      decision: 'NO_ACTION',
      reasons: ['Missing required service proof'],
      requiresApproval: false,
      actions: [],
    };
  }

  if (!payload.noticeExpired) {
    return {
      ruleName: 'ATTORNEY_REFERRAL',
      decision: 'NO_ACTION',
      reasons: ['Required notice period has not expired'],
      requiresApproval: false,
      actions: [],
    };
  }

  if (!payload.unpaidAfterNotice) {
    return {
      ruleName: 'ATTORNEY_REFERRAL',
      decision: 'NO_ACTION',
      reasons: ['Balance resolved after notice'],
      requiresApproval: false,
      actions: [],
    };
  }

  reasons.push('Notice failed; legal escalation allowed');
  return {
    ruleName: 'ATTORNEY_REFERRAL',
    decision: 'REFER_ATTORNEY',
    reasons,
    requiresApproval: true,
    approvalRequirement: 'MANAGER',
    actions: [
      {
        type: 'CREATE_ATTORNEY_REFERRAL',
        tenantId: payload.tenantId,
        requiredArtifacts: p.requiredArtifacts,
        metadata: {
          leaseId: payload.leaseId,
          delinquencyCaseId: payload.delinquencyCaseId,
          noticeId: payload.noticeId,
          noticeType: payload.noticeType,
          attorneyEmail: payload.attorneyEmail,
          attorneyName: payload.attorneyName,
          summary: payload.summary,
          outstandingBalance: payload.outstandingBalance,
          method: p.method,
        },
      },
    ],
    stateTransitions: [
      { entityType: 'DelinquencyState', entityId: payload.tenantId, from: 'NOTICE_ISSUED', to: 'ATTORNEY_REFERRED' },
    ],
  };
}
