# User Stories: Ledger & Smart Contracts System

**Module:** `contracts`
**Focus:** Introducing cryptographic trust, programmable asset states, zero-friction escrow, and on-chain immutability to property management agreements.

---

## 1. Persona: Tenant

### Epic: Decentralized Trust & Escrow Management
**Story 1.1: Smart Security Deposit Escrow**
- **As a** Tenant
- **I want to** have my security deposit housed in a programmatic smart contract or digitally transparent escrow ledger
- **So that** the funds are verifiably isolated from the landlord’s operating capital and return workflows are strictly governed by transparent rules.
- **Acceptance Criteria:**
  - [ ] Deposited funds are cryptographically mapped to the specific lease agreement hash.
  - [ ] Upon lease termination, if the PM logs no damages within the legal timeframe (e.g., 21 days), the smart contract auto-executes the deposit return to the tenant's linked account instantly.
  - [ ] Escrow states (Funded, Held, Disputed, Released) are viewable via the tenant web dashboard with timestamped cryptographic proofs.

### 🔷 Property OS Augmentation
- **Expected Loss Definition:** Cost of legal disputes over mishandled security deposits and the operational overhead of manual ledger reconciliation.
- **ActionIntent Mapping:** Consumes `DepositFundedIntent` and produces `HoldDepositIntent` or `ReleaseDepositIntent`.
- **Priority Logic:** Automated deposit releases rank lower than resolving disputed damages, but must execute within statutory timelines to avoid penalties.

### 🔷 UI Enhancements
- Visual timeline showing the remaining statutory days until the deposit must be returned.
- Transparent "dispute probability" meter indicating the likelihood of the PM claiming damages based on similar portfolio move-outs.

### 🔷 Feedback & Learning
- Compare the initial security deposit amount against actual historical damages at move-out to optimize future required deposit sizes.

### 🔷 Model Integrity & Governance
- Smart contract logic execution provides a hash validating every state change, preventing unilateral post-dating by either party.

### 🔷 Execution Flow
- **Trigger**: The expiration of the statutory 21-day (or local) post-move-out window.
- **Preconditions**: Lease must be terminated; move-out inspection must be logged; no damages claimed by PM.
- **Execution Intent**: Automatically unlock escrowed funds and route them via ACH/Crypto to the tenant's forwarding destination.
- **System Changes**: Escrow account balance drops to zero; tenant ledger receives a deposit returned credit.
- **Output**: `ReleaseDepositIntent` triggering banking API disbursement.

### 🔷 State Transition
- **Before State**: `Deposit.State = Escrow_Held`
- **After State**: `Deposit.State = Released_To_Tenant`

### 🔷 Lifecycle Continuity
- **Upstream Source**: The final sign-off of the Voice-Assisted Mobile Inspection (move-out workflow).
- **Downstream Paths**: Terminal workflow for the tenancy cycle; sends a generalized "Thank You" communication to the past tenant.

**Story 1.2: Programmable Rent Sharing & Split Ledgers**
- **As a** Tenant (with Roommates)
- **I want to** sign a multi-party smart lease where rent responsibilities are computationally locked per individual
- **So that** I am protected from being individually penalized for a roommate's failure to pay their exact fractional share.
- **Acceptance Criteria:**
  - [ ] Each tenant holds an individual digitally signed obligation matrix linked to the master lease contract.
  - [ ] The ledger tracks payment fragments and autonomously executes multi-signature logic; if 3 of 4 tenants pay, the ledger notes partial satisfaction cleanly attributed.
  - [ ] "Fractional Default" protocols automatically fire tailored notices to the delinquent party without immediately evicting the entire household.

### 🔷 Property OS Augmentation
- **Expected Loss Definition:** Eviction costs of an entire unit vs the exact dollar deficiency of the fractionally delinquent tenant.
- **ActionIntent Mapping:** Consumes `FractionalPaymentFailedIntent` and produces `NoticeToPerformIntent` specifically for the delinquent individual.
- **Priority Logic:** High priority given to resolving the fractional deficiency before triggering an overall lease non-compliance.

### 🔷 UI Enhancements
- Split-payment health dashboard showing real-time ledger statuses mapped to individual roommate profiles.

### 🔷 Simulation Layer
- Simulates the recovery percentage of targeting the delinquent tenant vs spreading the liability to the remaining roommates.

### 🔷 Feedback & Learning
- Track the successful cure rate of fractional notices to determine the threshold when partial eviction is economically better than total unit eviction.

