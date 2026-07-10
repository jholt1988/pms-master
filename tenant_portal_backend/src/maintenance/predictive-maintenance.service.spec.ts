import { PredictiveMaintenanceService } from './predictive-maintenance.service';

/**
 * Unit tests for the pure, side-effect-free helpers on PredictiveMaintenanceService
 * (risk-summary aggregation #9, escalation detection + weekly digest #11).
 * These need no database.
 */
describe('PredictiveMaintenanceService.buildRiskSummary', () => {
  const snap = (assetId: number, riskLevel: string, category: string, drivers: any[] = []) => ({
    assetId,
    riskLevel,
    category,
    drivers,
  });

  it('uses the latest snapshot per asset and counts by level', () => {
    const rows = [
      snap(1, 'HIGH', 'HVAC'),
      snap(1, 'LOW', 'HVAC'), // older row for asset 1 — must be ignored
      snap(2, 'MEDIUM', 'PLUMBING'),
      snap(3, 'LOW', 'HVAC'),
    ];
    const summary = PredictiveMaintenanceService.buildRiskSummary(rows as any, [] as any);
    expect(summary.totalAssets).toBe(3);
    expect(summary.byLevel).toEqual({ LOW: 1, MEDIUM: 1, HIGH: 1 });
    expect(summary.highRiskCount).toBe(1);
  });

  it('ranks top categories by high-risk count and aggregates top drivers', () => {
    const rows = [
      snap(1, 'HIGH', 'HVAC', [{ code: 'AGING_ASSET' }, { code: 'OUT_OF_WARRANTY' }]),
      snap(2, 'HIGH', 'HVAC', [{ code: 'AGING_ASSET' }]),
      snap(3, 'LOW', 'PLUMBING', [{ code: 'OUT_OF_WARRANTY' }]),
    ];
    const summary = PredictiveMaintenanceService.buildRiskSummary(rows as any, [] as any);
    expect(summary.topCategories[0]).toMatchObject({ category: 'HVAC', high: 2, count: 2 });
    expect(summary.topDrivers[0]).toEqual({ code: 'AGING_ASSET', count: 2 });
  });

  it('computes the 30-day trend delta from prior snapshots', () => {
    const current = [snap(1, 'HIGH', 'HVAC'), snap(2, 'HIGH', 'HVAC')];
    const prior = [snap(1, 'MEDIUM', 'HVAC'), snap(2, 'LOW', 'HVAC')];
    const summary = PredictiveMaintenanceService.buildRiskSummary(current as any, prior as any);
    expect(summary.trend30d).toEqual({ highRiskNow: 2, highRisk30dAgo: 0, delta: 2 });
  });
});

describe('PredictiveMaintenanceService.isEscalationToHigh', () => {
  it('fires only when crossing UP into HIGH from a lower/unscored level', () => {
    expect(PredictiveMaintenanceService.isEscalationToHigh('MEDIUM', 'HIGH')).toBe(true);
    expect(PredictiveMaintenanceService.isEscalationToHigh('LOW', 'HIGH')).toBe(true);
    expect(PredictiveMaintenanceService.isEscalationToHigh(null, 'HIGH')).toBe(true);
    expect(PredictiveMaintenanceService.isEscalationToHigh('HIGH', 'HIGH')).toBe(false); // stays HIGH
    expect(PredictiveMaintenanceService.isEscalationToHigh('HIGH', 'MEDIUM')).toBe(false); // de-escalation
    expect(PredictiveMaintenanceService.isEscalationToHigh('LOW', 'MEDIUM')).toBe(false);
  });
});

describe('PredictiveMaintenanceService.buildWeeklyDigests', () => {
  it('groups HIGH assets per org, counting each asset once (latest row wins)', () => {
    const rows = [
      { assetId: 1, organizationId: 'orgA' },
      { assetId: 1, organizationId: 'orgA' }, // duplicate asset — counted once
      { assetId: 2, organizationId: 'orgA' },
      { assetId: 3, organizationId: 'orgB' },
    ];
    const digests = PredictiveMaintenanceService.buildWeeklyDigests(rows);
    const a = digests.find((d) => d.organizationId === 'orgA');
    const b = digests.find((d) => d.organizationId === 'orgB');
    expect(a?.highRiskAssetCount).toBe(2);
    expect(a?.assetIds.slice().sort()).toEqual([1, 2]);
    expect(b?.highRiskAssetCount).toBe(1);
    expect(digests).toHaveLength(2);
  });
});
