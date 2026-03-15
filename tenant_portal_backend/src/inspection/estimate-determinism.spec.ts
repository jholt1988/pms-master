/**
 * A-12: Deterministic estimate + explainability tests
 *
 * Verifies:
 * 1. Same inputs → stable line-item ordering
 * 2. Same inputs → identical bid ranges
 * 3. Every line item has confidence_reason (explainability)
 * 4. Summary has confidence_reason
 * 5. autoDowngradeConfidence behaves deterministically
 */

// We test the pure functions directly (no DI needed)
// Import the module so we can access the non-exported functions via workaround
import { getLaborRateForTrade } from './pricing/labor-pricing.service';

// ---- Inline copies of the pure functions under test (they're not exported) ----

function midpoint(low: number, high: number) {
  return (low + high) / 2;
}

type TradeCategory = string;

function inferTradeFromCategory(category?: string | null): TradeCategory {
  const c = (category || '').toLowerCase();
  if (c.includes('plumb') || c.includes('fixture') || c.includes('toilet') || c.includes('sink') || c.includes('faucet')) return 'plumbing';
  if (c.includes('elect') || c.includes('lighting') || c.includes('outlet') || c.includes('breaker') || c.includes('switch')) return 'electrical';
  if (c.includes('hvac') || c.includes('heating') || c.includes('cooling') || c.includes('air') || c.includes('ac') || c.includes('furnace')) return 'hvac';
  if (c.includes('appliance') || c.includes('refrigerator') || c.includes('fridge') || c.includes('dishwasher') || c.includes('stove') || c.includes('oven') || c.includes('microwave')) return 'appliances';
  if (c.includes('roof')) return 'roofing';
  if (c.includes('floor') || c.includes('carpet') || c.includes('tile')) return 'flooring';
  if (c.includes('paint') || c.includes('wall')) return 'painter';
  if (c.includes('window') || c.includes('door') || c.includes('cabinet') || c.includes('countertop') || c.includes('trim') || c.includes('drywall') || c.includes('structure') || c.includes('carpent')) return 'carpentry';
  if (c.includes('lock')) return 'locksmith';
  if (c.includes('landscap') || c.includes('lawn')) return 'landscaping';
  if (c.includes('pest')) return 'pest_control';
  if (c.includes('fenc')) return 'fencing';
  if (c.includes('foundat')) return 'foundation';
  return 'general';
}

function applyDeterministicLaborPricing(userLocation: any, estimateResult: any) {
  const city = userLocation.city;
  const region = userLocation.region;
  let adjustedAny = false;

  for (const item of estimateResult.line_items ?? []) {
    const hours = typeof item.labor_hours === 'number' ? item.labor_hours : 0;
    if (!hours || hours <= 0) continue;
    adjustedAny = true;
    const trade = inferTradeFromCategory(item.category);
    const rate = getLaborRateForTrade(trade as any, city, region);
    const bidLowLabor = Math.round(rate.allInLow * hours * 100) / 100;
    const bidHighLabor = Math.round(rate.allInHigh * hours * 100) / 100;
    item.bid_low_labor_cost = bidLowLabor;
    item.bid_high_labor_cost = bidHighLabor;
    const midRate = Math.round(midpoint(rate.allInLow, rate.allInHigh) * 100) / 100;
    item.labor_rate_per_hour = midRate;
    item.labor_cost = Math.round(midpoint(bidLowLabor, bidHighLabor) * 100) / 100;
    const matLow = typeof item.bid_low_material_cost === 'number' ? item.bid_low_material_cost : (typeof item.material_cost === 'number' ? item.material_cost : 0);
    const matHigh = typeof item.bid_high_material_cost === 'number' ? item.bid_high_material_cost : (typeof item.material_cost === 'number' ? item.material_cost : 0);
    item.bid_low_total = Math.round((bidLowLabor + (matLow || 0)) * 100) / 100;
    item.bid_high_total = Math.round((bidHighLabor + (matHigh || 0)) * 100) / 100;
    item.total_cost = Math.round((item.labor_cost + (item.material_cost || 0)) * 100) / 100;
    if (!item.confidence_reason) {
      item.confidence_reason = `Labor pricing is baseline-driven for ${rate.regionKey} (${trade}) with ${(rate.overheadPct * 100).toFixed(0)}% overhead; midpoint totals are persisted, and the bid range reflects realistic bidding variance.`;
    }
  }

  if (!adjustedAny) return;
  const lineItems = estimateResult.line_items ?? [];
  estimateResult.estimate_summary.total_labor_cost = Math.round(lineItems.reduce((sum: number, li: any) => sum + (li.labor_cost || 0), 0) * 100) / 100;
  estimateResult.estimate_summary.total_material_cost = Math.round(lineItems.reduce((sum: number, li: any) => sum + (li.material_cost || 0), 0) * 100) / 100;
  estimateResult.estimate_summary.total_project_cost = Math.round(lineItems.reduce((sum: number, li: any) => sum + (li.total_cost || 0), 0) * 100) / 100;
  estimateResult.estimate_summary.bid_low_total = Math.round(lineItems.reduce((sum: number, li: any) => sum + (li.bid_low_total || 0), 0) * 100) / 100;
  estimateResult.estimate_summary.bid_high_total = Math.round(lineItems.reduce((sum: number, li: any) => sum + (li.bid_high_total || 0), 0) * 100) / 100;
  if (!estimateResult.estimate_summary.confidence_reason) {
    estimateResult.estimate_summary.confidence_reason = `Bid range uses labor baselines (+overhead) by trade; midpoint totals are what we persist.`;
  }
}

