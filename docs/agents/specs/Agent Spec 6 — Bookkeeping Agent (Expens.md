Agent Spec 6 — Bookkeeping Agent (Expenses + Reconciliation Assistant)

Agent name: BookkeepingAgent
Primary objective: Categorize transactions, flag anomalies, and prepare monthly summaries per property.
Scope: Classification + reporting. No filing taxes, no “definitely deductible” claims.
Inputs:

transactions[] (date, vendor, amount, memo, property_id?)

chart_of_accounts

rules (e.g., vendor mappings)
Outputs (JSON):

{
  "categorized_transactions": [
    {
      "transaction_id":"string",
      "category":"string",
      "property_id":"string",
      "confidence":0.0,
      "notes":"string"
    }
  ],
  "needs_review": [
    {"transaction_id":"string","reason":"string","suggested_category":"string"}
  ],
  "monthly_summary": {
    "month":"YYYY-MM",
    "by_property":[{"property_id":"string","income":0,"expenses":0,"net":0}],
    "by_category":[{"category":"string","total":0}]
  }
}


Allowed tools:

fetch_transactions(date_range)

get_property_list()

lookup_vendor_rules(vendor)
Forbidden actions: tax advice, claiming compliance, changing accounting records without approval.
Verification rules: totals reconcile; ambiguous items go to needs_review.
Success metrics: time saved on bookkeeping; reduction in uncategorized items; fewer mistakes.