# Property OS Reference Engine (v1.5.1) — r3

Canonical truth-layer implementation for:
- v1.5.1 model evaluator (milestone probabilities, ES15, confidence, explainability)
- **Module 1** ledger→event-time extraction (end-to-end)

## Files
- `ref_engine/engine.py` — evaluator (optionally includes observed milestones from ledger)
- `ref_engine/ledger.py` — Module 1 extractor: ledger receipts → threshold crossing times
- `ref_engine/cli.py` — evaluator CLI
- `ref_engine/extract_cli.py` — ledger extraction CLI
- `sample_*` JSONs

## Run
### Evaluate
python -m ref_engine.cli --request sample_request.json > out_eval.json

### Extract ledger milestones (Module 1)
python -m ref_engine.extract_cli --ledger sample_ledger.json --expected_rent 1250 --due_date 2026-03-01T00:00:00Z > out_extract.json
