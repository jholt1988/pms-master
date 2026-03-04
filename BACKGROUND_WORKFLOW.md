# Background Workflow (pms-master)

Default low-touch workflow for routine health and maintenance checks.

## What it does

1. Captures git status/branch snapshot
2. Verifies install integrity (`pnpm install --frozen-lockfile`)
3. (Default mode) runs frontend production build smoke
4. Generates Prisma client for backend
5. Boots backend briefly and probes:
   - `GET /api/health`
   - `GET /api/health/readiness`
6. Writes a timestamped report under `reports/background/`

## Commands

From repo root:

```bash
pnpm bg:workflow
```

Quick mode (skip frontend build):

```bash
pnpm bg:workflow:quick
```

## Output

- Latest report: `reports/background/latest.md`
- Timestamped report: `reports/background/<UTC timestamp>.md`
- Backend startup log (per run): `reports/background/backend-<UTC timestamp>.log`

## Suggested cadence

- **Daily:** `pnpm bg:workflow:quick`
- **2-3x per week:** `pnpm bg:workflow`

This is designed to run unattended and produce a reviewable report with minimal interaction.
