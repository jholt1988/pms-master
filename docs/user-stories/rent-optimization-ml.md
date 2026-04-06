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

### 🔷 Property OS Augmentation
- **Expected Loss Definition:** Calculates the probabilistic vacancy loss (turn cost + days empty) if the tenant is priced out vs the lost margin of under-pricing the renewal.
- **ActionIntent Mapping:** System produces a `GenerateRenewalPricingIntent`.
- **Priority Logic:** Prioritizes lease ends occurring in low-demand winter months to aggressively capture early renewals.

### 🔷 UI Enhancements
- Visual matrix for tenants showing exactly how they "save money" by selecting specific dates.
- For PMs, dual display of "Competitor Average" vs "Our Proposal" to justify the algorithm's pricing strategy.

### 🔷 Simulation Layer
- Simulates total portfolio revenue if 50% of expiring leases take the 10-month vs the 14-month option.

### 🔷 Feedback & Learning
- Tracks the acceptance rate of algorithmically generated offers; if acceptance is >80%, the model increases prices in the next cycle.

### 🔷 Model Integrity & Governance
- PM override allows manual adjustment of the generated pricing, with the system permanently logging the variance between human and machine performance.

### 🔷 Execution Flow
- **Trigger**: System clock hits 90 days prior to a lease expiration date for a current active tenant.
- **Preconditions**: Lease must be in good standing (no active eviction intents); property must be accepting renewals.
- **Execution Intent**: Generate a dynamically weighted pricing sheet based on projected seasonality and market vacancy rates to entice renewal.
- **System Changes**: A `RenewalOffer` object is created and bound to the lease renewal terms.
- **Output**: `GenerateRenewalPricingIntent` sent to the tenant portal for UI rendering and notification dispatch.

### 🔷 State Transition
- **Before State**: `Lease.Status = Active_Nearing_End`, `Renewal_Offer = Null`
- **After State**: `Lease.Status = Active_Pending_Renewal_Response`, `Renewal_Offer = Generated/Emailed`

### 🔷 Lifecycle Continuity
- **Upstream Source**: Simple temporal (time-based) trigger scanning active leases daily.
- **Downstream Paths**: If accepted by the tenant, routes back to the Ledger & Smart Contracts module for execution. If ignored/rejected, routes to PM for manual retention attempt or triggers marketing syndication 30 days prior to move-out.

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

### 🔷 Property OS Augmentation
- **Expected Loss Definition:** Lost yield from reacting too slowly to a sudden spike in neighborhood demand.
- **ActionIntent Mapping:** Consumes scraped ILS data to produce a `PriceAdjustmentIntent`.
- **Priority Logic:** Price adjustments are ranked by highest variance from current asking rent.

### 🔷 UI Enhancements
- Autopilot confidence gauge indicating when the ML model feels strongly enough to automate the change.
- Delta indicator showing $ change and % change over the last 7 days for the hyper-local market.

### 🔷 Feedback & Learning
- Correlation engine tracks whether a lowered price actually results in faster lease velocity based on the scrape dates.

### 🔷 Model Integrity & Governance
- Hard price ceilings/floors set by ownership prevent the algorithm from causing a flash-crash in property valuation.

### 🔷 Execution Flow
- **Trigger**: Scheduled execution of the hyper-local scraper (e.g., matching ILS URLs).
- **Preconditions**: The property must have active vacant units and mapped geographical bounding boxes (geofences).
- **Execution Intent**: Ingest competitor prices, detect negative/positive variance thresholds against internal rents, and propose the adjustment.
- **System Changes**: Current `MarketAskRent` on vacant unit entity is updated.
- **Output**: `PriceAdjustmentIntent` routed either securely to ILS syndicators (if autopilot) or to the PM approval dashboard.

### 🔷 State Transition
- **Before State**: `Unit.AskRent = $1500`, `Market.Alignment = Outdated`
- **After State**: `Unit.AskRent = $1475`, `Market.Alignment = Optimized`

### 🔷 Lifecycle Continuity
- **Upstream Source**: Independent web scraping or external data purchasing APIs.
- **Downstream Paths**: Pushes updated pricing downstream to the `Automated Listing Syndication Mesh` module.

### 🔶 Unresolved Dependency
- **Missing Link**: Anti-scraping defenses from ILS platforms.
- **Why Missing**: Major listing sites actively block robotic scraping.
- **Impact**: Without an official data provider API (e.g., RentCast, Costar) or proxies, the scraping mechanism fails.

**Story 2.2: Predictive Churn & Renewal Yield Matrix**
- **As an** Asset Manager / Owner
- **I want to** view a "Predictive Churn" dashboard that calculates the probability of specific tenants vacating at the end of their lease
- **So that** I can accurately project vacancy costs versus the risk of pushing a severe rent increase during renewal negotiations.
- **Acceptance Criteria:**
  - [ ] ML Service integrates recent maintenance dispute frequency, payment punctuality, and external market delta to form a "Likelihood to Renew" score for each unit.
  - [ ] Dashboard suggests the mathematically optimal renewal increase percentage that maximizes revenue while avoiding the cost-intensity of a turn (vacancy loss, cleaning, leasing commissions).
  - [ ] Simulator graph projects the financial consequences of bumping rent 3% vs 8% on total portfolio NOI.

