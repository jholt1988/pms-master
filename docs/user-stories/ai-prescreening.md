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

### 🔷 Property OS Augmentation
- **Expected Loss Definition:** The financial risk of accepting an applicant with falsified income or the cost of compliance penalties from storing excessive PII.
- **ActionIntent Mapping:** Produces `IncomeVerifiedIntent` which is consumed by the risk scoring system.
- **Priority Logic:** High priority for applicants with stable, recurring deposits versus erratic lump-sum patterns.

### 🔷 UI Enhancements
- Risk indicators showing the probability of income stability over the next 12 months.
- Expected loss display showing the projected monetary impact of a default based on the verified income.
- Visual prioritization ranking applications by verified income stability.

### 🔷 Simulation Layer
- Scenario modeling to compare the likelihood of default for edge-case incomes under different macroeconomic conditions.

### 🔷 Feedback & Learning
- Track actual tenant payment history against the initial predicted income stability.
- Feed variance back into the verification model to adjust future risk scoring.

### 🔷 Model Integrity & Governance
- Allow admin to override and manually approve alternative verifiable income forms with required justification.

### 🔷 Execution Flow
- **Trigger**: Applicant initiates the background/income check phase of the application form.
- **Preconditions**: Applicant has consented to third-party bank linking; system has received valid Plaid/Teller integration tokens.
- **Execution Intent**: Securely ingest raw bank transaction data to calculate an objective, verified net income average without handling PDFs.
- **System Changes**: A standard immutable `VerifiedIncomeRecord` is attached to the applicant's profile.
- **Output**: An `IncomeVerifiedIntent` payload containing the calculated average income, confidence score, and verification timestamp.

### 🔷 State Transition
- **Before State**: `Applicant.IncomeVerification = Pending`
- **After State**: `Applicant.IncomeVerification = Verified` OR `Applicant.IncomeVerification = Failed` (if bank integration is rejected/insufficient).

### 🔷 Lifecycle Continuity
- **Upstream Source**: Prospect completing the initial Applicant Profile via the Web Portal.
- **Downstream Paths**: Proceeds to `DecisionEngine` for final tenancy scoring, OR enters `ManualReview` if the Plaid connection fails.

**Story 1.2: Passive Biometric Identity Verification**
- **As a** Prospective Tenant
- **I want to** verify my identity by capturing a 3-second live selfie video matched against my scanned government ID
- **So that** my application is highly secure against identity theft and skip-traces are minimized.
- **Acceptance Criteria:**
  - [ ] Liveness detection AI ensures the applicant is a real person and not using a high-res photo or deepfake.
  - [ ] Facial recognition safely maps the selfie to the ID document with high confidence scoring.
  - [ ] Data is ephemeral; biometric vectors are deleted immediately post-validation to satisfy privacy laws (BIPA).

### 🔷 Property OS Augmentation
- **Expected Loss Definition:** The probable loss from a skip-trace identity fraud scenario ($10,000+ per unit eviction/recovery cost).
- **ActionIntent Mapping:** Produces `BiometricValidatedIntent` to authorize application advancement.
- **Priority Logic:** Applications missing biometric validation are deprioritized or flagged with manual intervention flags.

### 🔷 UI Enhancements
- Security risk indicator visualizing the liveness match confidence score.
- Dashboard alerts explicitly explaining "Why this action? - Identity verification confidence below 95% threshold".

### 🔷 Feedback & Learning
- Track false positives/negatives in biometric matching against eventual fraud discovery.
- Improve underlying identity heuristics using obfuscated match performance metrics.

### 🔷 Model Integrity & Governance
- Provide a clear fallback mechanism for human verification if biometrics fail.

### 🔷 Execution Flow
- **Trigger**: Applicant completes the ID upload step of the application.
- **Preconditions**: Valid photo ID document is parsed; user device camera is accessible.
- **Execution Intent**: Run liveness checks and facial comparison against the ID to confirm physical identity.
- **System Changes**: The biometric match score is logged into the application security matrix.
- **Output**: `BiometricValidatedIntent` (Pass/Fail) and deletion of the raw biometric vectors.

