# Property OS Simulation Harness (v1.6) — v3 (Ledger End-to-End)

Generates **full synthetic ledgers** and runs **Module 1** extraction end-to-end.

## Run
python -m sim_harness.run --n 2000 --seed 7

## Report
Writes a JSON report with:
- Brier scores + calibration bins for milestone events
- ES15 MAE
- Ledger extraction recovery error stats for crossing times (|t_hat - t_true|)


v1.6: contract-stable `confidence.reversal_adjustment` using continuous exponential decay.
