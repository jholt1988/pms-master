"""
Module 1: Ledger → Event-Time extraction (v1.5.1)
"""
from __future__ import annotations
import datetime
from typing import Dict, Any, List

THRESHOLDS = [0.30, 0.70, 0.90, 1.00]

def _parse_iso(s: str) -> datetime.datetime:
    if s.endswith("Z"):
        s = s[:-1] + "+00:00"
    return datetime.datetime.fromisoformat(s)

def _days_since(due: datetime.datetime, ts: datetime.datetime) -> float:
    return (ts - due).total_seconds() / 86400.0

def _eligible(e: Dict[str, Any]) -> bool:
    if not e.get("is_settled", True):
        return False
    if e.get("is_reversal", False):
        return False
    if e.get("category") != "rent":
        return False
    if e.get("applied_to") != "rent_balance":
        return False
    return True

def extract_milestone_transitions(
    ledger_events: List[Dict[str, Any]],
    expected_rent_amount: float,
    due_date_iso: str,
    cycle_horizon_days: float = 30.0,
) -> Dict[str, Any]:
    due = _parse_iso(due_date_iso)
    E = float(expected_rent_amount)

    events = [e for e in ledger_events if _eligible(e)]
    events.sort(key=lambda e: _parse_iso(e["settled_at"]))

    crossings = {str(tau): None for tau in THRESHOLDS}
    cum = 0.0
    for e in events:
        ts = _parse_iso(e["settled_at"])
        t = _days_since(due, ts)
        if t < 0:
            continue
        if t > cycle_horizon_days:
            break
        cum += float(e["amount"])
        for tau in THRESHOLDS:
            key = str(tau)
            if crossings[key] is None and cum >= tau * E - 1e-9:
                crossings[key] = t

    trans = {
        "0a0b": crossings["0.3"],
        "0b1": crossings["0.7"],
        "12": crossings["0.9"],
        "23": crossings["1.0"],
        "censored_at": cycle_horizon_days
    }

    def state_at(h: float) -> str:
        if trans["23"] is not None and trans["23"] <= h: return "3"
        if trans["12"] is not None and trans["12"] <= h: return "2"
        if trans["0b1"] is not None and trans["0b1"] <= h: return "1"
        if trans["0a0b"] is not None and trans["0a0b"] <= h: return "0b"
        return "0a"

    return {
        "expected_rent_amount": E,
        "due_date": due_date_iso,
        "cycle_horizon_days": cycle_horizon_days,
        "eligible_event_count": len(events),
        "crossings_days": crossings,
        "transitions_days": trans,
        "state_day_5": state_at(5.0),
        "state_day_15": state_at(15.0)
    }
