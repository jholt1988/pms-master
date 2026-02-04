import { laborPricingConfig } from './labor-pricing.config';
import { CityStateKey, LaborRateResult, TradeCategory } from './pricing.types';

function titleCaseCity(city: string) {
  const trimmed = (city || '').trim();
  if (!trimmed) return 'Unknown';
  // preserve existing capitalization if present; otherwise capitalize words
  if (/[A-Z]/.test(trimmed)) return trimmed;
  return trimmed
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function buildCityStateKey(city?: string | null, stateOrRegion?: string | null): CityStateKey {
  const c = titleCaseCity(city || 'Unknown');
  const s = (stateOrRegion || 'Unknown').trim().toUpperCase();
  return `${c}, ${s}` as CityStateKey;
}

export function getLaborRateForTrade(
  trade: TradeCategory,
  city?: string | null,
  stateOrRegion?: string | null,
): LaborRateResult {
  const regionKey = buildCityStateKey(city, stateOrRegion);

  const regionRates = laborPricingConfig.baseRatesByRegion[regionKey];
  const base = regionRates?.[trade] ?? laborPricingConfig.defaultBaseRates[trade];

  // Reasonable fallback for unknown trades.
  const fallback = laborPricingConfig.defaultBaseRates.general ?? { low: 60, high: 100 };
  const baseLow = base?.low ?? fallback.low;
  const baseHigh = base?.high ?? fallback.high;

  const overheadPct = laborPricingConfig.overheadPct;
  const allInLow = Math.round(baseLow * (1 + overheadPct) * 100) / 100;
  const allInHigh = Math.round(baseHigh * (1 + overheadPct) * 100) / 100;

  return {
    regionKey,
    trade,
    baseLow,
    baseHigh,
    overheadPct,
    allInLow,
    allInHigh,
  };
}
