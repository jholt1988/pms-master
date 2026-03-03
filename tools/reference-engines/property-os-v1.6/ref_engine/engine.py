"""
Property OS Reference Engine (v1.6) — r3
Deterministic evaluator for the model contract.

Also includes hooks to compute observed milestone transitions from a ledger (Module 1).
"""
from __future__ import annotations

import math
import datetime
from typing import Dict, Any, List, Tuple

from .ledger import extract_milestone_transitions

def clamp(x: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, x))

def iso_now() -> str:
    return datetime.datetime.utcnow().replace(tzinfo=datetime.timezone.utc).isoformat()

def gamma_pdf(t: float, k: float, theta: float) -> float:
    if t <= 0.0:
        return 0.0
    return (t ** (k - 1.0)) * math.exp(-t / theta) / (math.gamma(k) * (theta ** k))

def baseline_lambda(t: float, baseline: Dict[str, Any]) -> float:
    lam = 0.0
    for comp in baseline["components"]:
        lam += float(comp["weight"]) * gamma_pdf(t, float(comp["shape_k"]), float(comp["scale_theta"]))
    return lam

def residual_union(residual_plans: List[Dict[str, Any]], r0_auth: float, r0_unauth: float, decay_days: float = 90.0) -> float:
    prod = 1.0
    for p in residual_plans:
        typ = p["type"]
        d = clamp(float(p["days_since_end"]), 0.0, decay_days)
        delta = 1.0 - (d / decay_days)
        r0 = r0_auth if typ == "authorized" else r0_unauth
        r_i = clamp(r0 * delta, 0.0, 1.0)
        prod *= (1.0 - r_i)
    return clamp(1.0 - prod, 0.0, 1.0)

def compute_phi(features: Dict[str, Any], prior_pack: Dict[str, Any]) -> Tuple[float, List[Dict[str, Any]]]:
    beta_u = 1.25
    beta_a = 0.35
    beta_r = 0.90

    u = clamp(float(features["unauthorized_partial_rate_90d"]), 0.0, 1.0)
    a = clamp(float(features["authorized_partial_rate_90d"]), 0.0, 1.0)

    rr = prior_pack["residual_risk_priors"]
    r_comb = residual_union(features.get("residual_plans", []), float(rr["r0_authorized"]), float(rr["r0_unauthorized"]))

    regime = prior_pack["regime"]
    m_regime = max(float(regime["regime_multiplier"]), 1e-9)

    phi = beta_u * u + beta_a * a + beta_r * r_comb + math.log(m_regime)

    drivers = [
        {"factor": "unauthorized_partial_rate_90d", "effect_log_multiplier": beta_u * u, "note": f"beta_u={beta_u}"},
        {"factor": "authorized_partial_rate_90d", "effect_log_multiplier": beta_a * a, "note": f"beta_a={beta_a}"},
        {"factor": "residual_risk_union_90d", "effect_log_multiplier": beta_r * r_comb, "note": f"r_combined={r_comb:.4f}, beta_r={beta_r}"},
        {"factor": f"regime_{regime['regime_state']}", "effect_log_multiplier": math.log(m_regime), "note": f"m_regime={m_regime}"},
    ]
    return phi, drivers

def lambda_mix(n_months: float, k: float = 6.0) -> float:
    n = max(0.0, float(n_months))
    return n / (n + k) if (n + k) > 0 else 0.0


