# Phase 5 Dependency Audit Policy

Date: 2026-06-07

Scope: Kansas private beta launch. Applies to all Node/TypeScript workspaces managed by `pnpm`, including backend, operator app, tenant app, packages, scripts, and services.

## Production Gate

Private beta must not launch with unreviewed dependency vulnerability findings.

Pass criteria:

- `pnpm-lock.yaml` is committed and used as the source of truth.
- Dependency installs use `pnpm install --frozen-lockfile` in CI.
- `pnpm audit --prod` is run for production dependency risk.
- Critical vulnerabilities in runtime dependencies block release unless a written release exception exists.
- High vulnerabilities in runtime dependencies require a fix plan and an exception expiring within 30 days if not fixed before release.
- Moderate vulnerabilities can be accepted for private beta only with owner, rationale, affected package, advisory ID, and expiry.
- Low vulnerabilities are tracked but do not block private beta unless they affect authentication, authorization, payments, document signing, accounting, or PII handling.

## Required Commands

Production dependency scan:

```bash
pnpm audit --prod
```

Full workspace scan:

```bash
pnpm audit
```

Tracked exception validation:

```bash
pnpm security:deps:exceptions
```

Recommended private beta evidence command:

```bash
pnpm security:deps:exceptions && pnpm audit --prod
```

If `pnpm audit` times out in local development, run it in CI or a shell with a longer timeout and attach the resulting JSON or terminal output to release evidence.

## Exception Registry

Tracked exceptions live in `docs/security/dependency-audit-exceptions.json`.

Each exception must include:

- `id`: stable local ID such as `DEP-2026-001`.
- `status`: `accepted`, `mitigating`, or `remediated`.
- `severity`: `low`, `moderate`, `high`, or `critical`.
- `packageName`: affected package name.
- `advisoryIds`: advisory, CVE, GHSA, or Snyk IDs.
- `affectedWorkspaces`: workspace names or `root`.
- `dependencyType`: `runtime`, `dev`, or `transitive`.
- `owner`: accountable human or team.
- `rationale`: why the exception is acceptable.
- `mitigation`: compensating control or remediation path.
- `expiresOn`: ISO date. High/critical exceptions must expire within 30 days.
- `reviewedOn`: ISO date of most recent review.

## Severity Policy

| Severity | Runtime Dependency | Dev Dependency |
| --- | --- | --- |
| Critical | Release blocker unless executive/security exception expires within 14 days. | Release blocker if reachable in build/release pipeline; otherwise 14-day exception. |
| High | Fix before release or exception expires within 30 days. | Fix before public launch or exception expires within 45 days. |
| Moderate | Exception allowed for private beta with owner and expiry. | Track and remediate opportunistically. |
| Low | Track only unless package touches auth, payments, PII, e-signature, accounting, or deployment. | Track only. |

## Dependency Hygiene Rules

- Prefer removing unused packages over patching unused risk.
- Pin known-risk integrations deliberately; do not accept broad unreviewed major upgrades in release week.
- Do not add new runtime dependencies for one-off helpers when the standard library is enough.
- Any package used in auth, payments, accounting, AI gateway, document signing, file upload, or webhook processing requires owner review before upgrade.
- Generated clients and contract packages should remain reproducible from committed specs.
- Security placeholder packages such as `pydantic@0.0.1-security` and `uvicorn@0.0.1-security` must not be used as real application dependencies.

## Review Cadence

- Private beta: weekly dependency audit review.
- Public launch candidate: audit review before each release candidate.
- Post-launch: weekly automated scan plus monthly exception review.

## Evidence Template

```markdown
## Dependency Audit Evidence

- Date/time:
- Reviewer:
- Commit:
- Command:
- Runtime advisories summary:
- Full advisories summary:
- Exceptions reviewed:
- New exceptions:
- Expired exceptions:
- Release decision: PASS/FAIL
- Follow-ups:
```

