# Phase 5 PII Handling Policy

Date: 2026-06-07

Scope: Kansas private beta launch. Applies to backend audit logs, security logs, event-envelope metadata, support diagnostics, and operational exports.

## Goals

- Keep audit trails useful without storing raw high-risk PII or secrets in log payloads.
- Prevent credentials, provider secrets, application identifiers, payment instrument details, and tenant contact data from leaking into logs.
- Make redaction behavior executable in tests before expanding production observability.

## Data Classes

| Class | Examples | Log Policy |
| --- | --- | --- |
| Credentials and tokens | Passwords, bearer tokens, refresh tokens, API secrets, client secrets, cookies | Always redact. |
| Government and tax identifiers | SSN, EIN, tax ID | Always redact. |
| Payment instrument identifiers | Card number, routing number, account number, payment method secret | Always redact. |
| Contact PII | Email, phone | Redact in audit/security/event metadata unless explicitly needed in a user-facing domain response. |
| Operational identifiers | Organization ID, entity ID, workflow ID, decision ID, lease ID, property ID | Allowed when needed for traceability. |
| Business facts | Amount, status, action, result, reason code, score, timestamps | Allowed unless nested under a sensitive key. |

## Backend Boundary

`AuditLogService.record()` is the canonical audit boundary. Before logging to Nest logger or encrypting audit payloads, metadata is passed through shared redaction.

`AuditLogService.recordEnvelope()` includes envelope metadata and nested payloads in the audit record, so it also relies on the same audit boundary redaction. Sensitive envelope values such as `idempotencyKey` are redacted.

## Redaction Rules

The redactor currently:

- Redacts sensitive key names, including password, passcode, token, secret, authorization, cookie, SSN, tax ID, EIN, routing number, account number, card number, client secret, idempotency key, email, and phone.
- Redacts standalone string values that look like an email address, SSN, phone number, or bearer authorization header.
- Recurses through nested objects and arrays.
- Preserves non-sensitive audit facts such as amounts, statuses, reason codes, timestamps, entity IDs, and workflow IDs.
- Converts circular references to `[Circular]` instead of throwing.

## Private Beta Rules

- Do not add raw request bodies to audit metadata unless they are allowlisted or redacted at the audit boundary.
- Do not log webhook raw payloads after signature validation.
- Do not log generated notices, lease documents, application PDFs, IDs, or payment method payloads directly; log document IDs and workflow IDs instead.
- Support staff access to raw PII must go through product views with RBAC and audit logging, not database logs.
- Production log retention should be shorter than accounting/document retention and must be configurable before public launch.

## Verification

Current executable checks:

```bash
pnpm --filter tenant_portal_backend exec jest --config jest.config.js --selectProjects unit --runTestsByPath src/shared/audit-log.service.spec.ts --runInBand
pnpm --filter tenant_portal_backend build
```

Future hardening:

- Add request/response log scrubbing if HTTP logging middleware is introduced.
- Add redaction checks for AI gateway prompts and tool traces before enabling production AI observability.
- Add export/delete workflows for consumer privacy requests before expanding beyond Kansas private beta.
