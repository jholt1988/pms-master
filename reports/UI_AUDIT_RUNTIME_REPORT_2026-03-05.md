# Runtime UI Audit Report — tenant_portal_app

**Project:** pms-master  
**Date:** 2026-03-05  
**Method:** Live runtime audit (Vite dev run + browser inspection across tenant and PM routes)

## Scope Covered

- Login
- Tenant routes: dashboard, maintenance, payments, messaging, lease, inspections
- PM routes: dashboard, properties, lease-management, inspection-management
- Dimensions: visual hierarchy, visual style, accessibility, usability, forms, navigation

---

## Executive Summary

The app has a strong baseline shell and accessibility foundation (skip links, visible focus, role-based routing), but several critical journeys degrade hard when APIs fail. The biggest risk is not visual polish — it is **failure-mode UX** on core tasks.

---

## Findings by Priority

## P0

### 1) Core tenant/PM flows collapse into API error states with weak recovery

- **Issue:** Key routes often degrade into partial/error states with little actionable guidance when API responses fail.
- **Evidence:** Runtime checks showed `500`/"Unable to load" states across `/dashboard`, `/maintenance`, `/payments`, `/messaging`, `/my-lease`, `/tenant/inspections`, `/properties`, `/lease-management`.
- **Impact:** Critical workflows (rent/payment visibility, lease access, maintenance operations) are blocked, increasing churn/support risk.
- **Recommendation:**
  - Add shared degraded-mode UI component per module
  - Include retry controls with backoff
  - Show clear “what still works” navigation
  - Use cached last-known summaries where safe

---

## P1

### 2) Lease page lacks robust page structure in error condition

- **Issue:** `/my-lease` can render without a stable top-level page heading in failure state.
- **Evidence:** Runtime snapshot indicated no reliable `h1` context when page reduced to terse error output.
- **Impact:** Poor orientation for keyboard/screen reader users; weak recovery context.
- **Recommendation:** Always render persistent page heading + contextual recovery body in all states.

### 3) Inspection management appears to render duplicated shell/navigation

- **Issue:** `/inspection-management` displayed duplicated nav sections and duplicate heading patterns.
- **Evidence:** Runtime snapshot showed repeated navigation entries and duplicated “Inspection Management” heading presence.
- **Impact:** Confusing IA, increased cognitive load, potential landmark/tab-order issues.
- **Recommendation:** Ensure route is wrapped by shell exactly once; remove nested shell mount in feature module.

---

## P2

### 4) Form labeling inconsistency on inspection management

- **Issue:** Unlabeled form controls detected.
- **Evidence:** Runtime pass flagged 2 unlabeled inputs on `/inspection-management`.
- **Impact:** Reduced accessibility and form clarity.
- **Recommendation:** Add explicit labels (`<label for>` or `aria-labelledby`) for all controls.

### 5) Error-state hierarchy and guidance are inconsistent

- **Issue:** Error states often reduce to terse messages (`500 -`, generic load failures) without actionable guidance.
- **Evidence:** Multiple routes showed minimal explanatory content.
- **Impact:** Users cannot determine whether to retry, wait, or contact support.
- **Recommendation:** Standardize error-state composition:
  1. What happened
  2. What is affected
  3. What user can do now (Retry / Alternate path / Support)

---

## Strengths to Preserve

- Skip link and visible focus indicators are present and functional.
- Role-based route guards are clear and structurally sound.
- Shell and dashboard composition are coherent and scalable.

---

## Quick Wins (This Week)

1. Ship a shared `ErrorStateCard` for all data-driven pages.
2. Fix duplicated shell mount on `/inspection-management`.
3. Ensure stable `h1` and page landmarks in all states.
4. Patch unlabeled form inputs on inspection management.
5. Replace raw `500` text with task-oriented guidance and retries.

---

## Suggested Follow-up

- Add route-level UX regression checks for:
  - Error-state copy completeness
  - Landmark presence (`header`, `main`, `nav`)
  - Form label coverage
  - Keyboard-only path completion
- Add synthetic monitoring for top tenant and PM paths with API-failure simulation.
