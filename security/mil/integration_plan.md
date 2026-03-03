# MIL Service Integration & Audit Logging Plan

This document outlines the steps to integrate the MIL service into the PMS backend and implement the required audit logging for sensitive cryptographic operations.

## Phase 1: Service Deployment

1.  **Containerize the Service:** Create a Dockerfile for the MIL service based on the `package.json` and `tsconfig.json`.
2.  **Database Migrations:** Integrate the SQL migration files from `pms-master/security/mil/migrations/` into the main PMS database deployment pipeline. They must run before the MIL service starts.
3.  **Configuration & Secrets:**
    -   Add the required environment variables to the PMS secret management system (e.g., Vault, AWS Secrets Manager).
    -   `DATABASE_URL`
    -   `MIL_ATTESTATION_PRIVATE_KEY_BASE64` (Generate and store securely)
    -   `MIL_ATTESTATION_KID`
    -   `MIL_MASTER_KEK_BASE64` (Generate and store securely)
4.  **Deployment:** Deploy the MIL service as a standalone microservice within the PMS Kubernetes cluster or ECS environment.

## Phase 2: API Integration

1.  **Client Generation:** Use the `mil_openapi_v1.yaml` to generate a TypeScript client for the MIL service. This client will be used by other PMS services.
2.  **Payload Encryption:**
    -   Identify all services that handle sensitive data that should be encrypted at rest (e.g., payment details, personal identification).
    -   Modify the data access layer in these services to call the MIL service to encrypt payloads before writing to the database and decrypt them after reading. This will use the "envelope encryption" pattern described in the MIL `README`.
3.  **Tenant Lifecycle:**
    -   When a new tenant is created in PMS, a corresponding call must be made to the MIL service to provision their initial Key Encryption Key (KEK).
    -   When a tenant is deleted, a call must be made to the MIL service's `crypto_delete` endpoint to destroy their KEKs. This action must be heavily guarded and logged.

## Phase 3: Audit Logging

The goal is to have a clear, immutable record of all sensitive cryptographic events.

1.  **Identify Audit Events:** The following actions within the MIL service are critical and must generate an audit event:
    -   `tenant.key.created`
    -   `tenant.key.rotated.initiated`
    -   `tenant.key.rotated.completed`
    -   `tenant.key.rotated.failed`
    -   `tenant.key.deleted` (for crypto-delete)
    -   `payload.encrypted`
    -   `payload.decrypted`

2.  **Integrate with PMS Audit Stream:**
    -   The MIL service will be given credentials to publish events to the central PMS `AUDIT_EVENT` stream (e.g., a Kafka topic or Kinesis stream).
    -   Each audit event payload will include:
        -   `eventId` (unique)
        -   `timestamp`
        -   `eventName` (from the list above)
        -   `actor` (e.g., `system:pms-payments-service`, `user:admin_johndoe`)
        -   `tenantId`
        -   `details` (e.g., `keyId`, `source`, `outcome`)

3.  **Log Storage & Analysis:**
    -   Ensure the `AUDIT_EVENT` stream archives to a long-term, tamper-resistant storage solution (e.g., S3 with object lock).
    -   Set up alerts in the security monitoring tool (e.g., Splunk, Datadog) for high-severity audit events, such as `tenant.key.deleted` or repeated `tenant.key.rotated.failed` events.

## Completion Criteria (from Integration Map)

-   **Key lifecycle is recoverable:** The created runbooks and the service's built-in recovery mechanisms satisfy this.
-   **Key lifecycle is observable:** The audit logging plan will make the lifecycle observable.
-   **Key lifecycle is documented:** The runbooks provide the necessary documentation.
