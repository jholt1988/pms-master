# Rental Application Traceability Matrix

Source of truth: `OpenLoops/01_Strategy/Property_Suite/Rental-Application.md`

## Summary
- **Overall:** Partial-to-strong alignment
- **Status:** Core workflow implemented; several spec items are partial, future-state, or need deeper verification

## Matrix

| Requirement (spec) | Expected | Current in `pms-master` | Status | Notes |
|---|---|---|---|---|
| Public landing route | `/rental-application` | Route exists in `tenant_portal_app/src/App.tsx` to `ApplicationLandingPage` | MATCH | Implemented |
| Public form route | `/rental-application/form` | Route exists to `ApplicationPage` | MATCH | Implemented |
| Public confirmation route | `/rental-application/confirmation` | Route exists to `ApplicationConfirmationPage` | MATCH | Implemented |
| PM management route | `/rental-applications-management` | Route exists behind PM/Admin/Operator guard | MATCH | Implemented |
| Landing includes process timeline + docs checklist + fee + expectations | Informational pre-form guidance | `ApplicationLandingPage` includes all of these sections | MATCH | Implemented |
| Form captures comprehensive applicant data | Personal, employment, rental history, references, pets/vehicles, consents | `ApplicationPage` submits broad payload via `/rental-applications` | MATCH | Implemented |
| Real-time validation | Inline validation and required-field signaling | Present in form behavior/UI; deep field-by-field validation still needs test matrix | PARTIAL | Requires exhaustive validation QA |
| Auto-save draft | Save progress and resume | Not clearly implemented | GAP | Spec labels as future enhancement |
| Submit to backend and navigate to confirmation with ID | `POST` then `navigate(...confirmation?id=...)` | Implemented in `ApplicationPage` | MATCH | Implemented |
| Confirmation code + response timeline + email + create-account CTA | Post-submit confidence and next steps | `ApplicationConfirmationPage` includes these elements | MATCH | Implemented |
| PM review actions (approve/deny/request info/schedule interview) | Full review workflow | Management route exists; full action depth not fully verified in this pass | PARTIAL | Requires role-based PM deep test |
| Applicant status tracking portal | Submitted/Under Review/etc. | Mentioned; not clearly end-to-end implemented as a public tracker | PARTIAL | Spec itself marks as future enhancement |
| Security/privacy guarantees | Encryption, SSN protection, auditability, retention, compliance | Security claims exist in docs; implementation verification not completed here | PARTIAL | Needs backend/security audit evidence |

## Key Gaps To Close
1. Implement draft auto-save + resume for form.
2. Validate full PM action workflow parity (approve/deny/request-info/interview) with role-based tests.
3. Add explicit applicant status tracking surface if required for MVP scope.
4. Produce security controls evidence mapping for sensitive fields (especially SSN path and audit logs).

## Recommended Next Validation Pass
- Run a role-based QA suite (PM, tenant, unauth) against the full application lifecycle.
- Add API contract checks for create/update/status endpoints.
- Add a dedicated negative-validation suite for required fields, bad formats, and duplicate submits.
