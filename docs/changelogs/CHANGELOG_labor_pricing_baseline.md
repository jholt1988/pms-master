# Labor pricing baseline (city/state + overhead)

## Goal
Make AI bid ranges feel **credible and consistent** by grounding labor rates in a small, maintainable configuration—without pulling in heavy external pricing datasets.

## What changed

### Added pricing module
New folder:
- `tenant_portal_backend/src/inspection/pricing/`

Files:
- `pricing.types.ts`
  - Trade + region key types
  - `LaborPricingConfig` (defaults + regional overrides)
- `labor-pricing.config.ts`
  - Default base labor rate ranges by trade
  - A small set of example city/state overrides
  - `overheadPct` (markup) applied to base labor
- `labor-pricing.service.ts`
  - `getLaborRateForTrade(trade, city, region)` returns:
    - base low/high
    - overhead
    - all-in low/high

### Updated labor tool handler
File:
- `tenant_portal_backend/src/inspection/agents/estimate-tools.ts`

Changes:
- `handleLaborCost()` now uses `getLaborRateForTrade()` (keyed by **City, ST**) and applies complexity multiplier.
- Returns both:
  - `hourly_rate_low/high` and `total_labor_cost_low/high`
  - plus midpoint `hourly_rate` and `total_labor_cost` for backwards compatibility

## Why this improves the product
- Bid ranges stop being purely model-invented; they’re anchored to a consistent baseline.
- Still lightweight: one config file you can tune over time.
- Clean path to a learning loop later: when you record actual paid invoices, you can adjust region overrides.

## Commit
- `fa97226` Add region-based labor pricing config with overhead markup

## Follow-ups
- Feed the tool’s `hourly_rate_low/high` into the AI output more directly (right now the agent schema expects single `labor_rate_per_hour`; we can evolve this carefully).
- Add a small “rate source” line in the UI (e.g., `Wichita, KS plumbing: $X–$Y/hr (incl. 25% overhead)`), but only if it stays unobtrusive.
