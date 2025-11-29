# Follow-up Items - Digital Twin OS Implementation

**Status:** Out of Scope for Current PR  
**Priority:** Varies

---

## High Priority (Next Sprint)

### 1. API Contract Standardization
**Issue:** Some components still use direct `fetch()` instead of `apiClient.ts`  
**Impact:** Inconsistent error handling, difficult to mock  
**Effort:** 2-3 days  
**Files Affected:**
- `src/PaymentsPage.tsx`
- `src/domains/tenant/features/payments/PaymentsPage.tsx`
- Other components using direct fetch

**Action:** Refactor all API calls to use `apiClient.ts`

---

### 2. Error Boundaries
**Issue:** No global error boundary for React errors  
**Impact:** Unhandled errors can crash entire app  
**Effort:** 1 day  
**Action:** Add React Error Boundary component and wrap App

---

### 3. Accessibility Improvements
**Issue:** Missing ARIA labels, keyboard navigation not fully tested  
**Impact:** Poor experience for screen reader users  
**Effort:** 3-5 days  
**Action:**
- Add ARIA labels to all interactive elements
- Test keyboard navigation
- Verify color contrast (WCAG AA)
- Add skip links

---

### 4. Performance Optimization
**Issue:** No code splitting, large bundle size  
**Impact:** Slow initial load  
**Effort:** 2-3 days  
**Action:**
- Implement route-based code splitting
- Lazy load heavy components
- Remove unused NextUI components
- Optimize images

---

## Medium Priority

### 5. Complete Test Coverage
**Issue:** Only MaintenanceCard and MainDashboard have tests  
**Impact:** Brittle codebase, regression risk  
**Effort:** 1-2 weeks  
**Action:** Add tests for:
- All card components
- Payment flows
- Lease management
- Authentication flows

---

### 6. TypeScript Strict Mode
**Issue:** TypeScript strict mode not enabled  
**Impact:** Potential runtime errors  
**Effort:** 2-3 days  
**Action:** Enable strict mode and fix type errors

---

### 7. Linting Setup
**Issue:** No active linting, no pre-commit hooks  
**Impact:** Code quality inconsistencies  
**Effort:** 1 day  
**Action:**
- Add lint script to package.json
- Configure ESLint rules
- Add pre-commit hooks (Husky)

---

### 8. Bundle Optimization
**Issue:** NextUI still in bundle but being phased out  
**Impact:** Unnecessary bundle size  
**Effort:** 1-2 days  
**Action:**
- Audit NextUI usage
- Remove unused components
- Replace with Digital Twin OS components

---

## Low Priority

### 9. Service Worker
**Issue:** No offline support  
**Impact:** App unusable without internet  
**Effort:** 3-5 days  
**Action:** Implement service worker for offline caching

---

### 10. Analytics & Monitoring
**Issue:** No performance monitoring  
**Impact:** Can't track user experience issues  
**Effort:** 2-3 days  
**Action:**
- Add web-vitals tracking
- Implement error logging (Sentry)
- Add performance metrics

---

### 11. Component Storybook
**Issue:** No component documentation/playground  
**Impact:** Difficult for new developers  
**Effort:** 1 week  
**Action:** Set up Storybook for Digital Twin OS components

---

## Production Readiness

### 12. Full Stripe Integration
**Issue:** Currently using mock Stripe service  
**Impact:** Payments won't work in production  
**Effort:** 3-5 days  
**Action:**
- Integrate real Stripe SDK
- Handle webhooks
- Test payment flows end-to-end
- Add error handling for payment failures

---

### 13. Real API Endpoint Verification
**Issue:** Some endpoints may not exist or have changed  
**Impact:** Runtime errors in production  
**Effort:** 2-3 days  
**Action:**
- Audit all API calls
- Verify endpoints exist
- Update API contracts
- Add integration tests

---

### 14. Webhook Handling
**Issue:** Stripe and eSignature webhooks not tested  
**Impact:** Payment/lease status may not update  
**Effort:** 2-3 days  
**Action:**
- Test Stripe webhook flow
- Test eSignature webhook flow
- Add error handling
- Add logging

---

## Feature Enhancements

### 15. Complete RentalApplicationsCard Styling
**Issue:** RentalApplicationsCard needs Digital Twin styling updates  
**Impact:** Visual inconsistency  
**Effort:** 2-3 hours  
**Action:** Apply GlassCard wrapper and Digital Twin styling

---

### 16. App Launcher Modal
**Issue:** Dock "All Apps" action not implemented  
**Impact:** Missing feature  
**Effort:** 1-2 days  
**Action:** Create modal with all available apps/features

---

### 17. Enhanced AI Orb Functionality
**Issue:** AI Orb opens chat but could be more integrated  
**Impact:** Limited AI functionality visibility  
**Effort:** 2-3 days  
**Action:**
- Add AI status indicators
- Show AI insights in orb
- Add quick actions

---

## Technical Debt

### 18. State Management
**Issue:** No centralized state management  
**Impact:** Prop drilling, difficult state sharing  
**Effort:** 1 week  
**Action:** Consider Zustand or Redux for complex state

---

### 19. Component Organization
**Issue:** Some duplicate components (TenantShell variants)  
**Impact:** Maintenance burden  
**Effort:** 1-2 days  
**Action:** Consolidate duplicate components

---

### 20. Environment Configuration
**Issue:** Environment variables not well documented  
**Impact:** Setup difficulties  
**Effort:** 1 day  
**Action:**
- Create `.env.example`
- Document all required variables
- Add validation

---

## Estimated Effort Summary

- **High Priority:** ~10-15 days
- **Medium Priority:** ~15-20 days
- **Low Priority:** ~15-20 days
- **Production Readiness:** ~10-15 days
- **Feature Enhancements:** ~5-7 days
- **Technical Debt:** ~10-15 days

**Total Estimated Effort:** ~65-92 days (13-18 weeks)

---

## Recommended Priority Order

1. API Contract Standardization (High)
2. Error Boundaries (High)
3. Full Stripe Integration (Production)
4. Accessibility Improvements (High)
5. Performance Optimization (High)
6. Complete Test Coverage (Medium)
7. Real API Endpoint Verification (Production)
8. Remaining items as needed

---

**Last Updated:** January 2025

