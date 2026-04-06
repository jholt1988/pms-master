import { RuleContext, RuleResult } from '../rules-engine.types';

export function evaluateLateFee(ctx: RuleContext): RuleResult {
  const payload = ctx.payload as {
    tenantId: string;
    leaseId: string;
    rentChargeId: string;
    ledgerPeriod: string;
    outstandingBalance: number;
    daysLate: number;
    priorLateFeeApplied: boolean;
  };

  const jurisdiction = ctx.policy.jurisdiction;
  const reasons: string[] = [];

  if (payload.outstandingBalance <= 0) {
    reasons.push('No outstanding balance');
    return { ruleName: 'LATE_FEE_EVALUATION', decision: 'NO_ACTION', reasons, requiresApproval: false, actions: [] };
  }

  if (payload.priorLateFeeApplied) {
    reasons.push('Late fee already applied for this charge period');
    return { ruleName: 'LATE_FEE_EVALUATION', decision: 'NO_ACTION', reasons, requiresApproval: false, actions: [] };
  }

  if (payload.daysLate < jurisdiction.gracePeriodDays) {
    reasons.push('Within grace period');
    return { ruleName: 'LATE_FEE_EVALUATION', decision: 'NO_ACTION', reasons, requiresApproval: false, actions: [] };
  }

  reasons.push('Grace period exceeded; compliant late fee applies');
  return {
    ruleName: 'LATE_FEE_EVALUATION',
    decision: 'APPLY_LATE_FEE',
    reasons,
    requiresApproval: false,
    actions: [
      {
        type: 'APPLY_LEDGER_ENTRY',
        tenantId: payload.tenantId,
        amount: jurisdiction.lateFeeAmount,
        entryType: 'CHARGE',
        metadata: {
          leaseId: payload.leaseId,
          rentChargeId: payload.rentChargeId,
          ledgerPeriod: payload.ledgerPeriod,
          sourceId: `late_fee:${payload.rentChargeId}:${payload.ledgerPeriod}`,
          categoryCode: 'late_fee',
          reasonCode: 'late_fee_policy',
          jurisdiction: jurisdiction.code,
          feeType: jurisdiction.lateFeeType,
        },
      },
    ],
    stateTransitions: [
      { entityType: 'TenantLedgerState', entityId: payload.tenantId, to: 'LATE_FEE_APPLIED' },
    ],
  };
}
