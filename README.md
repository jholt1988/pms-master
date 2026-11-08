# Property Management Suite (PMS)

AI-powered property management platform: NestJS backend, Next.js operator app, Expo/React Native mobile portals, Prisma 7 + PostgreSQL, and a Python rent-optimization ML service.

## Quick Start

```bash
# Backend
cd tenant_portal_backend
cp .env.example .env
pnpm install
pnpm prisma:generate
pnpm dev

# Operator app
cd ../operator_app
pnpm install
pnpm dev

# Mobile
cd ../tenant_portal_mobile
pnpm install
pnpm start
```

## Docker

```bash
docker compose up -d
```

## Documentation

- Docs index: [docs/README.md](docs/README.md)
- Master plan: [docs/WIKI_AND_DOCS_UPDATE_PLAN.md](docs/WIKI_AND_DOCS_UPDATE_PLAN.md)
- Wiki: GitHub Wiki on `jholt1988/pms-master` (being bootstrapped)

## Key Recent Changes

- Org-context scoping enforced on reporting, audit, smart devices, security endpoints (#113-#117).
- 13 new operator API modules (#118).
- Workflow engine migrated to Prisma 7 + Docker (#111-#112).
- DatabaseService migration for 6 services (#102); async rent-payment email via BullMQ (#98).
- DB indexes on hot columns (#95, #97).
- Leaked DocuSign debug artifacts removed (#94); committed junk cleaned (#119).

## License

Proprietary — Gilded Studio.
