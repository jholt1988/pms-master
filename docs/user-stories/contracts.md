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

**Story 1.2: Programmable Rent Sharing & Split Ledgers**
- **As a** Tenant (with Roommates)
- **I want to** sign a multi-party smart lease where rent responsibilities are computationally locked per individual
- **So that** I am protected from being individually penalized for a roommate's failure to pay their exact fractional share.
- **Acceptance Criteria:**
  - [ ] Each tenant holds an individual digitally signed obligation matrix linked to the master lease contract.
  - [ ] The ledger tracks payment fragments and autonomously executes multi-signature logic; if 3 of 4 tenants pay, the ledger notes partial satisfaction cleanly attributed.
  - [ ] "Fractional Default" protocols automatically fire tailored notices to the delinquent party without immediately evicting the entire household.

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

**Story 2.2: Instant Rent Settlement & Yield Sweeps**
- **As a** Property Owner
- **I want to** leverage programmatic money movements where collected rent is instantly bifurcated; management fees to the PM, reserved OPEX to escrow, and net yield to my ownership group
- **So that** my liquidity is instantaneous and I do not have to wait for end-of-month manual accounting reconciliations.
- **Acceptance Criteria:**
  - [ ] Payment settlement webhook triggers a smart contract router script.
  - [ ] Rule engine calculates deductions (e.g., 5% management fee, 1% capex reserve).
  - [ ] Automated Clearing House (ACH) or instant payment rails dispatch exact proportions to designated corporate bank accounts dynamically upon rent clearance.

**Story 2.3: Fractional Ownership Governance (Optional/Bleeding Edge)**
- **As a** Portfolio Syndicate Owner
- **I want to** govern the property entity using smart ledger voting where decision weight is proportional to equity stake
- **So that** voting on massive expenditures (e.g., Roof Replacement for $100k) is democratic, auditable, and binding among the LLC partners.
- **Acceptance Criteria:**
  - [ ] The module maintains a cap-table representing the percentage ownership of each LP (Limited Partner).
  - [ ] PM can initiate a "Governance Poll" for large CapEx requiring absolute majority.
  - [ ] Upon resolving the threshold vote, the ledger unlocks the reserved operating funds for the PM to utilize.
