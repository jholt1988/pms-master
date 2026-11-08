# Changelog

All notable changes to **pms-master** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-03-12

### Added
- Initial repository-level project versioning via `VERSION` file.
- Agent governance docs:
  - `AGENT_POLICY_MATRIX.md`
  - `agent-policies.yaml`
- Documentation governance and structure improvements:
  - consolidated `docs/` organization
  - generation taxonomy/index under `docs/generations/`
  - reorg summary `DOCS_REORG_SUMMARY.md`
- Branding standards and update summaries:
  - `docs/branding/BRAND_STYLE_GUIDE.md`
  - `BRANDING_UPDATE_SUMMARY.md`

### Changed
- MIL service/worker Docker builds hardened for monorepo context:
  - workspace-safe and isolated build behavior
  - strict build restored after TypeScript fixes
- MIL worker TypeScript reliability improvements:
  - nullable `evaluation_id` handling cleanup
  - `@types/pg` added for proper typings

## [0.2.0] - 2026-11-07

### Added
- 13 new operator API modules (#118).
- Async rent-payment confirmation email via BullMQ (#98).
- DB indexes on hot FK/status columns (#95, #97).
- Docs hygiene: `scripts/docs-check.sh`, `.github/workflows/docs-lint.yml`, `docs/WIKI_AND_DOCS_UPDATE_PLAN.md`.

### Changed
- Org-context scoping enforced on reporting, audit, smart devices, security (#113–#117).
- 6 services migrated from PrismaService to DatabaseService (#102).
- Workflow engine migrated to Prisma 7 + Docker (#111–#112).
- Mobile CI installs from pnpm lockfile (#122, open).
- Prisma schema consolidated into single owner directory (#121).

### Fixed
- JWT_SECRET fail-closed; estimates rendered as text (#120).
- Dead copilot code, broken fetch paths, audit log entityId filter (#115).
- Leaked DocuSign debug artifacts removed + gitignored (#94).
- Committed junk/nested copy/bytecode removed (#119).

### Security
- Removed committed debug artifacts with leaked DocuSign creds (#94).

---

## Versioning Rules

- **MAJOR**: breaking changes (API/schema/workflow compatibility)
- **MINOR**: backward-compatible features
- **PATCH**: backward-compatible fixes/docs/chore updates
