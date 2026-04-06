import { RuleContext, RuleResult } from '../rules-engine.types';

const creditRank: Record<string, number> = {
  POOR: 1,
  FAIR: 2,
  GOOD: 3,
  VERY_GOOD: 4,
  EXCELLENT: 5,
};

export function evaluateUnderwriting(ctx: RuleContext): RuleResult {
  const payload = ctx.payload as {
    applicationId: string;
    propertyId: string;
    applicantId?: string;
    unitId?: string;
    incomeToRentRatio: number;
    creditBand: keyof typeof creditRank;
    hasRecentEviction: boolean;
    thinCredit?: boolean;
    recommendedDecision?: 'APPROVE' | 'CONDITIONAL_APPROVE' | 'DENY' | 'WAITLIST';
    scoringModelVersion?: string;
  };

  const p = ctx.policy.underwriting;
  const reasons: string[] = [];

  if (payload.hasRecentEviction) {
    reasons.push('Recent eviction present');
    return {
      ruleName: 'UNDERWRITING_DECISION',
      decision: 'DENY',
      confidence: 0.95,
      reasons,
      requiresApproval: false,
      actions: [],
      stateTransitions: [
        { entityType: 'Application', entityId: payload.applicationId, from: 'AI_SCORED', to: 'DENIED' },
      ],
    };
  }

  if (
    payload.incomeToRentRatio >= p.approveMinITR &&
    creditRank[payload.creditBand] >= creditRank[p.minimumCreditBand]
  ) {
    if (payload.recommendedDecision === 'WAITLIST') {
      reasons.push('Inventory or workflow recommendation requires waitlist despite approval thresholds');
      return {
        ruleName: 'UNDERWRITING_DECISION',
        decision: 'WAITLIST',
        confidence: 0.8,
        reasons,
        requiresApproval: false,
        actions: [],
        stateTransitions: [
          { entityType: 'Application', entityId: payload.applicationId, from: 'AI_SCORED', to: 'WAITLISTED' },
        ],
      };
    }

    reasons.push('Income and credit meet approval thresholds');
    return {
      ruleName: 'UNDERWRITING_DECISION',
      decision: 'APPROVE',
      confidence: 0.88,
      reasons,
      requiresApproval: false,
      actions: [],
      stateTransitions: [
        { entityType: 'Application', entityId: payload.applicationId, from: 'AI_SCORED', to: 'APPROVED' },
      ],
    };
  }

  if (payload.incomeToRentRatio >= p.conditionalMinITR || (p.allowThinCreditConditional && payload.thinCredit)) {
    reasons.push('Conditional approval due to marginal threshold fit');
    return {
      ruleName: 'UNDERWRITING_DECISION',
      decision: 'CONDITIONAL_APPROVE',
      confidence: 0.72,
      reasons,
      requiresApproval: true,
      approvalRequirement: 'MANAGER',
      actions: [],
      stateTransitions: [
        { entityType: 'Application', entityId: payload.applicationId, from: 'AI_SCORED', to: 'UNDER_REVIEW' },
      ],
    };
  }

  reasons.push('Income-to-rent ratio below minimum threshold');
  return {
    ruleName: 'UNDERWRITING_DECISION',
    decision: 'DENY',
    confidence: 0.84,
    reasons,
    requiresApproval: false,
    actions: [
      {
        type: 'GENERATE_DOCUMENT',
        documentType: 'ADVERSE_ACTION_NOTICE',
        templateVersion: ctx.policy.denialCompliance.templateVersion,
        metadata: {
          applicationId: payload.applicationId,
          applicantId: payload.applicantId,
          propertyId: payload.propertyId,
          unitId: payload.unitId,
          scoringModelVersion: payload.scoringModelVersion,
        },
      },
    ],
    stateTransitions: [
      { entityType: 'Application', entityId: payload.applicationId, from: 'AI_SCORED', to: 'DENIED' },
    ],
  };
}