def reversal_adjustment(
    reversal_events: List[Dict[str, Any]],
    expected_rent: float,
    as_of_iso: str,
    half_life_days: float = 30.0,
    alpha_count: float = 1.0,
    alpha_amount: float = 1.0,
    beta_evidence: float = 2.0,
    beta_drift: float = 1.0,
    beta_unit_richness: float = 0.8,
    sys: float = 0.2,
    amount_ratio_cap: float = 2.0,
    unit_history_months: float = 0.0,
) -> Dict[str, Any]:
    """
    v1.6 contract-stable reversal/chargeback confidence adjustment.
    Canonical clock: settled_at only.
    Continuous exponential decay with half-life.
    """
    def _parse_iso(s: str) -> datetime.datetime:
        if s.endswith("Z"):
            s = s[:-1] + "+00:00"
        return datetime.datetime.fromisoformat(s)

    as_of = _parse_iso(as_of_iso)
    E = float(expected_rent) if expected_rent and expected_rent > 0 else 1.0
    lam = math.log(2.0) / max(float(half_life_days), 1e-9)

    S = 0.0
    amt_sum = 0.0
    count = 0

    for ev in (reversal_events or []):
        settled = ev.get("settled_at") or ev.get("settled_at_iso") or ev.get("settledAt")
        if not settled:
            continue
        try:
            t_ev = _parse_iso(str(settled))
        except Exception:
            continue
        # Δ = days since event
        delta = max(0.0, (as_of - t_ev).total_seconds() / 86400.0)
        w = math.exp(-lam * delta)

        amount = float(ev.get("amount", 0.0))
        ratio = min(float(amount_ratio_cap), max(0.0, amount / E))
        s_i = float(alpha_count) * 1.0 + float(alpha_amount) * ratio

        S += w * s_i
        amt_sum += max(0.0, amount)
        count += 1

    disruption = clamp(1.0 - math.exp(-S), 0.0, 1.0)

    h = lambda_mix(unit_history_months, k=6.0)
    pen_e = math.exp(-float(beta_evidence) * disruption)
    pen_d = math.exp(-float(beta_drift) * disruption * clamp(float(sys), 0.0, 1.0))
    pen_u = math.exp(-float(beta_unit_richness) * disruption * (1.0 - clamp(h, 0.0, 1.0)))

    return {
        "as_of": as_of_iso,
        "half_life_days": float(half_life_days),
        "disruption_score": float(disruption),
        "penalty_evidence": float(clamp(pen_e, 1e-12, 1.0)),
        "penalty_drift": float(clamp(pen_d, 1e-12, 1.0)),
        "penalty_unit_richness": float(clamp(pen_u, 1e-12, 1.0)),
        "applied": bool(count > 0),
        "event_count_considered": int(count),
        "amount_ratio_considered": float(min(float(amount_ratio_cap), (amt_sum / E) if E > 0 else 0.0)),
        "sys": float(clamp(float(sys), 0.0, 1.0)),
    }

def confidence_score(n_events_effective: float, drift: float, unit_months: float, data_quality: float) -> Dict[str, float]:
    N0 = 40.0
    D0 = 0.08
    k = 6.0
    evid = 1.0 - math.exp(-max(0.0, n_events_effective) / N0)
    drift_term = math.exp(-max(0.0, drift) / D0)
    unit_term = lambda_mix(unit_months, k=k) * clamp(float(data_quality), 0.0, 1.0)
    overall = clamp((evid ** 1.0) * (drift_term ** 1.0) * (unit_term ** 1.0), 0.0, 1.0)
    return {"overall": overall, "evidence": clamp(evid, 0.0, 1.0), "drift": clamp(drift_term, 0.0, 1.0), "unit_richness": clamp(unit_term, 0.0, 1.0)}

def solve_chain_probs(prior_pack: Dict[str, Any], eta_u: float, phi: float, horizon_day: float, dt: float = 0.01) -> List[float]:
    base = prior_pack["baseline_intensity"]
    kappa = prior_pack["kappa"]
    k_0a0b = float(kappa["kappa_0a0b"])
    k_0b1  = float(kappa["kappa_0b1"])
    k_12   = float(kappa["kappa_12"])
    k_23   = float(kappa["kappa_23"])

    p0a, p0b, p1, p2, p3 = 1.0, 0.0, 0.0, 0.0, 0.0
    t = 0.0
    steps = int(max(1, math.ceil(horizon_day / dt)))

    for i in range(steps):
        t_mid = min(horizon_day, (t + 0.5 * dt))
        lam = baseline_lambda(t_mid, base) * math.exp(eta_u + phi)

        h0a0b = lam * k_0a0b
        h0b1  = lam * k_0b1
        h12   = lam * k_12
        h23   = lam * k_23

        dp0a = -h0a0b * p0a
        dp0b =  h0a0b * p0a - h0b1 * p0b
        dp1  =  h0b1  * p0b - h12  * p1
        dp2  =  h12   * p1  - h23  * p2
        dp3  =  h23   * p2

        p0a += dp0a * dt
        p0b += dp0b * dt
        p1  += dp1  * dt
        p2  += dp2  * dt
        p3  += dp3  * dt

        p0a = clamp(p0a, 0.0, 1.0)
        p0b = clamp(p0b, 0.0, 1.0)
        p1  = clamp(p1, 0.0, 1.0)
        p2  = clamp(p2, 0.0, 1.0)
        p3  = clamp(p3, 0.0, 1.0)

        if (i % 200) == 0:
            s = p0a + p0b + p1 + p2 + p3
            if s > 0:
                p0a, p0b, p1, p2, p3 = [x / s for x in (p0a, p0b, p1, p2, p3)]
        t += dt
        if t >= horizon_day:
            break

    s = p0a + p0b + p1 + p2 + p3
    if s > 0:
        p0a, p0b, p1, p2, p3 = [x / s for x in (p0a, p0b, p1, p2, p3)]
    return [p0a, p0b, p1, p2, p3]

def _bucket_prior_map(bucket_priors: Dict[str, Any]) -> Dict[str, Dict[str, Any]]:
    return {p["bucket"]: p for p in bucket_priors["priors"]}

