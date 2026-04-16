# Test Coverage Audit Report
**tenant_portal_backend** | Date: 2026-04-17

---

## Executive Summary

| Metric | Value | Threshold | Status |
|--------|-------|-----------|--------|
| **Lines Coverage** | 26% | 80% | ❌ FAIL |
| **Branches Coverage** | 16% | 70% | ❌ FAIL |
| **Functions Coverage** | 21% | 75% | ❌ FAIL |
| **Test Suites** | 70 total | - | 62 pass, 8 fail |
| **Tests** | 517 total | - | 410 pass, 80 fail |

**Overall: The project significantly underperforms against coverage targets.**

---

## Coverage by Module

### ✅ Well-Covered Modules (>80%)
| Module | Lines | Branches | Functions |
|--------|-------|----------|-----------|
| app-role.ts | 100% | 73% | 100% |
| ai-lease-renewal-metrics.service.ts | 100% | 92% | 100% |
| ai-maintenance-metrics.service.ts | 100% | 92% | 100% |
| maintenance-data-contracts.ts | 100% | 83% | 100% |
| crypto.service.ts | 100% | 100% | 100% |
| ai-payment-metrics.service.ts | 100% | 86% | 100% |
| workflow-parallel-executor.ts | 100% | 92% | 100% |
| notification-preferences.service.ts | 97% | 73% | 100% |
| security-events.controller.ts | 93% | 0% | 50% |
| fee-engine.ts | 92% | 82% | 100% |
| auth.service.ts | 87% | 74% | 87% |
| guardrail-policy.ts | 85% | 75% | 100% |

### ⚠️ Critical Services Coverage

| Service | Coverage | Lines | Assessment |
|---------|----------|-------|------------|
| **payments.service.ts** | 7% | 585 | ❌ CRITICAL - Revenue critical |
| **stripe.service.ts** | 25% | 210 | ❌ CRITICAL - Payment processor |
| **billing.service.ts** | 35% | 247 | ❌ CRITICAL - Billing engine |
| **rental-application.service.ts** | 36% | 313 | ❌ Core business logic |
| **maintenance.service.ts** | 41% | 424 | ⚠️ Core maintenance ops |
| **leasing.service.ts** | 5% | 184 | ❌ CRITICAL - Core lease mgmt |
| **lease.service.ts** | 0% | 267 | ❌ CRITICAL - Core entity |
| **email.service.ts** | 4% | 139 | ❌ Customer communication |
| **notifications.service.ts** | 7% | 157 | ❌ User notifications |
| **users.service.ts** | 12% | 83 | ❌ User management |

### 🔴 Zero-Coverage Modules (181 modules)

**Largest untested modules:**
- `lease.service.ts` (267 lines)
- `propertyopsorchestrator.ts` (212 lines)
- `chatbot.service.ts` (185 lines)
- `scheduled-jobs.service.ts` (181 lines)
- `dashboard.service.ts` (153 lines)
- `tenant.service.ts` (131 lines)
- `inspections.service.ts` (145 lines)
- `bookkeeping.service.ts` (94 lines)

---

## Failing Tests (8 Suites, 80 Tests)

| Test File | Issue |
|-----------|-------|
| `payments.service.spec.ts` | Dependency resolution (AuditLogService missing) |
| `payments.lease-context.spec.ts` | Dependency resolution (AuditLogService missing) |
| `payments.direct-charge.spec.ts` | Missing mock for PaymentStrategyRegistry |
| `leasing.service.spec.ts` | Dependency injection issues |
| `documents/documents.service.spec.ts` | Service initialization failures |
| `messaging/messaging.service.spec.ts` | Prisma/cluster mock issues |
| `quickbooks/quickbooks-minimal.service.spec.ts` | Database connection mocking |
| `feature-flags/feature-flags.service.spec.ts` | Test isolation issues |

---

## Critical Gaps Analysis