### 🔷 Model Integrity & Governance
- Transparent logging ensures each roommate can cryptographically verify who is delinquent on the ledger.

### 🔷 Execution Flow
- **Trigger**: End of the grace period (e.g., 5th of the month) with incomplete fractional rent received.
- **Preconditions**: Ledger requires a 100% total, but the specific fractional user's assigned sub-ledger indicates unpaid status.
- **Execution Intent**: Fire collections notices specifically isolating the non-payer rather than blanketing the whole house in an immediate eviction threat.
- **System Changes**: Fractional tenant is assessed an individual late fee limitation.
- **Output**: `NoticeToPerformIntent` specifically formatted for the individual, cc'ing roommates for social pressure without legal prejudice.

### 🔷 State Transition
- **Before State**: `LeaseAccount.State = Fractional_Settle_Pending`
- **After State**: `LeaseAccount.State = Fractional_Delinquent` (for User A) and `Paid` (for Users B, C).

### 🔷 Lifecycle Continuity
- **Upstream Source**: Missing or failed payment intent at the grace period threshold.
- **Downstream Paths**: If cured within 3 days, returns to 'Current'. If unpaid beyond eviction risk threshold, system pivots to whole-unit `EvictionHoldIntent`.

---

## 2. Persona: Admin / PM / Owner

### Epic: Immutable Leasing & Asset Tokenization (Advanced)
**Story 2.1: On-Chain Lease State Machines**
- **As a** Property Manager
- **I want to** handle the lifecycle of a lease (Draft, Signed, Active, Notice-to-Vacate, Eviction, Terminated) as an immutable state machine
- **So that** no party can retroactively alter lease terms or dates for legal or financial manipulation.
- **Acceptance Criteria:**
  - [ ] Every state transition requires cryptographic signatures from the authorizing parties (e.g., countersignature).
  - [ ] E-signatures and PDF hashes are permanently logged to an immutable internal ledger (or private blockchain/DLT instance if architected).
  - [ ] In the event of an eviction proceeding, the system compiles a guaranteed-authentic "Audit Trail Booklet" that is instantly admissible in local housing courts.

### 🔷 Property OS Augmentation
- **Expected Loss Definition:** Legal fees and unrecovered rent caused by a court throwing out an eviction due to undocumented lease tampering.
- **ActionIntent Mapping:** Consumes `StateTransitionIntent`; produces immutable hashes.
- **Priority Logic:** Archival of state signatures ranks highest in the database transaction lifecycle to guarantee evidence chain.

### 🔷 UI Enhancements
- "Blockchain Verified" or "Ledger Authentic" badges displayed alongside the lease terms and generated PDF booklets.

### 🔷 Feedback & Learning
- Track which courts contest the digital audit trails and adjust the Booklet generation schema to meet hyper-local legal requirements.

### 🔷 Model Integrity & Governance
- The core of this story is system integrity; provides zero-knowledge read access to third-party legal entities without unauthorized backdoors.

### 🔷 Execution Flow
- **Trigger**: Property Manager clicks "Generate Court File" associated with an active Eviction workflow.
- **Preconditions**: Eviction intent must be active; all lease versions and correspondence must already have immutable hashes logged.
- **Execution Intent**: Compile all PDFs, signatures, and timestamps into a chronological packet with attached cryptographic validity proofs.
- **System Changes**: The compiled booklet is stored as a new legal `Exhibit` document.
- **Output**: A finalized, certifiable `AuditTrailBooklet.pdf` available for secure download.

### 🔷 State Transition
- **Before State**: `Eviction_File = Awaiting_Documentation`
- **After State**: `Eviction_File = Ready_For_Filing`

### 🔷 Lifecycle Continuity
- **Upstream Source**: Failure to cure a late payment or lease violation leading to an Eviction Initiation.
- **Downstream Paths**: Document is physically or electronically handed off to the municipal housing court system.

### 🔶 Unresolved Dependency
- **Missing Link**: Automated e-filing with external court API systems.
- **Why Missing**: Local courts lack uniform APIs; requires physical mail or hyper-local portal integrations.
- **Impact**: Booklets must still be manually uploaded to county clerk websites or printed.

