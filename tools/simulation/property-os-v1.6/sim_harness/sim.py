"""
Ledger end-to-end simulation harness for Property OS v1.5.1.
No external deps.
"""
from __future__ import annotations
import math, random, json, datetime
from typing import Dict, Any, List, Optional

def _load_module(path: str, name: str):
    import importlib.util
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)  # type: ignore
    return mod

def clamp(x: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, x))

def gamma_pdf(t: float, k: float, theta: float) -> float:
    if t <= 0.0:
        return 0.0
    return (t ** (k - 1.0)) * math.exp(-t / theta) / (math.gamma(k) * (theta ** k))

def baseline_lambda(t: float, baseline: Dict[str, Any]) -> float:
    return sum(float(c["weight"]) * gamma_pdf(t, float(c["shape_k"]), float(c["scale_theta"])) for c in baseline["components"])

def simulate_chain_transitions(prior_pack: Dict[str, Any], eta: float, phi: float, horizon: float, dt: float = 0.01) -> Dict[str, Optional[float]]:
    base = prior_pack["baseline_intensity"]
    kappa = prior_pack["kappa"]
    ks = {"0a0b": float(kappa["kappa_0a0b"]), "0b1": float(kappa["kappa_0b1"]), "12": float(kappa["kappa_12"]), "23": float(kappa["kappa_23"])}

    state = "0a"
    trans: Dict[str, Optional[float]] = {"0a0b": None, "0b1": None, "12": None, "23": None}
    t = 0.0
    steps = int(max(1, math.ceil(horizon / dt)))
    for _ in range(steps):
        t_mid = min(horizon, t + 0.5*dt)
        lam = baseline_lambda(t_mid, base) * math.exp(eta + phi)
        if state == "0a":
            p = 1.0 - math.exp(-(lam * ks["0a0b"]) * dt)
            if random.random() < p: state="0b"; trans["0a0b"]=t_mid
        elif state == "0b":
            p = 1.0 - math.exp(-(lam * ks["0b1"]) * dt)
            if random.random() < p: state="1"; trans["0b1"]=t_mid
        elif state == "1":
            p = 1.0 - math.exp(-(lam * ks["12"]) * dt)
            if random.random() < p: state="2"; trans["12"]=t_mid
        elif state == "2":
            p = 1.0 - math.exp(-(lam * ks["23"]) * dt)
            if random.random() < p: state="3"; trans["23"]=t_mid
        t += dt
        if t >= horizon: break
    return trans

def _iso_add_days(due_iso: str, days: float) -> str:
    s = due_iso[:-1] + "+00:00" if due_iso.endswith("Z") else due_iso
    due = datetime.datetime.fromisoformat(s)
    ts = due + datetime.timedelta(seconds=days*86400.0)
    return ts.replace(tzinfo=datetime.timezone.utc).isoformat().replace("+00:00","Z")

def build_ledger_from_transitions(due_iso: str, E: float, trans: Dict[str, Optional[float]]) -> Dict[str, Any]:
    events = []
    cum = 0.0
    eid = 0
    milestones = [("0.3", 0.30, trans["0a0b"]), ("0.7", 0.70, trans["0b1"]), ("0.9", 0.90, trans["12"]), ("1.0", 1.00, trans["23"])]
    for key, tau, t_cross in milestones:
        if t_cross is None: break
        target = tau * E
        needed = max(0.0, target - cum)
        if needed <= 1e-6: continue
        parts = random.randint(1, 3)
        weights = [random.random() for _ in range(parts)]
        s = sum(weights); weights=[w/s for w in weights]
        for w in weights:
            amt = round(needed*w, 2)
            jitter = random.uniform(-0.6, -0.05)
            t_pay = max(0.0, t_cross + jitter + random.uniform(-0.05, 0.05))
            eid += 1
            events.append({"event_id": f"r{eid}", "settled_at": _iso_add_days(due_iso, t_pay), "amount": float(amt),
                           "currency":"USD","category":"rent","applied_to":"rent_balance","is_settled":True,"is_reversal":False})
        cum = target

    if trans["23"] is not None and random.random() < 0.15:
        eid += 1
        events.append({"event_id": f"r{eid}", "settled_at": _iso_add_days(due_iso, trans["23"] + random.uniform(0.2, 2.0)),
                       "amount": float(round(random.uniform(1.0, 15.0), 2)),
                       "currency":"USD","category":"rent","applied_to":"rent_balance","is_settled":True,"is_reversal":False})

    if random.random() < 0.35:
        eid += 1
        events.append({"event_id": f"f{eid}", "settled_at": _iso_add_days(due_iso, random.uniform(0.5, 10.0)),
                       "amount": float(round(random.uniform(10, 75), 2)),
                       "currency":"USD","category":"fee","applied_to":"fees","is_settled":True,"is_reversal":False})

    def parse_iso(s: str) -> datetime.datetime:
        if s.endswith("Z"): s=s[:-1] + "+00:00"
        return datetime.datetime.fromisoformat(s)
    events.sort(key=lambda e: parse_iso(e["settled_at"]))
    return {"events": events}