### 1. Revenue-Critical Path
```
payments.service.ts (7%) → stripe.service.ts (25%) → billing.service.ts (35%)
```
**Risk:** Any payment processing changes could break production without detection.

### 2. Lease Management Path
```
lease.service.ts (0%) → leasing.service.ts (5%) → lease.controller.ts (0%)
```
**Risk:** Core lease operations completely untested.

### 3. Tenant Communication
```
email.service.ts (4%) → notifications.service.ts (7%) → messaging.service.ts (19%)
```
**Risk:** Tenant communications may fail silently.

### 4. AI/Orchestration Services
```
ai-lease-renewal.service.ts (56%) → workflow-engine.service.ts (63%) → chatbot.service.ts (0%)
```
**Risk:** AI features have minimal guardrails.

---

## Priority List: Recommended Tests

### 🔥 P0 - Revenue Critical (Fix First)
1. **payments.service.spec.ts** - Fix dependency mocks, increase coverage to 80%+
2. **stripe.service.spec.ts** - Add webhook handling tests, increase to 80%+
3. **billing.service.spec.ts** - Add autopay, late fee tests, increase to 80%+

### 🔴 P1 - Core Business Logic
4. **lease.service.spec.ts** - Create tests for CRUD operations
5. **leasing.service.spec.ts** - Fix existing tests, expand coverage
6. **maintenance.service.spec.ts** - Expand beyond current basic tests

### 🟠 P2 - Communication Services
7. **email.service.spec.ts** - Add email template rendering tests
8. **notifications.service.spec.ts** - Add notification delivery tests

### 🟡 P3 - Other High-Value
9. **dashboard.service.spec.ts** - Aggregations and rollups
10. **inspections.service.spec.ts** - Inspection workflow tests
11. **tenant.service.spec.ts** - Tenant CRUD and profile management

---

## Test Infrastructure Recommendations

### Issues Found
1. **Failing unit tests:** 8 test suites have broken dependency injection
2. **No CI integration:** Tests aren't run in automated pipeline
3. **Coverage thresholds unenforced:** Config has thresholds but they're not blocking
4. **E2E only environment:** Requires database setup; unit tests incomplete
5. **Missing test utilities:** createStubInstance used inconsistently

### Proposed Improvements

1. **Fix broken tests immediately**
   ```bash
   # Priority: Fix dependency mocks in tests that fail during CI
   npm test -- --testPathPattern="payments.service.spec"
   ```

2. **Add coverage enforcement in CI**
   ```yaml
   # .github/workflows/test.yml
   - run: npm run test:coverage
     env:
       COVERAGE_THRESHOLD: '{"branches":70,"functions":75,"lines":80,"statements":80}'
   ```

3. **Create test fixtures/factories**
   - Add `test/factories/` with reusable mock builders
   - Standardize PrismaService mock patterns
   - Add database transaction helpers for e2e

4. **Split test configuration**
   - Keep unit tests without external dependencies
   - Use `test/jest-unit.json` for isolation
   - Keep e2e tests in `test/jest-e2e.json`

5. **Add component tests**
   - Test service interactions with mocked downstream services
   - Bridge gap between unit and full e2e

6. **Coverage goals by quarter**
   - Q2: Fix all failing tests; reach 40% overall
   - Q3: P0 coverage to 80%; reach 60% overall
   - Q4: All critical paths 80%; reach 75% overall

---

## Test File Inventory

| Category | Count |
|----------|-------|
| Unit tests in src/ | 66 files |
| E2E tests in test/ | 30 files |
| Test utilities | ~5 |

**Note:** Many unit tests in src/ are incomplete or only test happy paths.

---

## Summary

The tenant_portal_backend has significant test coverage debt:

- **Only 26% of code lines are tested**
- **Critical revenue paths (payments, billing) are at 7-35%**
- **8 test suites are completely broken**
- **No CI gate exists to prevent coverage decay**

**Immediate action:** Fix the 8 failing test suites and add 20+ tests to payments.service.ts to cover revenue-critical paths.