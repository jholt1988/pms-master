# User Stories: AI-Powered Applicant Prescreening

**Module:** `ai_prescreening_service`
**Focus:** Radically decreasing application processing time from days to seconds while eliminating implicit bias, detecting sophisticated document fraud, and utilizing passive biometrics.

---

## 1. Persona: Tenant (Applicant)

### Epic: The Instant, Equitable Application
**Story 1.1: Bank-Linked Instant Income Verification**
- **As a** Prospective Tenant
- **I want to** authenticate my bank account via a secure OAuth portal (e.g., Plaid/Teller) during the application rather than uploading PDF pay stubs
- **So that** my income and rental payment history are verified instantly without manually redacting sensitive documents.
- **Acceptance Criteria:**
  - [ ] System automatically calculates Average Monthly Net Income directly from bank transaction histories, excluding anomalous lump sums.
  - [ ] Plaid/Teller API integration generates an immutable "Verified Income Data Card" injected right into the application payload.
  - [ ] Zero PDF storage required, reducing PII exposure dramatically.

**Story 1.2: Passive Biometric Identity Verification**
- **As a** Prospective Tenant
- **I want to** verify my identity by capturing a 3-second live selfie video matched against my scanned government ID
- **So that** my application is highly secure against identity theft and skip-traces are minimized.
- **Acceptance Criteria:**
  - [ ] Liveness detection AI ensures the applicant is a real person and not using a high-res photo or deepfake.
  - [ ] Facial recognition safely maps the selfie to the ID document with high confidence scoring.
  - [ ] Data is ephemeral; biometric vectors are deleted immediately post-validation to satisfy privacy laws (BIPA).

---

## 2. Persona: Admin / PM / Owner

### Epic: Fraud Elimination & Fair Housing Compliance
**Story 2.1: Automated PDF Forgery Detection**
- **As an** Admin / PM
- **I want to** have an AI model automatically scan any uploaded paystub, bank statement, or employment letter for digital alterations
- **So that** I am protected against the rising tide of sophisticated application fraud and fabricated financial documents.
- **Acceptance Criteria:**
  - [ ] Computer Vision / ML service extracts document metadata (EXIF/XMP) and flags discrepancies in font rendering, layered object manipulations, or mismatched creation dates.
  - [ ] If fraud is detected with >90% confidence, the application is sequestered in a "High-Risk Audit Queue" rather than auto-declined.
  - [ ] PM sees a visual heat-map of exactly where the PDF was tampered with (e.g., a changed digit in the "Net Salary" field).

**Story 2.2: Algorithmic Fair Housing Guardrails**
- **As a** Property Owner / PM
- **I want to** ensure the prescreening AI exclusively uses equitable, non-discriminatory variables strictly related to financial viability
- **So that** my screening process is legally bulletproof against Fair Housing Act (FHA) disparate impact violations.
- **Acceptance Criteria:**
  - [ ] Model architecture mathematically excludes zip codes, demographic proxies, and names from the decision matrix before risk scoring.
  - [ ] Regular automated "Bias Audits" simulate thousands of demographic profiles through the model to monitor and certify statistical parity.
  - [ ] A "Traceability Log" explains to the PM in plain English *why* an application was flagged (e.g., "Rent-to-Income ratio is 55%, minimum required is 33%").

**Story 2.3: Predictive Tenancy Risk Scoring**
- **As a** Property Manager
- **I want to** receive a comprehensive "Tenancy Success Score" that weighs credit, predictive debt-to-income limits, and verified rental history
- **So that** the system instantly auto-approves A-tier applicants, turning them into signed leases before competitors can process them.
- **Acceptance Criteria:**
  - [ ] Applicants scoring above a PM-defined threshold (e.g., >850 Tenant Score) bypass human review entirely, automatically generating and sending the Lease Draft via API.
  - [ ] Model continuously learns from past eviction/delinquency data (Internal Data Sandbox) to refine the weighting of what makes a successful tenant at that specific property class.
