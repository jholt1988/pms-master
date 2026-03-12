# docs/governance/AGENT_POLICY_MATRIX.md

## Global Defaults (All Domains)

- **Execution model:** Front-door router → specialist domain agent
- **Tooling policy:** Least privilege, deny-by-default
- **Memory policy:** Segmented memory (task / project / long-term) with provenance tags
- **Completion rule:** Domain verifier pass + policy checks pass
- **Escalation rule:** Any high-impact action requires human approval

---

## 1) Coding Agent

- **Allowed tools:** repo read/write, sandbox exec, tests, lint, static analysis
- **Blocked by default:** production deploy, secret manager writes, direct production DB writes
- **Required verifiers:**
  - tests pass
  - lint/typecheck pass
  - security scan pass
- **Human approval required for:** merge to protected branch, release/deploy
- **Go threshold:** ≥95% task success in eval set, 0 critical security regressions

## 2) Research Agent

- **Allowed tools:** web search/fetch, document ingestion, citation formatter
- **Blocked by default:** external posting/sending
- **Required verifiers:**
  - citation presence for factual claims
  - source quality checks (primary > secondary)
  - contradiction/consistency check
- **Human approval required for:** high-stakes conclusions or policy recommendations
- **Go threshold:** ≥90% citation-valid claims, <2% critical factual errors

## 3) Planning Agent

- **Allowed tools:** scheduling APIs, constraint solver, project/task systems
- **Blocked by default:** calendar modifications without confirmation
- **Required verifiers:**
  - hard constraints satisfied
  - resource conflicts detected
  - contingency path present
- **Human approval required for:** external commitments affecting budget/timeline
- **Go threshold:** ≥95% constraint satisfaction on replay tests

## 4) Marketing Agent

- **Allowed tools:** analytics read, campaign drafting, experiment setup (draft mode)
- **Blocked by default:** ad spend changes, audience pushes live
- **Required verifiers:**
  - compliance checklist
  - KPI hypothesis + rollback condition
  - audience/risk policy check
- **Human approval required for:** spend, targeting, launches
- **Go threshold:** no compliance violations in eval; measurable uplift in controlled tests

## 5) Copywriting Agent

- **Allowed tools:** brand voice retrieval, drafting, style QA
- **Blocked by default:** direct publication
- **Required verifiers:**
  - voice consistency score
  - legal/compliance phrase checks
  - readability/channel-fit check
- **Human approval required for:** external publication
- **Go threshold:** ≥90% brand voice adherence; 0 high-risk legal misses

## 6) Branding Agent

- **Allowed tools:** guideline retrieval, asset generation (draft), critique loops
- **Blocked by default:** replacing canonical brand assets
- **Required verifiers:**
  - guideline consistency
  - differentiation check
  - stakeholder critique summary
- **Human approval required for:** brand system changes
- **Go threshold:** stakeholder approval + no guideline conflicts

## 7) UI/UX Agent

- **Allowed tools:** design file ops (draft), heuristic checks, analytics read
- **Blocked by default:** shipping UI to production
- **Required verifiers:**
  - accessibility checks (WCAG 2.2 baseline)
  - design-system compliance
  - flow/usability checklist
- **Human approval required for:** release-ready handoff
- **Go threshold:** no critical accessibility failures; usability benchmarks met

## 8) Print Layout Agent

- **Allowed tools:** layout generation, preflight checks, export staging
- **Blocked by default:** final print vendor submission
- **Required verifiers:**
  - prepress preflight (bleed, color profile, resolution, overprint, fonts)
  - PDF/X validity checks
  - pagination/hierarchy checks
- **Human approval required for:** print-ready export/signoff
- **Go threshold:** 100% required preflight checks pass

---

## Cross-Agent Safety Controls (Required)

- Prompt-injection defenses for retrieved/tool content
- Inter-agent message sanitization + trust labels
- Cascade breaker for fan-out failures
- Immutable audit logs for tool calls + approvals
- Rate limits and circuit breakers per tool/domain

## Deployment Policy

- **Stage 1:** Draft-only autonomy
- **Stage 2:** Verified execution autonomy (no external impact)
- **Stage 3:** Conditional external actions (with approvals)
- **Stage 4:** Increased autonomy only after sustained green evals + red-team pass
