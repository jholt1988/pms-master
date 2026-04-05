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

**Story 1.2: Predictive Maintenance & Self-Triage**
- **As a** Tenant
- **I want to** submit maintenance requests through an AI-powered conversational interface that automatically triages the issue
- **So that** simple fixes can be suggested immediately (reducing wait times) and complex issues are auto-categorized and prioritized without human routing.
- **Acceptance Criteria:**
  - [ ] Uploading a photo uses computer vision to automatically detect the appliance brand and failure type.
  - [ ] Conversation agent offers "Self-Fix" videos for low-risk issues (e.g., garbage disposal reset).
  - [ ] System automatically suggests inspection dates by comparing tenant calendar availability with technician schedules.

**Story 1.3: Frictionless Financial Hub & Micro-investing (Optional)**
- **As a** Tenant
- **I want to** view rent payments, automatic ledger splits with roommates, and opt into rent-reporting for credit building directly from the finance hub
- **So that** managing shared finances is completely automated, and paying rent provides tangible long-term financial benefits.
- **Acceptance Criteria:**
  - [ ] Ability to invite roommates and dynamically split rent percentages.
  - [ ] Dashboard shows real-time impact of rent payments on credit scores (Equifax/Experian/TransUnion sync).
  - [ ] Support for paying via Plaid bank-link, Apple Pay on Web, and crypto-wallets.

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

**Story 2.2: Omnichannel Universal Inbox & Sentiment Analysis**
- **As an** Admin / PM
- **I want to** manage tenant communications (SMS, Email, Portal Chat, Voice summaries) from a single Unified Inbox equipped with Sentiment Analysis
- **So that** I can instantly gauge the urgency and emotion of tenant requests, responding efficiently or allowing AI to auto-Draft responses.
- **Acceptance Criteria:**
  - [ ] Incoming messages are automatically tagged with sentiment markers (Positive, Neutral, Frustrated, Urgent).
  - [ ] AI Draft suggests 3 contextual responses saving the PM from typing repetitive answers.
  - [ ] Auto-translation detects languages and translates incoming/outgoing messages in real time.

**Story 2.3: Owner Portfolio Deep-Dive & Yield Projections**
- **As a** Property Owner
- **I want to** access a real-time investor portal that models future ROI, capital expenditure amortization, and predictive asset appreciation
- **So that** I can make high-level capital decisions without needing to request static PDF reports from my managers.
- **Acceptance Criteria:**
  - [ ] Investor view highlights Cap Rate, Cash on Cash Return, and Net Operating Income (NOI) dynamically.
  - [ ] "What-If" sliders allow owners to model the ROI of capital improvements (e.g., "If I upgrade kitchens in Building B, how does that impact modeled rent rates and IRR over 5 years?").
  - [ ] Drill-down capabilities from highest-level portfolio view down to a specific unit's maintenance ledger.
