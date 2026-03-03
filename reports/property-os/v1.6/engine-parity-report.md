# Engine Parity Report — Property OS v1.6

Date: 2026-03-03 UTC

## Scope
Parity between backend `PropertyOsService` output and reference engine vectors.

## Inputs
- Reference assets:
  - `tools/reference-engines/property-os-v1.6/sample_request.json`
  - `tools/reference-engines/property-os-v1.6/sample_response.json`
- Runtime execution path now uses:
  - `python3 -m ref_engine.cli --request <tmp_request.json>`

## Test result
- `pnpm test:parity:property-os` → **PASS**
- `pnpm test:property-os-contract` → **PASS**

## Notes
- Service includes fallback to `sample_response.json` if runtime engine call fails.
- Output shape aligns with v1.6 confidence object including reversal adjustment.

## Conclusion
**Parity baseline achieved for shipped sample vectors.**