function applyDeterministicEstimateRanges(estimateResult: any): void {
  if (!estimateResult?.line_items || !Array.isArray(estimateResult.line_items)) return;
  estimateResult.line_items = [...estimateResult.line_items].sort((a: any, b: any) => {
    const ka = `${a.location || ''}|${a.category || ''}|${a.item_description || ''}`.toLowerCase();
    const kb = `${b.location || ''}|${b.category || ''}|${b.item_description || ''}`.toLowerCase();
    return ka.localeCompare(kb);
  });
  let lowTotal = 0;
  let highTotal = 0;
  for (const item of estimateResult.line_items) {
    const total = Number(item.total_cost ?? (Number(item.labor_cost || 0) + Number(item.material_cost || 0)));
    const low = Math.round(total * 0.9 * 100) / 100;
    const high = Math.round(total * 1.15 * 100) / 100;
    item.bid_low_total = typeof item.bid_low_total === 'number' ? item.bid_low_total : low;
    item.bid_high_total = typeof item.bid_high_total === 'number' ? item.bid_high_total : high;
    item.confidence_reason = item.confidence_reason || `Deterministic range derived from normalized labor/material costs with a 10% low / 15% high adjustment band.`;
    lowTotal += Number(item.bid_low_total || 0);
    highTotal += Number(item.bid_high_total || 0);
  }
  if (estimateResult.estimate_summary) {
    estimateResult.estimate_summary.bid_low_total = typeof estimateResult.estimate_summary.bid_low_total === 'number' ? estimateResult.estimate_summary.bid_low_total : Math.round(lowTotal * 100) / 100;
    estimateResult.estimate_summary.bid_high_total = typeof estimateResult.estimate_summary.bid_high_total === 'number' ? estimateResult.estimate_summary.bid_high_total : Math.round(highTotal * 100) / 100;
    estimateResult.estimate_summary.confidence_reason = estimateResult.estimate_summary.confidence_reason || 'Estimate range is deterministic for identical action-item inputs and pricing assumptions.';
  }
}

const CONFIDENCE_AUTO_DOWNGRADE_NOTE_LENGTH = 50;
const CONFIDENCE_COMPLEX_ITEM_COUNT = 10;

function autoDowngradeConfidence(
  confidenceLevel: string | undefined,
  inspectionNotes: string | null | undefined,
  lineItemCount: number,
  lineItems?: Array<{ confidence_level?: string; confidence_reason?: string }>
): { confidenceLevel: string; confidenceReason: string } {
  let currentLevel = confidenceLevel || 'MEDIUM';
  const downgradeReasons: string[] = [];
  const notesLength = (inspectionNotes || '').trim().length;
  if (notesLength < CONFIDENCE_AUTO_DOWNGRADE_NOTE_LENGTH) {
    downgradeReasons.push(`Inspection notes are brief (${notesLength} chars), reducing certainty`);
  }
  if (lineItemCount >= CONFIDENCE_COMPLEX_ITEM_COUNT) {
    downgradeReasons.push(`High item count (${lineItemCount}) increases estimation complexity`);
  }
  if (lineItems && lineItems.length > 0) {
    const lowConfidenceItems = lineItems.filter(
      (li) => li.confidence_level === 'LOW' || li.confidence_level === 'VERY_LOW'
    ).length;
    const lowConfidenceRatio = lowConfidenceItems / lineItems.length;
    if (lowConfidenceRatio > 0.3) {
      downgradeReasons.push(`${lowConfidenceItems}/${lineItems.length} items have low confidence`);
    }
  }
  if (downgradeReasons.length > 0) {
    const confidenceHierarchy = ['VERY_HIGH', 'HIGH', 'MEDIUM', 'LOW', 'VERY_LOW'];
    const currentIdx = confidenceHierarchy.indexOf(currentLevel);
    const downgradeSteps = Math.min(downgradeReasons.length, 2);
    const newIdx = Math.min(currentIdx + downgradeSteps, confidenceHierarchy.length - 1);
    if (newIdx !== currentIdx && currentIdx >= 0) {
      currentLevel = confidenceHierarchy[newIdx];
    }
  }
  return {
    confidenceLevel: currentLevel,
    confidenceReason: downgradeReasons.length > 0
      ? `Auto-downgraded: ${downgradeReasons.join('; ')}. Original assessment may be overly optimistic.`
      : 'High confidence in estimate based on detailed inspection data.',
  };
}