### 🔷 Property OS Augmentation
- **Expected Loss Definition:** The exact dollar value of a tenant vacating (cleaning + leasing commission + vacancy days) compared to the yield of a higher rent bump.
- **ActionIntent Mapping:** Consumes tenant behavioral data to produce a `RetentionRiskIntent`.
- **Priority Logic:** Units with highest predicted churn risk and lowest market rent delta are flagged for immediate retention action.

### 🔷 UI Enhancements
- "Likelihood to Renew" speedometer gauge (Red, Yellow, Green) for every unit approaching renewal.
- "Projected Turn Cost vs. Increased Yield" visual scale for direct comparison.

### 🔷 Simulation Layer
- Full Monte Carlo simulation evaluating portfolio NOI across variable rent increase proposals (3% to 10%).

### 🔷 Feedback & Learning
- Ingest actual tenant responses (Renewed vs Vacated) to refine the baseline "Likelihood to Renew" probability scoring recursively.

### 🔷 Model Integrity & Governance
- Excludes protected class data from the churn prediction model to ensure fair housing compliance.

### 🔷 Execution Flow
- **Trigger**: Batch cron job executed nightly evaluating all tenants crossing the 120-day pre-renewal threshold.
- **Preconditions**: Sufficient historical data for the tenant exists (e.g., at least 6 months of payment history/work orders).
- **Execution Intent**: Calculate a `LikelihoodToRenew` score and run a Monte Carlo cross-reference to suggest an optimized rent increase percentage.
- **System Changes**: `Tenant.ChurnProbabilityScore` and `SuggestedRentIncrease` are updated in the database.
- **Output**: `RetentionRiskIntent` surfaced on the PM command center.

### 🔷 State Transition
- **Before State**: `Tenant.RiskProfile = Stale`
- **After State**: `Tenant.RiskProfile = Churn_Risk_Evaluated`

### 🔷 Lifecycle Continuity
- **Upstream Source**: Ingested tenant telemetry (maintenance complaints, late payments).
- **Downstream Paths**: Outputs feed directly into the `Dynamic Lease Term Pricing Options` module to constrain or expand the renewal offer margins.

**Story 2.3: Amenity Value Extraction Model**
- **As a** Property Owner
- **I want to** run a regression analysis on my portfolio to determine the exact rent premium commanded by specific amenities (e.g., "Smart locks" vs "Hardwood floors")
- **So that** I make data-backed CAPEX decisions rather than guessing what upgrades tenants will pay for.
- **Acceptance Criteria:**
  - [ ] The model isolates variables internally and across comparable scraped listings to find the delta ($/month) attributed to specific features.
  - [ ] Output generates an ROI matrix: "Adding in-unit washer/dryers will cost $1,500/unit and increase market rent capture by $115/mo, resulting in a 13-month payback period."

### 🔷 Property OS Augmentation
- **Expected Loss Definition:** Opportunity cost of deploying capital into low-ROI upgrades rather than high-yield upgrades.
- **ActionIntent Mapping:** Produces a `CapitalExpenditureIntent` ranking upgrades.
- **Priority Logic:** CAPEX sorted strictly by shortest payback period and highest total ROI.

### 🔷 UI Enhancements
- Interactive "upgrade configurator" allowing the owner to add/remove virtual amenities and instantly see the projected ROI timeline matrix.

### 🔷 Simulation Layer
- Simulates the debt-service impact if the upgrades are financed rather than paid in cash.

### 🔷 Feedback & Learning
- Post-CAPEX evaluation tracks if the actual new rents achieved match the model's prediction 6 months post-renovation.

### 🔷 Model Integrity & Governance
- Model documents the specific subset of comparable listings used to derive the premium calculation, ensuring transparent reasoning.

### 🔷 Execution Flow
- **Trigger**: Owner or Admin explicitly requests a "CapEx Upgrade Analysis" via the portfolio dashboard for a specific asset class.
- **Preconditions**: Internal data on historical amenity tags AND scraped external market amenity keywords must be fully populated.
- **Execution Intent**: Perform isolated multi-variate regression to find the exact monthly rental increase associated with specific new amenities.
- **System Changes**: System generates a temporary analytical report artifact (no production state mutated).
- **Output**: `CapitalExpenditureIntent` (a UI rendering displaying the ROI payback matrix).

### 🔷 State Transition
- **Before State**: `CapExAnalysis.State = Uninitiated`
- **After State**: `CapExAnalysis.State = Generated_Awaiting_Owner_Decision`

### 🔷 Lifecycle Continuity
- **Upstream Source**: Discretionary analytical request from the Owner.
- **Downstream Paths**: If the owner approves the CAPEX, this pivots into a physical vendor procurement and renovation workflow.

### 🔷 Execution Context
- **Lifecycle Role**: High-level Owner advising mechanism.
- **Enabled Capabilities**: Data-driven physical property modifications.
- **Dependencies**: Depends heavily on the accuracy of the `Hyper-Local Market Sentinel` data.