### 🔷 State Transition
- **Before State**: `Application.IdentityVerification = Unverified`
- **After State**: `Application.IdentityVerification = Passed_Biometrics` OR `Application.IdentityVerification = Flagged_Manual_Review`

### 🔷 Lifecycle Continuity
- **Upstream Source**: Application flow immediately following basic PII entry.
- **Downstream Paths**: Application moves to credit/background check phase if successful; otherwise, routes to PM Audit Queue.

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

### 🔷 Property OS Augmentation
- **Expected Loss Definition:** Calculates the precise loss exposure ($ lease value) if the fabricated financial document was accepted.
- **ActionIntent Mapping:** Consumes uploaded documents; produces a `FraudReviewIntent`.
- **Priority Logic:** Audits are ranked strictly by highest risk exposure and highest model confidence of forgery.

### 🔷 UI Enhancements
- Fraud severity indicators color-coding applications in the queue (Red = Critical Forgery, Yellow = Anomaly).
- Quantified loss exposure display ($) on hover over the forged document.
- Explicit visual explanation attached to the heat-map stating exactly why the area is flagged.

### 🔷 Simulation Layer
- Simulates the risk cost of accepting a marginally manipulated document vs requesting a new bank integration.

### 🔷 Feedback & Learning
- Monitor subsequent human review outcomes to reduce anomaly false-positive rates.
- Add confirmed forged documents to the training dataset.

### 🔷 Model Integrity & Governance
- Human-in-the-loop requirement to permanently reject an application solely based on forgery likelihood.

### 🔷 Execution Flow
- **Trigger**: Applicant uploads a financial document (e.g., PDF paystub, bank statement).
- **Preconditions**: Target document successfully uploaded to the temporary ingestion bucket.
- **Execution Intent**: Parse PDF layers and metadata to detect digital tampering or logical inconsistencies in the document text.
- **System Changes**: Document is permanently tagged with a forgery confidence score; application risk state is updated.
- **Output**: `FraudReviewIntent` if forgery > 90%; otherwise, a `DocumentCleared` event.

### 🔷 State Transition
- **Before State**: `Document.Status = Pending_Scan`
- **After State**: `Document.Status = Cleared` OR `Document.Status = Quarantined` (with associated alert).

### 🔷 Lifecycle Continuity
- **Upstream Source**: Document upload component in the standard manual application flow (fallback for non-Plaid users).
- **Downstream Paths**: Routes to manual PM review if Quarantined; proceeds to Income Calculation if Cleared.

**Story 2.2: Algorithmic Fair Housing Guardrails**
- **As a** Property Owner / PM
- **I want to** ensure the prescreening AI exclusively uses equitable, non-discriminatory variables strictly related to financial viability
- **So that** my screening process is legally bulletproof against Fair Housing Act (FHA) disparate impact violations.
- **Acceptance Criteria:**
  - [ ] Model architecture mathematically excludes zip codes, demographic proxies, and names from the decision matrix before risk scoring.
  - [ ] Regular automated "Bias Audits" simulate thousands of demographic profiles through the model to monitor and certify statistical parity.
  - [ ] A "Traceability Log" explains to the PM in plain English *why* an application was flagged (e.g., "Rent-to-Income ratio is 55%, minimum required is 33%").

### 🔷 Property OS Augmentation
- **Expected Loss Definition:** The potential liability and legal costs associated with a Fair Housing lawsuit versus the opportunity cost of denying a valid applicant.
- **ActionIntent Mapping:** Produces `FairHousingAuditIntent` before issuing any lease decisions.
- **Priority Logic:** Applications with flagged parity alerts immediately escalated above standard work streams.

### 🔷 UI Enhancements
- Compliance health dashboard with continuous statistical parity alerts.
- Decision explanation explicitly confirming the exclusion of protected classes in the scoring.

### 🔷 Feedback & Learning
- Aggregate applicant demographic acceptance rates against county-level baselines over trailing 12 months.
- Automatically retrain algorithms if drift is detected outside FHA parity boundaries.

### 🔷 Model Integrity & Governance
- Complete immutability of the removed demographic variables in the algorithmic reasoning trail.

