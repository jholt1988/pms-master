# PMS Master — Wiki & Documentation Update Plan

**Repo:** `jholt1988/pms-master` (primary clone: `C:/Users/plabr/PROJECTS/pms-master`, branch `main`)
**Scope:** READMEs + `docs/` + GitHub Wiki pages (wiki currently enabled but empty)
**Sources of truth:** GitHub branches/PRs (open + merged), local doc tree, root & per-package READMEs

---

## 1. Inventory & State

- **Documentation tree:** `docs/` holds ~3854 Markdown files; ~2391 README files (most under `node_modules` — exclude those).
- **First-party READMEs to update:** root `README.md`, `tenant_portal_backend/README.md`, `tenant_portal_app/...`, `operator_app/README.md`, `pms-mobile-portals/README.md`, `pms-plans/README.md`, `prisma/README.md`, `scripts/README.md`, `security/mil/README.md`, `rent_optimization_ml/README.md`, plus per-domain READMEs under `tenant_portal_app/src/...`.
- **GitHub Wiki:** enabled but no `.wiki.git` repository exists yet → must be bootstrapped (create first page via GitHub UI or push an initial commit).
- **Open PR:** #122 `ci: install the mobile app from the pnpm lockfile` (chore/p5-mobile-pnpm).
- **Recently merged PRs (last 30 days):** #123 workflow intents, #121 property-os schema one-owner dir, #120 JWT_SECRET fail-closed + estimate rendering, #119 junk removal, #118 13 operator API modules, #115–#117 org-context scoping, #112/#111 workflow-engine Prisma 7 + Docker, #102 DatabaseService migration, #98 async email queue, #97/#95 DB indexes, #94 leaked DocuSign creds removal, etc.
- **Active remote branches not yet merged:** `chore/p6-workflow-intents` (merged as #123 but branch lingers), `codex/*` (rag http api, gap analysis, data quality, unit tests), `fix/*` (backend unit tests, ci node20, opossum typecheck), `chore/own-property-os-schema` (merged).

## 2. Objectives

1. Make the **GitHub Wiki** the canonical "master" entry point: architecture overview, onboarding, module index, changelog digest, and pointers to in-repo `docs/`.
2. Bring **READMEs** (root + per-package) in sync with merged PRs (new operator modules, Prisma 7/Docker, org-context scoping, DatabaseService, async email, DB indexes).
3. Add a **docs index** (`docs/README.md`) that maps categories → files and flags stale/outdated pages.
4. Cross-link wiki ↔ repo docs; avoid duplicating large specs — wiki summarizes, repo holds detail.
5. Mark deprecated/removed artifacts (e.g., leaked DocuSign debug artifacts #94, committed junk #119) as removed in docs.

## 3. Work Breakdown

### Phase A — Bootstrap & Tooling (Day 1)
- [ ] Clone/create wiki repo: push an initial `Home.md` + `_Sidebar.md` + `_Footer.md`.
- [ ] Add a `docs/README.md` index (categories: architecture, api, ai-ml, accessibility, e-signature, accounting, assessments, branding, agents).
- [ ] Add a `scripts/docs-check.sh` (or npm script) that fails CI if a top-level module lacks a README or a referenced doc path is broken.
- [ ] Add `.github/workflows/docs-lint.yml` to run markdownlint + link check on PRs.

### Phase B — README Refresh (Days 2–3)
Priority order (highest user-facing impact first):
1. Root `README.md` — stack (NestJS backend, Next.js operator app, Expo mobile, Prisma 7, pnpm), quick start, env vars, Docker compose.
2. `tenant_portal_backend/README.md` — DatabaseService, org-context guard, Prisma 7 client path, BullMQ email queue, new env vars.
3. `operator_app/README.md` — 13 new operator API modules, route matrix, OpenAPI regen flow.
4. `tenant_portal_mobile/README.md` + `pms-mobile-portals/README.md` — pnpm lockfile install (#122), mobile CI.
5. `prisma/README.md` — schema location (one owner dir #121), migrations, seed scripts.
6. `rent_optimization_ml/README.md`, `security/mil/README.md`, `scripts/README.md`, per-domain READMEs.

For each README: verify commands actually run (docker compose up, pnpm install, prisma generate) before marking done.

### Phase C — Wiki Pages (Days 3–5)
Create wiki pages (each ≤ 1 page, links to repo docs):
- `Home` — project overview, status, quick links.
- `Getting-Started` — clone, env, docker, first run.
- `Architecture` — app-architecture + ADR summary + service map.
- `Backend` — DatabaseService, org-context scoping, auth (JWT_SECRET fail-closed), Prisma 7.
- `Operator-App` — module list, route matrix, OpenAPI.
- `Mobile` — portals, CI, pnpm.
- `Data-and-DB` — indexes, schema ownership, migrations, seed.
- `AI-and-ML` — features, agents, rent optimization.
- `Security` — removed debug artifacts, secrets handling, org scoping.
- `Changelog-Digest` — monthly rollup of merged PRs (auto-generate from `gh pr list --state merged`).
- `Troubleshooting` — docker/prisma pitfalls from PRs #103–#112.

### Phase D — Docs Hygiene (Days 5–6)
- [ ] Diff `docs/` against merged PRs; update or delete stale pages (e.g., old Prisma 6 paths, old org-context notes).
- [ ] Move/remove committed junk references (#119); ensure `.gitignore` covers debug artifacts (#94).
- [ ] Reconcile `CHANGELOG.md` with merged PR list (#93–#123).
- [ ] Validate all internal links (markdown-link-check).

### Phase E — Verification (Day 7)
- [ ] Run docs lint + link check in CI; fix failures.
- [ ] Smoke-test README quick-start commands on a clean checkout.
- [ ] Confirm wiki renders and sidebar navigation works.
- [ ] Tag release `docs-v1` after merge.

## 4. Branch/PR Triage Rules

- **Merged PRs** → fold their changes into docs/READMEs in the next docs PR.
- **Open PR #122** → update mobile docs only after it merges (or document as "pending").
- **`codex/*` branches** → treat as in-progress features; add "Planned/Experimental" sections, not stable docs.
- **`fix/*` branches merged** → fold fixes into Troubleshooting + relevant module docs.
- **Stale branches** (merged but lingering) → delete after docs PR lands.

## 5. Deliverables

| Artifact | Location |
|---|---|
| Wiki Home + 11 pages | `jholt1988/pms-master.wiki` |
| Updated READMEs (10+) | repo root + package dirs |
| `docs/README.md` index | repo |
| `CHANGELOG.md` refresh | repo root |
| `scripts/docs-check.sh` + CI workflow | repo |
| This plan | `docs/WIKI_AND_DOCS_UPDATE_PLAN.md` |

## 6. Risks & Mitigations

- **Drift:** docs rot fast in active repo → add docs-lint to CI and require docs update in PR template.
- **Duplicate content:** wiki vs repo docs → wiki = summary + links only.
- **node_modules noise:** exclude from doc scans via `.gitignore`/glob.
- **Empty wiki bootstrap:** first push must be manual; automate thereafter via GitHub Actions on `main`.

## 7. Suggested Execution Order (minimal viable)

If time-boxed to one day: do Phase A (bootstrap wiki + index) + Phase B items 1–3 (root, backend, operator READMEs) + Phase D changelog refresh. Defer Phase C deep pages and Phase E automation.
