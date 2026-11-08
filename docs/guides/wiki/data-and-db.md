# Data and DB

- Prisma schema consolidated into single owner directory (#121).
- DB indexes on hot FK/status columns (#95, #97).
- Migrations under `prisma/`; seed scripts in `tenant_portal_backend/scripts/`.
- Run `pnpm db:migrate`.

See [prisma/README.md](../../../prisma/README.md).