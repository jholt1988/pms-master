export type TradeCategory =
  | 'hvac'
  | 'plumbing'
  | 'electrical'
  | 'flooring'
  | 'locksmith'
  | 'painter'
  | 'carpentry'
  | 'roofing'
  | 'fencing'
  | 'landscaping'
  | 'pest_control'
  | 'foundation'
  | 'general'
  | 'appliances';

export type CityStateKey = `${string}, ${string}`;

export interface LaborRateRange {
  low: number;
  high: number;
}

export interface LaborPricingConfig {
  // Base rates (no overhead) per trade.
  // Region keys are "City, ST".
  baseRatesByRegion: Record<CityStateKey, Partial<Record<TradeCategory, LaborRateRange>>>;

  // Default base rates when region key isn't found.
  defaultBaseRates: Partial<Record<TradeCategory, LaborRateRange>>;

  // Overhead/markup to apply on top of base labor.
  // Example: 0.25 means +25%.
  overheadPct: number;
}

export interface LaborRateResult {
  regionKey: CityStateKey;
  trade: TradeCategory;
  baseLow: number;
  baseHigh: number;
  overheadPct: number;
  allInLow: number;
  allInHigh: number;
}