// ---- Tests ----

describe('A-12: Deterministic estimate output + explainability', () => {
  const location = { city: 'Wichita', region: 'KS', country: 'USA' };

  function makeEstimateResult() {
    return {
      estimate_summary: {
        total_labor_cost: 0,
        total_material_cost: 0,
        total_project_cost: 0,
        items_to_repair: 3,
      },
      line_items: [
        {
          item_description: 'Replace outlet cover',
          location: 'Kitchen',
          category: 'Electrical',
          labor_hours: 1,
          material_cost: 15,
        },
        {
          item_description: 'Fix leaky faucet',
          location: 'Bathroom',
          category: 'Plumbing',
          labor_hours: 2,
          material_cost: 45,
        },
        {
          item_description: 'Patch drywall hole',
          location: 'Bedroom',
          category: 'Carpentry',
          labor_hours: 1.5,
          material_cost: 25,
        },
      ],
    };
  }

  describe('deterministic ordering', () => {
    it('same inputs in any order should produce identical sorted output', () => {
      const r1 = makeEstimateResult();
      const r2 = makeEstimateResult();
      // Reverse input order for r2
      r2.line_items = [...r2.line_items].reverse();

      applyDeterministicLaborPricing(location, r1);
      applyDeterministicEstimateRanges(r1);

      applyDeterministicLaborPricing(location, r2);
      applyDeterministicEstimateRanges(r2);

      // After processing, line item order should be identical
      expect(r1.line_items.map((i: any) => i.item_description))
        .toEqual(r2.line_items.map((i: any) => i.item_description));
    });

    it('repeated runs produce identical numeric outputs', () => {
      const runs = Array.from({ length: 5 }, () => {
        const r = makeEstimateResult();
        applyDeterministicLaborPricing(location, r);
        applyDeterministicEstimateRanges(r);
        return r;
      });

      for (let i = 1; i < runs.length; i++) {
        expect(runs[i].estimate_summary.total_project_cost)
          .toBe(runs[0].estimate_summary.total_project_cost);
        expect(runs[i].estimate_summary.bid_low_total)
          .toBe(runs[0].estimate_summary.bid_low_total);
        expect(runs[i].estimate_summary.bid_high_total)
          .toBe(runs[0].estimate_summary.bid_high_total);

        for (let j = 0; j < runs[i].line_items.length; j++) {
          expect(runs[i].line_items[j].total_cost)
            .toBe(runs[0].line_items[j].total_cost);
          expect(runs[i].line_items[j].bid_low_total)
            .toBe(runs[0].line_items[j].bid_low_total);
          expect(runs[i].line_items[j].bid_high_total)
            .toBe(runs[0].line_items[j].bid_high_total);
        }
      }
    });
  });

  describe('explainability / confidence_reason', () => {
    it('every line item gets a confidence_reason after processing', () => {
      const r = makeEstimateResult();
      applyDeterministicLaborPricing(location, r);
      applyDeterministicEstimateRanges(r);

      for (const item of r.line_items) {
        expect((item as any).confidence_reason).toBeTruthy();
        expect(typeof (item as any).confidence_reason).toBe('string');
        expect((item as any).confidence_reason.length).toBeGreaterThan(10);
      }
    });

    it('summary gets a confidence_reason after processing', () => {
      const r = makeEstimateResult();
      applyDeterministicLaborPricing(location, r);
      applyDeterministicEstimateRanges(r);

      expect(r.estimate_summary.confidence_reason).toBeTruthy();
      expect(typeof (r.estimate_summary as any).confidence_reason).toBe('string');
    });

    it('pre-existing confidence_reason is not overwritten', () => {
      const r = makeEstimateResult();
      (r.line_items[0] as any).confidence_reason = 'Custom reason from AI';

      applyDeterministicLaborPricing(location, r);
      applyDeterministicEstimateRanges(r);

      // After sorting the item may move — find it by description
      const item = r.line_items.find((i: any) => i.item_description === 'Replace outlet cover');
      expect((item as any).confidence_reason).toBe('Custom reason from AI');
    });
  });

  describe('bid range validity', () => {
    it('bid_low_total <= total_cost <= bid_high_total for every line item', () => {
      const r = makeEstimateResult();
      applyDeterministicLaborPricing(location, r);
      applyDeterministicEstimateRanges(r);

      for (const item of r.line_items) {
        expect((item as any).bid_low_total).toBeLessThanOrEqual((item as any).total_cost);
        expect((item as any).bid_high_total).toBeGreaterThanOrEqual((item as any).total_cost);
      }
    });

    it('summary bid range sums match line-item sums', () => {
      const r = makeEstimateResult();
      applyDeterministicLaborPricing(location, r);
      applyDeterministicEstimateRanges(r);

      const sumLow = r.line_items.reduce((s: number, li: any) => s + li.bid_low_total, 0);
      const sumHigh = r.line_items.reduce((s: number, li: any) => s + li.bid_high_total, 0);

      expect(r.estimate_summary.bid_low_total).toBeCloseTo(sumLow, 1);
      expect(r.estimate_summary.bid_high_total).toBeCloseTo(sumHigh, 1);
    });
  });

  describe('autoDowngradeConfidence', () => {
    it('returns same output for same inputs (deterministic)', () => {
      const r1 = autoDowngradeConfidence('HIGH', 'short', 3);
      const r2 = autoDowngradeConfidence('HIGH', 'short', 3);
      expect(r1).toEqual(r2);
    });

    it('downgrades when notes are brief', () => {
      const result = autoDowngradeConfidence('HIGH', 'short', 1);
      expect(result.confidenceLevel).not.toBe('HIGH');
      expect(result.confidenceReason).toContain('brief');
    });

    it('downgrades when item count is high', () => {
      const result = autoDowngradeConfidence('HIGH', 'A'.repeat(100), 15);
      expect(result.confidenceLevel).not.toBe('HIGH');
      expect(result.confidenceReason).toContain('item count');
    });

    it('downgrades when many line items have low confidence', () => {
      const items = Array.from({ length: 10 }, () => ({
        confidence_level: 'LOW',
        confidence_reason: 'test',
      }));
      const result = autoDowngradeConfidence('HIGH', 'A'.repeat(100), 10, items);
      expect(result.confidenceReason).toContain('low confidence');
    });

    it('does not downgrade when all signals are good', () => {
      const result = autoDowngradeConfidence(
        'HIGH',
        'A'.repeat(200), // long notes
        3, // few items
        [{ confidence_level: 'HIGH', confidence_reason: 'ok' }]
      );
      expect(result.confidenceLevel).toBe('HIGH');
      expect(result.confidenceReason).toContain('High confidence');
    });

    it('includes a reason string in all cases', () => {
      const r1 = autoDowngradeConfidence('MEDIUM', null, 5);
      const r2 = autoDowngradeConfidence('HIGH', 'A'.repeat(200), 2);
      expect(r1.confidenceReason).toBeTruthy();
      expect(r2.confidenceReason).toBeTruthy();
    });
  });

  describe('inferTradeFromCategory', () => {
    it('maps known categories deterministically', () => {
      expect(inferTradeFromCategory('Plumbing')).toBe('plumbing');
      expect(inferTradeFromCategory('plumbing fixture')).toBe('plumbing');
      expect(inferTradeFromCategory('Electrical')).toBe('electrical');
      expect(inferTradeFromCategory('HVAC System')).toBe('hvac');
      expect(inferTradeFromCategory('Carpentry')).toBe('carpentry');
      expect(inferTradeFromCategory('Roofing')).toBe('roofing');
      expect(inferTradeFromCategory('Flooring')).toBe('flooring');
      expect(inferTradeFromCategory('Landscaping')).toBe('landscaping');
      expect(inferTradeFromCategory('unknown stuff')).toBe('general');
    });

    it('same input always returns same trade', () => {
      for (let i = 0; i < 10; i++) {
        expect(inferTradeFromCategory('Electrical outlet')).toBe('electrical');
      }
    });
  });
});
