# Simulation Quality Baseline Report — Property OS v1.6

Date: 2026-03-03 UTC

## CI integration status
- Quick run workflow: `.github/workflows/property-os-sim-quick.yml`
- Nightly workflow: `.github/workflows/property-os-sim-nightly.yml`
- Runner script: `scripts/pms/run-property-os-sim.sh`

## Configured baselines
- PR quick run: `n=200`
- Nightly run: `n=2000`
- Output artifacts: `reports/sim/property-os-v1.6/`

## Current state
- CI workflows are present and configured.
- Baseline metrics storage path defined.
- Threshold gates should be finalized once first stable nightly trend is collected.

## Recommendation
Adopt release gate thresholds after 3–7 nightly runs to establish normal variance bands for calibration/ES15 drift.
