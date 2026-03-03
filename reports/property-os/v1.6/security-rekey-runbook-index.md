# Security/Rekey Runbook Index — Property OS v1.6

Date: 2026-03-03 UTC

## Primary runbooks
- `security/mil/runbooks/key-rotation.md`
- `security/mil/runbooks/key-recovery.md`

## Security hardening completed
- MIL scaffold integrated under `security/mil/`
- Property OS model-sensitive audit events added:
  - `PROPERTY_OS_ANALYSIS_REQUEST`
  - `PROPERTY_OS_ANALYSIS_SUCCESS`
  - `PROPERTY_OS_ANALYSIS_FAILURE`
- Security event logging wired in `PropertyOsService`.
- Engine health endpoint added: `GET /property-os/v16/engine-health`

## Operational note
Migration for Property OS security enums is applied in current environment; maintain migration parity across all envs before removing any temporary compatibility controls in downstream branches.
