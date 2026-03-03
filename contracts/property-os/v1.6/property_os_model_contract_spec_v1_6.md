# Property OS Model Contract Spec (v1.6)

## Change Summary
- **Absorbing milestone thresholds** (monotone 0a→0b→1→2→3) remain unchanged.
- **Canonical clock** remains **`settled_at` only** for ledger extraction and reversal memory.
- Adds **contract-stable, dimension-wide confidence adjustment**: `confidence.reversal_adjustment`.
- Reversals/chargebacks affect **confidence (uncertainty)**, not mean predictions.

## Confidence Module — Reversal/Chargeback Adjustment (Contract-Stable)

### Canonical Clock
- Only `settled_at` is used for reversal timing.

### Continuous Exponential Decay (Half-Life)
For each reversal event *i*:
- `Δ_i` = days since event (`as_of - settled_at_i`, clamped ≥ 0)
- `τ = half_life_days`
- `λ = ln(2) / τ`
- `w_i = exp(-λ * Δ_i)`

Severity:
- `s_i = alpha_count * 1 + alpha_amount * min(amount_ratio_cap, amount_i / E)`

Aggregate:
- `S = Σ_i (w_i * s_i)`
- `disruption_score = 1 - exp(-S)`

### Dimension-Wide Penalties
Let baseline confidence components be `(evidence0, drift0, unit_richness0)`.

- `penalty_evidence = exp(-beta_evidence * disruption_score)`
- `penalty_drift = exp(-beta_drift * disruption_score * sys)` where `sys ∈ [0,1]`
- `penalty_unit_richness = exp(-beta_unit_richness * disruption_score * (1 - h))` where `h = lambda_mix(unit_history_months)`

Apply:
- `evidence = evidence0 * penalty_evidence`
- `drift = drift0 * penalty_drift`
- `unit_richness = unit_richness0 * penalty_unit_richness`
- `overall = clamp(evidence * drift * unit_richness, 0, 1)`

### Required Output Shape
`confidence.reversal_adjustment` MUST exist in every response.
```json
{
  "as_of": "2026-03-15T00:00:00Z",
  "half_life_days": 30.0,
  "disruption_score": 0.37,
  "penalty_evidence": 0.55,
  "penalty_drift": 0.88,
  "penalty_unit_richness": 0.93,
  "applied": true,
  "event_count_considered": 2,
  "amount_ratio_considered": 0.42,
  "sys": 0.2
}
```

### Contract Invariants (MUST)
- `0 ≤ disruption_score ≤ 1`
- `0 < penalty_* ≤ 1`
- `overall == evidence * drift * unit_richness` (post-penalty)
- Adding reversal events cannot decrease `disruption_score`
- With no new reversals, `disruption_score` decays smoothly over time

### Defaults (Node MUST if pack omits)
- `half_life_days = 30.0`
- `alpha_count = 1.0`
- `alpha_amount = 1.0`
- `beta_evidence = 2.0`
- `beta_drift = 1.0`
- `beta_unit_richness = 0.8`
- `sys = 0.2`
- `amount_ratio_cap = 2.0`
