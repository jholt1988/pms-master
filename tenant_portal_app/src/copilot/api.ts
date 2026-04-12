import { apiFetch, type ApiOptions } from '../services/apiClient';
import type { BriefingData, PolicyEvaluation } from './types';

const opts = (token: string): ApiOptions => ({ token });

export async function fetchBriefing(token: string): Promise<BriefingData> {
  try {
    return await apiFetch('/briefing/daily', opts(token));
  } catch {
    return buildFallbackBriefing(token);
  }
}

async function buildFallbackBriefing(token: string): Promise<BriefingData> {
  const [delinquency, opsSummary, feedData, schedule] = await Promise.allSettled([
    apiFetch('/payments/delinquency/queue', opts(token)),
    apiFetch('/payments/ops-summary', opts(token)),
    apiFetch('/api/v2/feed', opts(token)),
    apiFetch('/schedule/events', opts(token)),
  ]);

  const signals: BriefingData['signals'] = [];
  const decisions: BriefingData['decisions'] = [];
  const events: BriefingData['events'] = [];
  let atRiskAmount = 0;

  if (delinquency.status === 'fulfilled' && delinquency.value) {
    const q = delinquency.value;
    const buckets = q.buckets || q;
    if (Array.isArray(buckets)) {
      buckets.forEach((b: any) => {
        if (b.items?.length) {
          b.items.forEach((item: any) => {
            const amount = item.outstandingAmount || item.amount || 0;
            atRiskAmount += amount;
            signals.push({
              id: `delinq-${item.leaseId || item.id}`,
              severity: (item.daysOverdue || 0) > 30 ? 'critical' : (item.daysOverdue || 0) > 7 ? 'high' : 'medium',
              domain: 'payments',
              title: `${item.tenantName || 'Tenant'} - $${amount.toLocaleString()} overdue`,
              summary: `${item.daysOverdue || 0} days past due. ${item.noticeStatus || 'No notice sent'}.`,
              monetaryImpact: amount,
              actionUrl: '/payments',
              actionLabel: 'Review Payment',
              createdAt: item.createdAt || new Date().toISOString(),
            });
          });
        }
      });
    }
  }

  if (feedData.status === 'fulfilled' && Array.isArray(feedData.value?.items || feedData.value)) {
    const items = feedData.value?.items || feedData.value || [];
    items.slice(0, 10).forEach((item: any) => {
      if (item.actions?.length) {
        decisions.push({
          id: item.id || `feed-${Math.random().toString(36).slice(2)}`,
          domain: (item.domain || 'payments') as any,
          entityType: item.type || 'unknown',
          entityId: item.entityId || item.id || '',
          title: item.title || 'Action Required',
          context: item.summary || item.description || '',
          aiRecommendation: item.aiRecommendation,
          actions: (item.actions || []).map((a: any) => ({
            label: a.label || a.action || 'Take Action',
            endpoint: a.endpoint || '#',
            method: a.method || 'POST',
            body: a.body,
            variant: a.variant || 'primary',
          })),
          urgency: item.priorityScore > 80 ? 'immediate' : item.priorityScore > 50 ? 'today' : 'this_week',
        });
      }
    });
  }

  if (schedule.status === 'fulfilled' && Array.isArray(schedule.value?.events || schedule.value)) {
    const evts = schedule.value?.events || schedule.value || [];
    const today = new Date().toISOString().split('T')[0];
    evts
      .filter((e: any) => (e.date || e.scheduledAt || '').startsWith(today))
      .slice(0, 8)
      .forEach((e: any) => {
        events.push({
          id: e.id || `evt-${Math.random().toString(36).slice(2)}`,
          type: (e.type || 'maintenance').toLowerCase().replace(/_/g, '_') as any,
          title: e.title || e.type || 'Event',
          scheduledAt: e.date || e.scheduledAt || '',
          propertyName: e.propertyName || e.property?.name || '',
          unitName: e.unitName || e.unit?.name,
        });
      });
  }

  return {
    signals: signals.sort((a, b) => {
      const sev = { critical: 0, high: 1, medium: 2, low: 3 };
      return sev[a.severity] - sev[b.severity];
    }),
    decisions,
    events,
    metrics: {
      atRiskAmount,
      pendingDecisions: decisions.length,
      todayEvents: events.length,
      vacantUnits: 0,
      overduePayments: signals.filter(s => s.domain === 'payments').length,
    },
  };
}

export async function fetchPolicyEvaluation(token: string, applicationId: string): Promise<PolicyEvaluation> {
  try {
    return await apiFetch(`/rental-applications/${applicationId}/policy-evaluation`, opts(token));
  } catch {
    const app = await apiFetch(`/rental-applications/${applicationId}`, opts(token));
    return buildPolicyEvaluationFromApp(app);
  }
}