### 🔷 Execution Flow
- **Trigger**: System prepares to run the Predictive Tenancy Risk Score on a completed application.
- **Preconditions**: All required applicant data (income, credit, rental history) has been gathered.
- **Execution Intent**: Strip all protected class proxies (zip codes, names) from the data payload before it is submitted to the ML risk model.
- **System Changes**: A sanitized, mathematically "fair" temporary payload is generated for the scoring engine.
- **Output**: `FairHousingAuditIntent` containing the sanitized matrix and a parity check pass/fail boolean.

### 🔷 State Transition
- **Before State**: `Application.DataState = Raw`
- **After State**: `Application.DataState = Sanitized_For_Scoring`

### 🔷 Lifecycle Continuity
- **Upstream Source**: Finalization of the application data gathering phase.
- **Downstream Paths**: Exclusively directly upstream of the Predictive Tenancy Risk Scoring execution.

### 🔷 Execution Context
- **Lifecycle Role**: Governance and Compliance Middleware.
- **Enabled Capabilities**: Safe, legally-defensible ML scoring.
- **Dependencies**: Depends on the accuracy of the predefined prohibited variable list.

**Story 2.3: Predictive Tenancy Risk Scoring**
- **As a** Property Manager
- **I want to** receive a comprehensive "Tenancy Success Score" that weighs credit, predictive debt-to-income limits, and verified rental history
- **So that** the system instantly auto-approves A-tier applicants, turning them into signed leases before competitors can process them.
- **Acceptance Criteria:**
  - [ ] Applicants scoring above a PM-defined threshold (e.g., >850 Tenant Score) bypass human review entirely, automatically generating and sending the Lease Draft via API.
  - [ ] Model continuously learns from past eviction/delinquency data (Internal Data Sandbox) to refine the weighting of what makes a successful tenant at that specific property class.

### 🔷 Property OS Augmentation
- **Expected Loss Definition:** Calculates the total expected delinquency, turn cost, and vacancy days based on the predictive score.
- **ActionIntent Mapping:** Consumes all tenant data streams to emit an `ApproveTenantIntent` or `DeclineTenantIntent`.
- **Priority Logic:** Ranks applicants by lowest expected risk and highest lifetime value metrics.

### 🔷 UI Enhancements
- Total expected loss/ROI projection visible per scored applicant.
- Side-by-side comparative ranking to visually suggest the optimal applicant for a unit.
- Explicit reasoning log showing exact weight distributions (e.g., "Approved due to 88% credit strength and 100% verified rent history").

### 🔷 Simulation Layer
- Compares outcomes of holding the unit vacant for 10 more days vs. accepting the highest current but slightly riskier applicant.
- Evaluates p50/p90/worst-case scenarios for the specific applicant based on similar historical profiles.

### 🔷 Feedback & Learning
- Automatically compares the predictive tenancy score to the actual behavior (payment timeliness) through the duration of the lease.
- Feed variance directly into weights for future scoring rounds.

### 🔷 Model Integrity & Governance
- Provide manual override allowing PMs to override rejection, enforcing mandatory written justifications.

### 🔷 Execution Flow
- **Trigger**: Receipt of the `FairHousingAuditIntent` (cleared sanitized data) for a complete application.
- **Preconditions**: Income verified, ID validated, and data explicitly stripped of FHA-protected proxies.
- **Execution Intent**: Calculate the overarching probability of lease default, weighted by historical portfolio data.
- **System Changes**: Applicant is assigned a definitive `TenancySuccessScore` (e.g., 850) and a system decision.
- **Output**: `ApproveTenantIntent` OR `DeclineTenantIntent`, triggering automated communications.

### 🔷 State Transition
- **Before State**: `Application.DecisionState = Under_Review`
- **After State**: `Application.DecisionState = Approved` OR `Application.DecisionState = Rejected` OR `Application.DecisionState = Waitlisted`.

### 🔷 Lifecycle Continuity
- **Upstream Source**: Output of the algorithmic fair housing guardrails.
- **Downstream Paths**: If Approved, automatically triggers the Ledger & Smart Contracts system to Draft the Lease. If Rejected, sends FCRA compliant adverse action letter.
