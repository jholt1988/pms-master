import { DomainEvents } from './domain-events';
import { RuleContext, RuleResult } from './rules-engine.types';
import { evaluateUnderwriting } from './rules/underwriting.rule';
import { evaluateLateFee } from './rules/late-fee.rule';
import { evaluateAttorneyReferral } from './rules/attorney-referral.rule';

export function evaluateEvent(ctx: RuleContext): RuleResult[] {
  switch (ctx.eventType) {
    case DomainEvents.APPLICATION_SCORED:
      return [evaluateUnderwriting(ctx)];
    case DomainEvents.LATE_FEE_CHECK:
      return [evaluateLateFee(ctx)];
    case DomainEvents.ATTORNEY_REFERRAL_CHECK:
      return [evaluateAttorneyReferral(ctx)];
    default:
      return [];
  }
}

