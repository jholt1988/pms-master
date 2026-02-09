# Inspection → Estimate demo seed (Wichita, KS)

This repo includes a small seed script intended specifically for demoing the **Inspection Detail → Generate Estimate** flow with stable, explainable bid ranges.

## What it creates
- Org + admin (PM) user + tenant user
- **Wichita, KS** property
- 1 unit + active lease
- 1 inspection in **IN_PROGRESS** with 3 rooms and multiple action items across trades

## Run
From `tenant_portal_backend/`:

```bash
npm run prisma:generate
# Ensure DATABASE_URL is set and migrations are applied
npx ts-node scripts/dev-seed-inspection-demo.ts
```

## Credentials
- Admin (PM): `admin / Admin123!@#`
- Tenant: `tenant / Tenant123!@#`

## Notes
- The property address is intentionally formatted as: `street, Wichita, KS, USA` because `EstimateService.getLocationFromProperty()` currently parses location from `property.address`.
- After seeding, open the inspections list and navigate to the seeded **Inspection ID** printed in the console.
