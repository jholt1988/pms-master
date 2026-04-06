# User Stories: Web Portal (Tenant & Management)

**Module:** `tenant_portal_app`
**Focus:** Bringing an industry-leading, frictionless web experience to Tenants and Property Managers (PMs) through omnichannel support, unified dashboards, and highly automated workflows.

---

## 1. Persona: Tenant

### Epic: Frictionless Move-In & Lease Management
**Story 1.1: Immersive Digital Move-In**
- **As a** Tenant
- **I want to** complete my move-in checklist, review utilities setup, and sign documents from a unified, gamified web dashboard
- **So that** I have zero administrative overhead on move-in day and automatically receive recommendations for local smart-home integrations.
- **Acceptance Criteria:**
  - [ ] Dashboard displays a 3D or visually engaging "Move-In Journey" map.
  - [ ] Automated integration with utility providers allows one-click service enablement.
  - [ ] AI chatbot proactively offers support during onboarding, anticipating common FAQs based on lease addenda.

### 🔷 Property OS Coverage
- **Coverage Level:** Partial
- **Reason:** This is a UI/UX conversion and support feature. While it uses AI (chatbots), it primarily serves to reduce support tickets rather than executing high-stakes financial priority logic.

### 🔷 Execution Flow
- **Trigger**: Tenant logs into the portal for the first time post-lease execution.
- **Preconditions**: Lease is Active. Move-in date is within standard bounding (-7 to +7 days).
- **Execution Intent**: Guide the tenant through mandatory administrative setups (utilities, renter's insurance) using a persistent workflow state.
- **System Changes**: `MoveInChecklist` items are sequentially marked complete.
- **Output**: Generates a `MoveInCompleteIntent` upon 100% checklist fulfillment.

### 🔷 State Transition
- **Before State**: `Tenant.Onboarding = Incomplete`
- **After State**: `Tenant.Onboarding = Complete`

### 🔷 Lifecycle Continuity
- **Upstream Source**: The successful execution of a lease contract.
- **Downstream Paths**: Terminal for onboarding; transitions tenant to standard "active resident" portal view.

### 🔷 Execution Context
- **Lifecycle Role**: Tenant retention and administrative compliance offloading.
- **Enabled Capabilities**: Guaranteed compliance for renter's insurance and utility transfers.
- **Dependencies**: Depends on external utility and insurance provider verification APIs.

**Story 1.2: Predictive Maintenance & Self-Triage**
- **As a** Tenant
- **I want to** submit maintenance requests through an AI-powered conversational interface that automatically triages the issue
- **So that** simple fixes can be suggested immediately (reducing wait times) and complex issues are auto-categorized and prioritized without human routing.
- **Acceptance Criteria:**
  - [ ] Uploading a photo uses computer vision to automatically detect the appliance brand and failure type.
  - [ ] Conversation agent offers "Self-Fix" videos for low-risk issues (e.g., garbage disposal reset).
  - [ ] System automatically suggests inspection dates by comparing tenant calendar availability with technician schedules.

### 🔷 Property OS Augmentation
- **Expected Loss Definition:** Compares the cost of delayed maintenance (water damage compounding) against the cost of an emergency after-hours dispatch.
- **ActionIntent Mapping:** Consumes ticket details and calendar availability to produce a `ScheduleMaintenanceIntent`.
- **Priority Logic:** Automatically elevates tickets with structural risk (e.g., HVAC failure in winter) above cosmetic requests, overriding standard SLA timers.

### 🔷 UI Enhancements
- Triage reasoning displayed to the tenant: "Your issue has been categorized as High Priority (Water Risk) and jumped the queue."

### 🔷 Simulation Layer
- Simulates the cascading scheduling delays if an emergency ticket forces the rescheduling of 5 cosmetic tickets.

### 🔷 Feedback & Learning
- Tracks if the "Self-Fix" videos actually prevent technician dispatches and tunes the recommendation engine to stop showing ineffective videos.

- PM maintains full visibility into the AI's schedule routing and can manually force-dispatch a vendor if the automated triage miscalculates severity.

### 🔷 Execution Flow
- **Trigger**: Tenant submits a text prompt or photo via the maintenance dialogue.
- **Preconditions**: Natural language is parsed into issue categorization; calendar matrices for tenant/vendors are accessible.
- **Execution Intent**: Assess the urgency of the repair, propose timeslots matching technician routes, and soft-lock the dispatch.
- **System Changes**: A `MaintenanceTicket` is instantiated with severity, trade category (e.g., Plumbing), and proposed timeslots.
- **Output**: `ScheduleMaintenanceIntent` pushed to the PM/Vendor queues.

### 🔷 State Transition
- **Before State**: `WorkOrder = Unsubmitted`
- **After State**: `WorkOrder = Triaged_And_Scheduled` OR `WorkOrder = Escalated_Emergency`

### 🔷 Lifecycle Continuity
- **Upstream Source**: Tenant UX action in the web portal or mobile app.
- **Downstream Paths**: Outputs routing directions to the Mobile Task Routing application for the field technician.

**Story 1.3: Frictionless Financial Hub & Micro-investing (Optional)**
- **As a** Tenant
- **I want to** view rent payments, automatic ledger splits with roommates, and opt into rent-reporting for credit building directly from the finance hub
- **So that** managing shared finances is completely automated, and paying rent provides tangible long-term financial benefits.
- **Acceptance Criteria:**
  - [ ] Ability to invite roommates and dynamically split rent percentages.
  - [ ] Dashboard shows real-time impact of rent payments on credit scores (Equifax/Experian/TransUnion sync).
  - [ ] Support for paying via Plaid bank-link, Apple Pay on Web, and crypto-wallets.

### 🔷 Property OS Augmentation
- **Expected Loss Definition:** Calculates the probabilistic risk of chargebacks or NSF (Non-Sufficient Funds) fees based on the payment method chosen.
- **ActionIntent Mapping:** Consumes `InitiatePaymentIntent` and produces `UpdateTenantCreditIntent` via reporting pipelines.
- **Priority Logic:** System subtly prioritizes/incentivizes ACH bank-links over credit cards to minimize processing fee loss for the owner.

### 🔷 UI Enhancements
- Interactive dial tracking credit score improvements based on consecutive on-time rent reporting.

### 🔷 Feedback & Learning
- Monitor which payment pathways harbor the highest delinquency recovery rates and adapt UI prompts to encourage those rails for risky tenants.

- Explicit opt-in records required under FCRA (Fair Credit Reporting Act) before sharing tenant ledger data with Equifax/Experian.

### 🔷 Execution Flow
- **Trigger**: Tenant clicks "Setup Payment" or "Enable Credit Building" within the Web Portal.
- **Preconditions**: Tokenized banking integration must be ready; tenant must successfully pass Identity/KYC requirements.
- **Execution Intent**: Vault payment credentials or establish credit bureau sync pipes for consecutive on-time reporting.
- **System Changes**: `PaymentMethod` object is securely tokenized; `CreditReporting` configuration is set to active.
- **Output**: Submits `InitiatePaymentIntent` toward the Zero-Latency Ledger system.

### 🔷 State Transition
- **Before State**: `Tenant.PaymentMethod = Missing`, `Tenant.CreditSync = Disabled`
- **After State**: `Tenant.PaymentMethod = Vaulted`, `Tenant.CreditSync = Enabled`

### 🔷 Lifecycle Continuity
- **Upstream Source**: Move-In Onboarding flow or arbitrary tenant settings change.
- **Downstream Paths**: Downstream dependency for the Zero-Latency Payment core and automated late-fee calculation.

---

## 2. Persona: Property Manager (PM) / Admin / Owner

### Epic: Autonomous Property Management
**Story 2.1: Unified Command Center & Anomaly Detection**
- **As a** Property Manager
- **I want to** view a "Command Center" dashboard that uses anomaly detection to highlight properties requiring my immediate attention
- **So that** I don't waste time reviewing healthy properties and instead focus on predictive risk (e.g., impending vacancy, pending maintenance disaster).
- **Acceptance Criteria:**
  - [ ] Dashboard curates a daily "Action Item" list driven by machine learning (e.g., "Unit 102 HVAC showing high energy usage, schedule preventative maintenance before failure").
  - [ ] Financial alerts highlight significant deviations from trailing 12-month OPEX averages.
  - [ ] Portfolio-level heatmaps visually depict financial health, occupancy risk, and tenant satisfaction sentiment.

### 🔷 Property OS Augmentation
- **Expected Loss Definition:** Aggregates portfolio-wide risk mapping down to a single dollar-value exposure metric (e.g., "Currently exposed to $45,000 in flight risk this month").
- **ActionIntent Mapping:** Consumes telemetry to trigger `PortfolioReviewIntent`.
- **Priority Logic:** Ranks command center tiles strictly by highest variance to the trailing 12-month median, hiding nominal operations.

### 🔷 UI Enhancements
- Anomaly alerts with built-in "Quick Actions" (e.g., direct generation of a retention offer if vacancy risk spikes).

### 🔷 Simulation Layer
- Models macroeconomic shifts (e.g., interest rate changes) against the current tenant demographic to project portfolio delinquency risk 6 months out.

### 🔷 Feedback & Learning
- Evaluates the accuracy of the anomaly detector by having PMs click "Useful" or "Noise" on command center alerts.

- "Noise" overrides are logged to ensure PMs aren't muting critical financial early-warning systems masking poor property performance.

### 🔷 Execution Flow
- **Trigger**: Automated nightly data aggregation or an ad-hoc PM login.
- **Preconditions**: Full data warehousing integration spanning maintenance, finance, and leasing systems must be up to date.
- **Execution Intent**: Run statistical variance checks against the trailing 12-month means for key performance indicators (KPIs) and flag deviations above 1-Sigma.
- **System Changes**: Temporary `AnomalyAlert` rows are cached for rendering in the presentation layer.
- **Output**: A fully populated Command Center UI dispatching a `PortfolioReviewIntent`.

### 🔷 State Transition
- **Before State**: `Dashboard.ViewState = Stale`
- **After State**: `Dashboard.ViewState = Real_Time_Refreshed` (with anomaly tiles highlighted).

### 🔷 Lifecycle Continuity
- **Upstream Source**: Mass telemetry streams from every subsystem (Leasing, Maintenance, Accounting).
- **Downstream Paths**: Resolving an anomaly triggers downstream workflows (e.g., initiating a capital improvement or eviction action).

**Story 2.2: Omnichannel Universal Inbox & Sentiment Analysis**
- **As an** Admin / PM
- **I want to** manage tenant communications (SMS, Email, Portal Chat, Voice summaries) from a single Unified Inbox equipped with Sentiment Analysis
- **So that** I can instantly gauge the urgency and emotion of tenant requests, responding efficiently or allowing AI to auto-Draft responses.
- **Acceptance Criteria:**
  - [ ] Incoming messages are automatically tagged with sentiment markers (Positive, Neutral, Frustrated, Urgent).
  - [ ] AI Draft suggests 3 contextual responses saving the PM from typing repetitive answers.
  - [ ] Auto-translation detects languages and translates incoming/outgoing messages in real time.

### 🔷 Property OS Augmentation
- **Expected Loss Definition:** Cost of escalated disputes and legal friction caused by miscommunication vs nominal cost of LLM token processing.
- **ActionIntent Mapping:** Consumes `InboundMessageIntent`, analyzes sentiment, and produces `DraftResponseIntent`.
- **Priority Logic:** Inbox dynamically re-sorts, pushing "Frustrated" or "Urgent" sentiment messages to the top immediately.

### 🔷 UI Enhancements
- Color-coded sentiment tags (Red/Yellow/Green) next to every inbox thread.
- "Confidence level" indicator showing how certain the AI is about the auto-drafted response.

### 🔷 Feedback & Learning
- If the PM heavily edits an AI-Drafted response prior to sending, the delta is locally cached to improve the prompt weighting for that specific tenant.

- AI is restricted from legally binding the property (e.g., auto-approving a lease break) without requiring a human PM to click "Send."

### 🔷 Execution Flow
- **Trigger**: Ingestion webhook fires from SMS, Email, or the built-in Portal chat.
- **Preconditions**: The message's sender identity must be mapped to a known Tenant or Prospect ID.
- **Execution Intent**: Process the text through an LLM to assign sentiment metadata and draft contextual replies using RAG (Retrieval-Augmented Generation) against property policies.
- **System Changes**: A unified `ThreadMessage` is created and annotated with `SentimentScore`.
- **Output**: `DraftResponseIntent` populated in the PM's single-pane-of-glass inbox.

### 🔷 State Transition
- **Before State**: `Inbox.Thread = Unread_Uncategorized`
- **After State**: `Inbox.Thread = Triage_Categorized_With_Draft`

### 🔷 Lifecycle Continuity
- **Upstream Source**: Inbound tenant communications via multiple uncoupled channels.
- **Downstream Paths**: Allows PM to finalize and send a response, resolving the `ThreadState` to closed.

### 🔶 Unresolved Dependency
- **Missing Link**: Outbound SMS/Email provider configuration.
- **Why Missing**: It is unclear if we are using an internal notification microservice or direct SendGrid/Twilio integrations for outbound dispatch.
- **Impact**: While the inbox curates and drafts responses, actual message delivery requires the underlying notification fabric.

**Story 2.3: Owner Portfolio Deep-Dive & Yield Projections**
- **As a** Property Owner
- **I want to** access a real-time investor portal that models future ROI, capital expenditure amortization, and predictive asset appreciation
- **So that** I can make high-level capital decisions without needing to request static PDF reports from my managers.
- **Acceptance Criteria:**
  - [ ] Investor view highlights Cap Rate, Cash on Cash Return, and Net Operating Income (NOI) dynamically.
  - [ ] "What-If" sliders allow owners to model the ROI of capital improvements (e.g., "If I upgrade kitchens in Building B, how does that impact modeled rent rates and IRR over 5 years?").
  - [ ] Drill-down capabilities from highest-level portfolio view down to a specific unit's maintenance ledger.

### 🔷 Property OS Augmentation
- **Expected Loss Definition:** Cost of capital misallocation due to static spreadsheet analysis vs real-time algorithmic forecasting.
- **ActionIntent Mapping:** Consumes property data to execute `CapitalAllocationIntent`.
- **Priority Logic:** Highlights sub-performing assets against internal benchmarks to direct owner attention instantly.

### 🔷 UI Enhancements
- Interactive "What-If" sliders manipulating real-time charts rather than generating static PDF reports.

### 🔷 Simulation Layer
- Deep Monte Carlo simulation of capital expenditures yielding IRR (Internal Rate of Return) ranges over 1, 3, and 5-year holds.

### 🔷 Feedback & Learning
- Continually cross-references the predictive asset appreciation models against actual market sales comps to automatically recalibrate portfolio net worth.

- Tracks all parameters used in the ROI calculation, allowing third-party auditors (or lenders) to trace the exact mathematical assumptions supporting a property's displayed valuation.

### 🔷 Execution Flow
- **Trigger**: Owner accesses the Investor deep-dive module.
- **Preconditions**: Owner must have confirmed syndicate credentials tied securely to the specific LLC/Asset entity.
- **Execution Intent**: Calculate live performance metrics (NOI, IRR) by reading the unified accounting layer and correlating with market assumptions.
- **System Changes**: Execution is read-only against production financial data; generates client-side render state only.
- **Output**: Generates a rich, interactive data-visualization DOM `CapitalAllocationIntent`.

### 🔷 State Transition
- **Before State**: `InvestorPortal = Un-Rendered`
- **After State**: `InvestorPortal = Interactive_Dashboard_Loaded`

### 🔷 Lifecycle Continuity
- **Upstream Source**: Aggregate data from the Accounting ERP and Ledger systems.
- **Downstream Paths**: Terminal analytical presentation layer. No system state mutates without an explicit external governance vote/transfer.

### 🔷 Execution Context
- **Lifecycle Role**: High-level Owner advising mechanism.
- **Enabled Capabilities**: Automated, non-manual investor reporting.
- **Dependencies**: Depends entirely on the accuracy and real-time syncing of the `Frictionless Accounting Sync`.