**Story 2.2: Instant Rent Settlement & Yield Sweeps**
- **As a** Property Owner
- **I want to** leverage programmatic money movements where collected rent is instantly bifurcated; management fees to the PM, reserved OPEX to escrow, and net yield to my ownership group
- **So that** my liquidity is instantaneous and I do not have to wait for end-of-month manual accounting reconciliations.
- **Acceptance Criteria:**
  - [ ] Payment settlement webhook triggers a smart contract router script.
  - [ ] Rule engine calculates deductions (e.g., 5% management fee, 1% capex reserve).
  - [ ] Automated Clearing House (ACH) or instant payment rails dispatch exact proportions to designated corporate bank accounts dynamically upon rent clearance.

### 🔷 Property OS Augmentation
- **Expected Loss Definition:** Lost interest yield and cash drag associated with funds sitting in generic holding accounts rather than deployed.
- **ActionIntent Mapping:** Produces `YieldSweepIntent` immediately upon detecting a settled rent transaction.
- **Priority Logic:** Ranks immediate liquidity distribution immediately after escrow reserve requirements are satisfied.

### 🔷 UI Enhancements
- Real-time sankey diagram in the owner portal visualizing the exact bifurcation of incoming rent into various reserves and accounts.

### 🔷 Feedback & Learning
- Track the actual timeline from rent payment to bank settlement to continuously optimize when sweep logic fires to prevent overdrafts.

### 🔷 Model Integrity & Governance
- Smart contract prevents any manual interference in the sweep proportions without a logged cryptographic override by an authorized Admin.

### 🔷 Execution Flow
- **Trigger**: System validates funds have officially settled (cleared ACH/CC) into the master clearing account.
- **Preconditions**: Rule engine must have active CapEx reserve rules and Management Fee contracts mapped.
- **Execution Intent**: Programmatically calculate deductions and dispatch the fractional monetary amounts to respective corporate bank accounts.
- **System Changes**: Multiple bank transfer payloads are queued; internal Ledgers reflect the dispersed capital.
- **Output**: `YieldSweepIntent` successfully dispatching API calls to the banking provider (e.g., Stripe Connect / Treasury).

### 🔷 State Transition
- **Before State**: `Rent.Location = Clearing_Account_Hold`
- **After State**: `Rent.Location = Dispersed_To_Stakeholders`

### 🔷 Lifecycle Continuity
- **Upstream Source**: Zero-Latency Payment Ledgers clearing the transaction.
- **Downstream Paths**: Flows into the Owner Portfolio yields and financial reporting models.

**Story 2.3: Fractional Ownership Governance (Optional/Bleeding Edge)**
- **As a** Portfolio Syndicate Owner
- **I want to** govern the property entity using smart ledger voting where decision weight is proportional to equity stake
- **So that** voting on massive expenditures (e.g., Roof Replacement for $100k) is democratic, auditable, and binding among the LLC partners.
- **Acceptance Criteria:**
  - [ ] The module maintains a cap-table representing the percentage ownership of each LP (Limited Partner).
  - [ ] PM can initiate a "Governance Poll" for large CapEx requiring absolute majority.
  - [ ] Upon resolving the threshold vote, the ledger unlocks the reserved operating funds for the PM to utilize.

### 🔷 Property OS Coverage
- **Coverage Level:** Partial
- **Missing Components:** Expected Loss, Simulation
- **Reason:** This is a governance workflow (voting mechanic) rather than a dynamic risk-optimization model. While it uses digital ledgers, it is driven by human consensus rather than algorithmic loss reduction.

### 🔷 Execution Flow
- **Trigger**: PM submits a `Governance Poll` for a CAPEX requirement exceeding their discretionary spending limit.
- **Preconditions**: A verified cap-table exists; reserved operating funds must be actively cryptographically locked.
- **Execution Intent**: Record LP votes weighted by equity stakes until a predefined threshold (e.g., >51%) is met, then automatically release the funds.
- **System Changes**: The specific `LockContract` holding OPEX funds is transitioned to unlock.
- **Output**: OPEX funds move to the PM's spendable ledger; LP investors are notified of the decision.

### 🔷 State Transition
- **Before State**: `CAPEX_Funds = Locked`
- **After State**: `CAPEX_Funds = Unlocked_For_Deployment` OR `Poll_Failed_Funds_Retained`

### 🔷 Lifecycle Continuity
- **Upstream Source**: PM discovering necessary major CAPEX via maintenance workflows.
- **Downstream Paths**: Once unlocked, funds are deployed via standard property accounting workflows to vendors.

### 🔷 Execution Context
- **Lifecycle Role**: High-level Owner/Syndicate dispute resolution and fund control.
- **Enabled Capabilities**: Trustless OPEX holding.
- **Dependencies**: Depends entirely on the accuracy of the LP cap-table.
