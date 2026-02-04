import { LaborPricingConfig } from './pricing.types';

// Intentionally small and maintainable. Start with defaults + allow region overrides.
// NOTE: these are BASE labor rates (no overhead). We apply overheadPct at runtime.
export const laborPricingConfig: LaborPricingConfig = {
  overheadPct: 0.25,

  defaultBaseRates: {
    plumbing: { low: 85, high: 135 },
    electrical: { low: 90, high: 140 },
    hvac: { low: 95, high: 155 },
    carpentry: { low: 70, high: 120 },
    painter: { low: 50, high: 95 },
    flooring: { low: 60, high: 110 },
    locksmith: { low: 75, high: 125 },
    roofing: { low: 75, high: 135 },
    appliances: { low: 70, high: 120 },
    general: { low: 60, high: 100 },
  },

  baseRatesByRegion: {
    // Example region overrides (expand as you gather local data)
    'Wichita, KS': {
      plumbing: { low: 80, high: 125 },
      electrical: { low: 85, high: 130 },
      hvac: { low: 90, high: 145 },
      general: { low: 55, high: 95 },
    },
    'Kansas City, MO': {
      plumbing: { low: 90, high: 145 },
      electrical: { low: 95, high: 150 },
      hvac: { low: 100, high: 165 },
      general: { low: 65, high: 110 },
    },
  },
};
