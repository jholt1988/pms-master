# 🏠 Welcome to the Property Management Suite (PMS) Wiki

> AI-powered property management platform — NestJS backend, Next.js operator app, Expo mobile portals, Prisma 7 + PostgreSQL, and a Python rent-optimization ML service.

---

## 🚀 Quick Start

| Step | Command |
|------|---------|
| Backend | `cd tenant_portal_backend && cp .env.example .env && pnpm install && pnpm prisma:generate && pnpm dev` |
| Operator app | `cd operator_app && pnpm install && pnpm dev` |
| Mobile | `cd tenant_portal_mobile && pnpm install && pnpm start` |
| ML service | `cd rent_optimization_ml && python -m venv venv && pip install -r requirements.txt && python main.py` |

See [Getting Started](Getting-Started.md) for full setup.

---

## 📚 Documentation Map

### Core
- [Architecture](Architecture.md) — system design, services, ADRs
- [Backend](Backend.md) — NestJS, org-context scoping, DatabaseService, Prisma 7
- [Operator App](Operator-App.md) — 13 operator modules, OpenAPI
- [Mobile](Mobile.md) — portals, CI, pnpm
- [Data and DB](Data-and-DB.md) — schema ownership, migrations, indexes

### Features
- [Authentication](Authentication.md)
- [Lease Management](Lease-Management.md)
- [Maintenance](Maintenance.md)
- [Payments](Payments.md)
- [Messaging](Messaging.md)
- [Rental Application](Rental-Application.md)
- [Tenant Screening](Tenant-Screening.md)
- [Expense Tracker](Expense-Tracker.md)
- [Rent Estimator](Rent-Estimator.md)

### AI & ML
- [AI and ML](AI-and-ML.md) — rent optimization, leasing agent, chatbot, voice

### Security & Ops
- [Security](Security.md) — org scoping, JWT, MIL crypto, leaked creds removal
- [Troubleshooting](Troubleshooting.md) — Docker/Prisma, org-context, ML service

### Project
- [Changelog Digest](Changelog-Digest.md) — monthly PR rollup
- [Changelog](Changelog.md) — full change history
- [Routing System](Routing-System.md) / [Routing Migration Guide](Routing-Migration-Guide.md)

---

## 🆕 Recent Updates (Nov 2026)

- Org-context scoping enforced across reporting, audit, smart devices, security (#113–#117).
- 13 new operator API modules (#118).
- Workflow engine migrated to Prisma 7 + Docker (#111–#112).
- DatabaseService migration for 6 services (#102); async rent-payment email via BullMQ (#98).
- DB indexes on hot columns (#95, #97).
- Leaked DocuSign debug artifacts removed (#94); committed junk cleaned (#119).
- Mobile CI installs from pnpm lockfile (#122, open).

---

## 🤝 Contributing

Docs live in `docs/guides/wiki/` and sync to this wiki via `sync-wiki.yml` on push to `main`. See [docs/README.md](https://github.com/jholt1988/pms-master/blob/main/docs/README.md) for the documentation index.