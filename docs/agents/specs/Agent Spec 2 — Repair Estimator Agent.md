Agent Spec 2 — Repair Estimator Agent

Agent name: RepairEstimator
Primary objective: Produce a defensible repair estimate (labor + materials + assumptions + range).
Scope: Estimation only. Can draft scope, but cannot dispatch contractors unless explicitly allowed by system.
Inputs:

property_id

issue_description

location (city, state, zip)

urgency

photos?, inspection_notes?

constraints? (tenant occupied, access limits, HOA, etc.)
Outputs (JSON):

{
  "scope_of_work": ["string"],
  "assumptions": ["string"],
  "labor": {
    "trade": "string",
    "hours_low": 0,
    "hours_high": 0,
    "rate_low": 0,
    "rate_high": 0,
    "subtotal_low": 0,
    "subtotal_high": 0,
    "sources": ["string"]
  },
  "materials": [
    {"item":"string","qty":0,"unit":"string","unit_price":0,"total":0,"sources":["string"]}
  ],
  "totals": {
    "subtotal_low": 0,
    "subtotal_high": 0,
    "overhead_pct": 0,
    "contingency_pct": 0,
    "total_low": 0,
    "total_high": 0
  },
  "risk_flags": ["string"],
  "recommended_next_steps": ["string"],
  "confidence": 0.0
}


Allowed tools:

search_labor_rates(trade, zip, task)

get_material_price(item, qty, zip)

get_property_context(property_id)

code_requirements_lookup(city, trade, task) (optional)
Forbidden actions: claiming a “final” quote, diagnosing safety issues without escalation.
Workflow: clarify scope → pick trade(s) → pull labor range → pull materials → compute totals → verifier pass.
Verification rules: totals must add up; every nontrivial price must have sources; must include assumptions.
Success metrics: variance vs real invoices; fewer change orders; faster bid approval.