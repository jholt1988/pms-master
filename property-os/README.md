# Property OS Suite (r3) — runnable baseline

Adds real implementations for:
- **Weekly boundary runner** (MIL): `POST /boundary/run`
- **Tenant-calibrated secondary damage pack generation** (MIL):
  - ingest outcomes: `POST /secondary-damage/outcomes`
  - generate pack: `POST /secondary-damage/packs/generate`
  - first approve: `POST /secondary-damage/packs/:packId/approve-first`
- **PM-RE** minimal Monte Carlo simulator that uses ACTIVE tenant severity pack when available.

## Run
```bash
docker compose up -d
pnpm i

cp prisma/.env.example prisma/.env
pnpm db:generate
pnpm db:migrate

cp services/mil/.env.example services/mil/.env
cp services/pmre/.env.example services/pmre/.env
cp services/workflow-engine/.env.example services/workflow-engine/.env

pnpm dev
```