def compute_es15(expected_rent: float, probs_day15: List[float], prior_pack: Dict[str, Any]) -> Dict[str, float]:
    E = float(expected_rent)
    bp = _bucket_prior_map(prior_pack["bucket_priors"])
    p0a, p0b, p1, p2, _ = probs_day15
    terms = [("0a", p0a), ("0b", p0b), ("1", p1), ("2", p2)]
    es_frac = 0.0
    for b, p in terms:
        cbar = float(bp[b]["c_bar"])
        es_frac += p * (1.0 - cbar)
    es_amt = E * es_frac
    ns15 = clamp(1.0 - (es_amt / E if E > 0 else 0.0), 0.0, 1.0)

    pack_conf = float(prior_pack.get("confidence", {}).get("overall", 0.5))
    band = es_amt * (0.25 * (1.0 - pack_conf))
    return {"expected_shortfall_amount": es_amt, "normalized_ns15": ns15,
            "ci95_low": max(0.0, es_amt - 1.96 * band), "ci95_high": es_amt + 1.96 * band}

def evaluate_unit_cycle(req: Dict[str, Any]) -> Dict[str, Any]:
    prior_pack = req["prior_pack"]
    features = req["features"]
    E = float(req["expected_rent_amount"])

    phi, drivers = compute_phi(features, prior_pack)

    lam_mix = lambda_mix(float(features["unit_history_months"]), k=6.0)
    eta_u = 0.0

    probs_day5 = solve_chain_probs(prior_pack, eta_u=eta_u, phi=phi, horizon_day=5.0, dt=0.01)
    probs_day15 = solve_chain_probs(prior_pack, eta_u=eta_u, phi=phi, horizon_day=15.0, dt=0.01)

    def milestone_fields(probs: List[float]) -> Dict[str, float]:
        p0a, p0b, p1, p2, p3 = probs
        return {
            "p_lt_30": clamp(p0a, 0.0, 1.0),
            "p_ge_70": clamp(p1 + p2 + p3, 0.0, 1.0),
            "p_ge_90": clamp(p2 + p3, 0.0, 1.0),
            "p_eq_100": clamp(p3, 0.0, 1.0),
        }

    n_events = prior_pack["kappa"]["learning_stats"]["n_events"]
    n_eff = float(n_events["0a0b"] + n_events["0b1"] + n_events["12"] + n_events["23"])
    drift = float(prior_pack["regime"]["drift"]["composite_drift"])
    conf0 = confidence_score(n_eff, drift, float(features["unit_history_months"]), float(features["data_quality_score"]))

    
    # v1.6 contract-stable reversal adjustment (dimension-wide; confidence-only)
    ra_events = []
    if "reversals" in features:
        ra_events = features.get("reversals") or []
    elif "chargebacks" in features:
        ra_events = features.get("chargebacks") or []

    ra = reversal_adjustment(
        reversal_events=ra_events,
        expected_rent=E,
        as_of_iso=iso_now(),
        half_life_days=30.0,
        alpha_count=1.0,
        alpha_amount=1.0,
        beta_evidence=2.0,
        beta_drift=1.0,
        beta_unit_richness=0.8,
        sys=0.2,
        amount_ratio_cap=2.0,
        unit_history_months=float(features.get("unit_history_months", 0.0)),
    )

    conf = {
        "evidence": clamp(float(conf0["evidence"]) * ra["penalty_evidence"], 0.0, 1.0),
        "drift": clamp(float(conf0["drift"]) * ra["penalty_drift"], 0.0, 1.0),
        "unit_richness": clamp(float(conf0["unit_richness"]) * ra["penalty_unit_richness"], 0.0, 1.0),
    }
    conf["overall"] = clamp(conf["evidence"] * conf["drift"] * conf["unit_richness"], 0.0, 1.0)
    conf["reversal_adjustment"] = ra

    es15 = compute_es15(E, probs_day15, prior_pack)

    observed = None
    if "ledger" in req and req["ledger"] is not None:
        observed = extract_milestone_transitions(
            ledger_events=req["ledger"]["events"],
            expected_rent_amount=E,
            due_date_iso=req["due_date"],
            cycle_horizon_days=float(req["cycle_horizon_days"]),
        )

    return {
        "model_version": "1.6",
        "unit_id": req["unit_id"],
        "cycle_id": req["cycle_id"],
        "context_id": req["context_id"],
        "context_type": req["context_type"],
        "prior_pack_id": prior_pack["prior_pack_id"],
        "as_of": iso_now(),
        "horizons": {"day_5": milestone_fields(probs_day5), "day_15": milestone_fields(probs_day15)},
        "es15": es15,
        "confidence": conf,
        "explainability": {"lambda_mix": lam_mix, "drivers": drivers},
        "observed_milestones": observed
    }