function buildPolicyEvaluationFromApp(app: any): PolicyEvaluation {
  const criteria: PolicyEvaluation['criteria'] = [];
  const reasons = app.screeningReasons || [];

  const creditPassed = !reasons.some((r: string) => r.toLowerCase().includes('credit'));
  criteria.push({
    rule: 'credit_score',
    passed: creditPassed,
    actual: app.creditScore ? `${app.creditScore}` : 'Unknown',
    threshold: '620',
    explanation: creditPassed ? 'Credit score meets minimum threshold' : 'Credit score below minimum threshold of 620',
  });

  const evictionPassed = !reasons.some((r: string) => r.toLowerCase().includes('eviction'));
  criteria.push({
    rule: 'eviction_history',
    passed: evictionPassed,
    actual: evictionPassed ? 'None found' : 'Recent eviction on record',
    threshold: 'No evictions in past 5 years',
    explanation: evictionPassed ? 'No recent eviction history' : 'Recent eviction found in background check',
  });

  const rent = app.unit?.lease?.rentAmount || app.property?.minRent || 1500;
  const incomeRatio = app.income ? (app.income / rent) : 0;
  const incomePassed = incomeRatio >= 4;
  criteria.push({
    rule: 'income_ratio',
    passed: incomePassed,
    actual: incomeRatio > 0 ? `${incomeRatio.toFixed(1)}x` : 'Unknown',
    threshold: '4.0x monthly rent',
    explanation: incomePassed
      ? `Income-to-rent ratio of ${incomeRatio.toFixed(1)}x meets 4x requirement`
      : `Income-to-rent ratio of ${incomeRatio.toFixed(1)}x below 4x requirement`,
  });

  const failCount = criteria.filter(c => !c.passed).length;
  const verdict: PolicyEvaluation['verdict'] = failCount === 0 ? 'approve' : failCount === 1 ? 'conditional' : 'deny';

  return {
    applicationId: app.id,
    verdict,
    criteria,
    conditionalTerms: verdict === 'conditional'
      ? { requiredDeposit: rent * 2, requiresCosigner: !incomePassed }
      : undefined,
    overrideAllowed: true,
    confidence: app.screeningScore ? app.screeningScore / 100 : 0.75,
  };
}

export async function executeDecisionAction(
  token: string,
  endpoint: string,
  method: string,
  body?: Record<string, unknown>,
) {
  return apiFetch(endpoint, { token, method: method as any, body });
}

export async function fetchPaymentsWorkspace(token: string) {
  const [delinquency, opsSummary, invoices] = await Promise.allSettled([
    apiFetch('/payments/delinquency/queue', opts(token)),
    apiFetch('/payments/ops-summary', opts(token)),
    apiFetch('/payments/invoices', opts(token)),
  ]);
  return {
    delinquency: delinquency.status === 'fulfilled' ? delinquency.value : null,
    opsSummary: opsSummary.status === 'fulfilled' ? opsSummary.value : null,
    invoices: invoices.status === 'fulfilled' ? invoices.value : null,
  };
}

export async function fetchLeasingWorkspace(token: string) {
  const [opsSummary, stats, leads] = await Promise.allSettled([
    apiFetch('/leasing/ops-summary', opts(token)),
    apiFetch('/leasing/statistics', opts(token)),
    apiFetch('/leasing/leads', opts(token)),
  ]);
  return {
    opsSummary: opsSummary.status === 'fulfilled' ? opsSummary.value : null,
    stats: stats.status === 'fulfilled' ? stats.value : null,
    leads: leads.status === 'fulfilled' ? leads.value : null,
  };
}

export async function fetchRepairsWorkspace(token: string) {
  const [requests, estimates, aiMetrics] = await Promise.allSettled([
    apiFetch('/maintenance?sortBy=priority&sortOrder=asc', opts(token)),
    apiFetch('/estimates', opts(token)),
    apiFetch('/maintenance/ai-metrics', opts(token)),
  ]);
  return {
    requests: requests.status === 'fulfilled' ? requests.value : null,
    estimates: estimates.status === 'fulfilled' ? estimates.value : null,
    aiMetrics: aiMetrics.status === 'fulfilled' ? aiMetrics.value : null,
  };
}

export async function fetchRenewalsWorkspace(token: string) {
  const [leases, recommendations] = await Promise.allSettled([
    apiFetch('/leases', opts(token)),
    apiFetch('/rent-recommendations', opts(token)),
  ]);
  return {
    leases: leases.status === 'fulfilled' ? leases.value : null,
    recommendations: recommendations.status === 'fulfilled' ? recommendations.value : null,
  };
}

export async function fetchScreeningWorkspace(token: string) {
  const apps = await apiFetch('/rental-applications', opts(token));
  return { applications: Array.isArray(apps) ? apps : apps?.data || apps?.applications || [] };
}

export async function fetchFinancialsWorkspace(token: string) {
  const [workspace, reconciliation, chartOfAccounts] = await Promise.allSettled([
    apiFetch('/bookkeeping/workspace', opts(token)),
    apiFetch('/bookkeeping/reconciliation', opts(token)),
    apiFetch('/bookkeeping/chart-of-accounts', opts(token)),
  ]);
  return {
    ...(workspace.status === 'fulfilled' ? workspace.value : {
      pendingTransactions: [],
      exceptions: [],
      reconciliation: { unmatchedCount: 0, matchedCount: 0, exceptionCount: 0, items: [] },
      monthlyClose: [],
      ownerStatements: [],
      metrics: { unreconciledAmount: 0, pendingCategorization: 0, exceptionsCount: 0, monthsOpen: 0, ownerDistributionsDue: 0 },
    }),
    reconciliationDetail: reconciliation.status === 'fulfilled' ? reconciliation.value : null,
    chartOfAccounts: chartOfAccounts.status === 'fulfilled' ? chartOfAccounts.value : [],
  };
}
