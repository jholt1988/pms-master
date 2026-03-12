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

---

## Versioning Rules

- **MAJOR**: breaking changes (API/schema/workflow compatibility)
- **MINOR**: backward-compatible features
- **PATCH**: backward-compatible fixes/docs/chore updates