def brier(p: float, y: float) -> float:
    return (p-y)**2

def calibration_bins(preds: List[float], ys: List[float], n_bins: int = 10) -> List[Dict[str, float]]:
    pairs = sorted(zip(preds, ys), key=lambda x: x[0])
    if not pairs: return []
    bin_size = max(1, len(pairs)//n_bins)
    out=[]
    for i in range(0, len(pairs), bin_size):
        chunk = pairs[i:i+bin_size]
        ps=[p for p,_ in chunk]; ys_=[y for _,y in chunk]
        out.append({"p_mean": sum(ps)/len(ps), "y_mean": sum(ys_)/len(ys_), "n": len(chunk)})
    return out

def run_sim(n: int, seed: int, sample_request_path: str, ref_engine_path: str, ledger_extractor_path: str) -> Dict[str, Any]:
    random.seed(seed)
    ref = _load_module(ref_engine_path, "ref_engine.engine")
    led = _load_module(ledger_extractor_path, "ref_engine.ledger")

    with open(sample_request_path, "r") as f:
        base_req = json.load(f)
    prior_pack = base_req["prior_pack"]
    due_date = base_req["due_date"]
    E = float(base_req["expected_rent_amount"])

    targets = [
        ("day5_ge70", lambda r: r["horizons"]["day_5"]["p_ge_70"], lambda o: 1.0 if (o["transitions_days"]["0b1"] is not None and o["transitions_days"]["0b1"] <= 5.0) or (o["transitions_days"]["12"] is not None and o["transitions_days"]["12"] <= 5.0) or (o["transitions_days"]["23"] is not None and o["transitions_days"]["23"] <= 5.0) else 0.0),
        ("day5_ge90", lambda r: r["horizons"]["day_5"]["p_ge_90"], lambda o: 1.0 if (o["transitions_days"]["12"] is not None and o["transitions_days"]["12"] <= 5.0) or (o["transitions_days"]["23"] is not None and o["transitions_days"]["23"] <= 5.0) else 0.0),
        ("day5_eq100", lambda r: r["horizons"]["day_5"]["p_eq_100"], lambda o: 1.0 if (o["transitions_days"]["23"] is not None and o["transitions_days"]["23"] <= 5.0) else 0.0),
        ("day15_ge70", lambda r: r["horizons"]["day_15"]["p_ge_70"], lambda o: 1.0 if (o["transitions_days"]["0b1"] is not None and o["transitions_days"]["0b1"] <= 15.0) or (o["transitions_days"]["12"] is not None and o["transitions_days"]["12"] <= 15.0) or (o["transitions_days"]["23"] is not None and o["transitions_days"]["23"] <= 15.0) else 0.0),
        ("day15_ge90", lambda r: r["horizons"]["day_15"]["p_ge_90"], lambda o: 1.0 if (o["transitions_days"]["12"] is not None and o["transitions_days"]["12"] <= 15.0) or (o["transitions_days"]["23"] is not None and o["transitions_days"]["23"] <= 15.0) else 0.0),
        ("day15_eq100", lambda r: r["horizons"]["day_15"]["p_eq_100"], lambda o: 1.0 if (o["transitions_days"]["23"] is not None and o["transitions_days"]["23"] <= 15.0) else 0.0),
    ]

    preds={k:[] for k,_,_ in targets}
    ys={k:[] for k,_,_ in targets}
    es_preds=[]; es_real=[]
    rec_err={"0.30":[], "0.70":[], "0.90":[], "1.00":[]}

    for i in range(n):
        u_rate = clamp(random.betavariate(2,18), 0.0, 1.0)
        a_rate = clamp(random.betavariate(2,12), 0.0, 1.0)
        unit_months = random.choice([0,1,2,3,6,12,24])
        dq = clamp(random.uniform(0.85,1.0),0.0,1.0)

        residual_plans=[]

        # synthetic reversals/chargebacks (settled_at-only, confidence impacts)
        reversals=[]
        if random.random()<0.10:
            for _ in range(random.randint(1,2)):
                # place reversals within the last 60 days relative to due_date
                reversals.append({"amount": float(round(random.uniform(25, 250),2)), "settled_at": _iso_add_days(due_date, -random.uniform(5, 60))})
        
        if random.random()<0.30:
            residual_plans.append({"type": random.choice(["authorized","unauthorized"]), "days_since_end": random.uniform(0,90)})
        if random.random()<0.12:
            residual_plans.append({"type": random.choice(["authorized","unauthorized"]), "days_since_end": random.uniform(0,90)})

        eta = random.gauss(0.0, 0.25)

        req=dict(base_req)
        req["unit_id"]=f"SIM-{i}"
        req["features"]={"unauthorized_partial_rate_90d": float(u_rate), "authorized_partial_rate_90d": float(a_rate),
                         "residual_plans": residual_plans, "unit_history_months": float(unit_months), "data_quality_score": float(dq), "reversals": reversals}

        resp = ref.evaluate_unit_cycle(req)
        phi, _ = ref.compute_phi(req["features"], prior_pack)  # type: ignore

        true_trans = simulate_chain_transitions(prior_pack, eta=eta, phi=phi, horizon=15.0, dt=0.01)
        ledger = build_ledger_from_transitions(due_date, E, true_trans)

        obs = led.extract_milestone_transitions(ledger["events"], E, due_date, float(base_req["cycle_horizon_days"]))  # type: ignore

        cross = obs["crossings_days"]
        mapping = [("0.30","0.3","0a0b"),("0.70","0.7","0b1"),("0.90","0.9","12"),("1.00","1.0","23")]
        for tau, key, tname in mapping:
            t_true = true_trans[tname]
            t_hat = cross[key]
            if t_true is None and t_hat is None: continue
            if t_true is None or t_hat is None: rec_err[tau].append(15.0)
            else: rec_err[tau].append(abs(float(t_hat)-float(t_true)))

        for name, pfn, yfn in targets:
            preds[name].append(float(pfn(resp)))
            ys[name].append(float(yfn(obs)))

        st = obs["state_day_15"]
        if st=="3": c15=1.0
        elif st=="2": c15=random.uniform(0.90,0.999)
        elif st=="1": c15=random.uniform(0.70,0.90)
        elif st=="0b": c15=random.uniform(0.30,0.70)
        else: c15=random.uniform(0.0,0.30)

        es_true = E*max(0.0, 1.0-c15)
        es_real.append(es_true)
        es_preds.append(float(resp["es15"]["expected_shortfall_amount"]))

    results={"n":n,"seed":seed,"brier":{}, "calibration":{}, "es15":{}, "ledger_extraction":{}}
    for name in preds:
        results["brier"][name]=sum(brier(p,y) for p,y in zip(preds[name], ys[name]))/n
        results["calibration"][name]=calibration_bins(preds[name], ys[name], n_bins=10)

    mae=sum(abs(p-y) for p,y in zip(es_preds, es_real))/n
    mean_true=sum(es_real)/n
    mean_pred=sum(es_preds)/n
    results["es15"]={"mae":mae,"mean_true":mean_true,"mean_pred":mean_pred,"rel_mae_vs_mean_true": (mae/mean_true if mean_true>1e-9 else None)}

    def stats(arr: List[float]):
        if not arr: return {"n":0}
        a=sorted(arr)
        return {"n":len(a),"mean_abs_error_days": sum(a)/len(a), "p50_abs_error_days": a[len(a)//2], "p90_abs_error_days": a[int(0.9*len(a))-1]}
    results["ledger_extraction"]={tau: stats(rec_err[tau]) for tau in rec_err}
    return results
