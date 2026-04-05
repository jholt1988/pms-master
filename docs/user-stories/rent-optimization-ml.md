# User Stories: Rent Optimization & Yield Management

**Module:** `rent_optimization_ml`
**Focus:** Automating pricing strategies, maximizing Net Operating Income (NOI), and minimizing vacancy loss using dynamic, real-time market learning curves.

---

## 1. Persona: Tenant (Applicant / Renewing Resident)

### Epic: Transparent & Flexible Pricing Options
**Story 1.1: Dynamic Lease Term Pricing Options**
- **As a** Tenant (Prospect or Renewing Resident)
- **I want to** see a matrix of dynamically generated rent prices tied to exact lease end-dates
- **So that** I have the freedom to choose a 10-month or 14-month lease that fits my schedule, while receiving a fair, algorithmically derived price.
- **Acceptance Criteria:**
  - [ ] The user interface presents an interactive timeline or matrix where dragging the lease end-date instantly updates the monthly rent cost.
  - [ ] The algorithm incentivizes moving out during high-demand months (e.g., June/July) by lowering the rent for lease terms that end in the summer, and slightly raising rent for terms ending in winter.
  - [ ] Renewal offers are generated transparently 90 days out, allowing tenants ample time to accept dynamically optimized 'early-bird' incentives.

---

## 2. Persona: Admin / PM / Owner

### Epic: Autonomous Revenue Maximization
**Story 2.1: Hyper-Local Market Sentinel & Price Adjustment**
- **As a** Property Manager
- **I want to** utilize an ML model that endlessly scrapes competitive ILS listings within a customizable micro-market radius
- **So that** my daily asking rents are automatically adjusted to respond to competitor supply dumps or spikes in localized demand.
- **Acceptance Criteria:**
  - [ ] Geofenced scraping isolates "comparable" units based on bedroom count, square footage, and luxury tier indexing.
  - [ ] The system proposes a daily "Optimized Rent" for every vacant unit.
  - [ ] PM can set the autopilot mode to fully autonomous (automatically updates ILS syndicate pricing daily) or "Review-Only" (requires PM click-to-approve).

**Story 2.2: Predictive Churn & Renewal Yield Matrix**
- **As an** Asset Manager / Owner
- **I want to** view a "Predictive Churn" dashboard that calculates the probability of specific tenants vacating at the end of their lease
- **So that** I can accurately project vacancy costs versus the risk of pushing a severe rent increase during renewal negotiations.
- **Acceptance Criteria:**
  - [ ] ML Service integrates recent maintenance dispute frequency, payment punctuality, and external market delta to form a "Likelihood to Renew" score for each unit.
  - [ ] Dashboard suggests the mathematically optimal renewal increase percentage that maximizes revenue while avoiding the cost-intensity of a turn (vacancy loss, cleaning, leasing commissions).
  - [ ] Simulator graph projects the financial consequences of bumping rent 3% vs 8% on total portfolio NOI.

**Story 2.3: Amenity Value Extraction Model**
- **As a** Property Owner
- **I want to** run a regression analysis on my portfolio to determine the exact rent premium commanded by specific amenities (e.g., "Smart locks" vs "Hardwood floors")
- **So that** I make data-backed CAPEX decisions rather than guessing what upgrades tenants will pay for.
- **Acceptance Criteria:**
  - [ ] The model isolates variables internally and across comparable scraped listings to find the delta ($/month) attributed to specific features.
  - [ ] Output generates an ROI matrix: "Adding in-unit washer/dryers will cost $1,500/unit and increase market rent capture by $115/mo, resulting in a 13-month payback period."
