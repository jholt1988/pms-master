# User Stories: Mobile Applications (Tenant & Staff)

**Module:** `tenant_portal_mobile`
**Focus:** Leveraging device-native capabilities (geofencing, biometrics, offline edge-computing, NFC) to create an invisible and state-of-the-art mobile experience.

---

## 1. Persona: Tenant

### Epic: The Smartphone as the Universal Key
**Story 1.1: Mobile Wallet Access & IoT Unlock**
- **As a** Tenant
- **I want to** add my digital lease and property access badge to my Apple Wallet / Google Wallet
- **So that** I can unlock gates, common areas, and my specific unit via NFC without needing physical keys or opening an app.
- **Acceptance Criteria:**
  - [ ] Seamless integration with Wallet APIs to provision digital credentials upon lease signing.
  - [ ] Credentials automatically revoke themselves the minute a lease expires or terminates.
  - [ ] Support for generating "temporary guest passes" via SMS/QR code for visitors directly from the app.

### 🔷 Property OS Coverage
- **Coverage Level:** Partial
- **Reason:** This is a frictionless UX feature dealing with access control and credential management rather than financial/risk decision modeling.

### 🔷 Execution Flow
- **Trigger**: Tenant clicks "Add to Apple/Google Wallet" from the tenant dashboard after signing a lease.
- **Preconditions**: Lease state must be Active. Core access control system (e.g., Latch, Brivo) must be synced.
- **Execution Intent**: Provision a secure, short-lived NFC token and push it to the native OS wallet API.
- **System Changes**: An active credential session is registered to the Tenant's device UUID in the security system.
- **Output**: The cryptographically signed Wallet Pass object downloaded to the device.

### 🔷 State Transition
- **Before State**: `Access.DeviceProvisioned = False`
- **After State**: `Access.DeviceProvisioned = True`

### 🔷 Lifecycle Continuity
- **Upstream Source**: Triggered downstream of the Smart Contract Lease Countersignature event.
- **Downstream Paths**: Terminal action for credential provisioning; connects physically to property IoT locks.

### 🔷 Execution Context
- **Lifecycle Role**: Physical Property Access.
- **Enabled Capabilities**: High-security, credential-less physical unlock.
- **Dependencies**: Depends on external IoT Lock APIs.

**Story 1.2: Augmented Reality (AR) Unit Introductions & Spacial Maintenance**
- **As a** Tenant
- **I want to** use an AR lens in the app to scan my unit upon move-in to instantly point out where shut-off valves, breaker boxes, and filters are located
- **So that** I am empowered to manage my space and can quickly locate emergency shut-offs.
- **Acceptance Criteria:**
  - [ ] AR guidance overlays labels onto the camera view (e.g., "Main Water Shutoff").
  - [ ] When submitting a maintenance ticket, the user can use AR to place an accurate spatial "pin" and measure dimensions (e.g., "The hole in the wall is exactly 3.2 x 4 inches").

### 🔷 Property OS Augmentation
- **Expected Loss Definition:** Cost of sending a technician out to assess damage vs sending them out fully equipped for a first-trip resolution.
- **ActionIntent Mapping:** Consumes spatial definitions to produce a `MaintenanceTriageIntent`.
- **Priority Logic:** Items flagged with large dimensions or near water shutoffs are prioritized for faster dispatch.

### 🔷 UI Enhancements
- Visual estimator confirms the size/scope of the repair to the tenant upon submission so they understand why it's categorized as non-urgent vs urgent.

### 🔷 Feedback & Learning
- Compare the AR-calculated dimensions against the technician's final material invoice to refine the accuracy of automated triage models.

- Original, unaltered AR capture data is stored immutably to act as evidence if tenant damage is disputed at move-out.

### 🔷 Execution Flow
- **Trigger**: Tenant opens the "Report Issue" camera screen within the mobile app.
- **Preconditions**: User must have camera permissions enabled and an active lease with the property.
- **Execution Intent**: Capture spatial point-cloud data and user-assigned physical markers, translating them into standardized dimension strings for work orders.
- **System Changes**: A rich media asset (AR payload) is attached to a newly drafted maintenance ticket.
- **Output**: A raw or processed `MaintenanceTriageIntent` dispatched to the triage model.

### 🔷 State Transition
- **Before State**: `MaintenanceTicket.Media = Null`
- **After State**: `MaintenanceTicket.Media = AR_Spatial_Payload_Attached`

### 🔷 Lifecycle Continuity
- **Upstream Source**: Tenant discovering property damage or an appliance failure.
- **Downstream Paths**: Instantly feeds the `Predictive Maintenance & Self-Triage` (Web Portal) system for categorization.

**Story 1.3: Real-Time Community & Amenity Bookings**
- **As a** Tenant
- **I want to** view live occupancy of community amenities (e.g., gym, pool) and reserve spaces directly via mobile with instant push notifications
- **So that** I optimize my use of the property and never arrive at a crowded facility.
- **Acceptance factor:**
  - [ ] API integration with smart-sensors in amenity spaces shows real-time crowd levels.
  - [ ] One-click booking reserves spaces and optionally blocks out community calendars.
  - [ ] Native push notifications alert the user 15 minutes before reservations start.

### 🔷 Property OS Coverage
- **Coverage Level:** Partial
- **Reason:** This is primarily a convenience and utilization feature for tenants without major financial exposure or advanced probability modeling requirements.

### 🔷 Execution Flow
- **Trigger**: Tenant selects a desired time slot on the community amenity UI.
- **Preconditions**: Amenity must be open, under capacity, and user must not have exceeded their booking quota.
- **Execution Intent**: Soft-lock the requested block, decrement current available capacity, and schedule the reminder cron job.
- **System Changes**: `AmenityBooking` object is created in the database.
- **Output**: Reservation confirmation push notification scheduled for T-15 minutes.

### 🔷 State Transition
- **Before State**: `Amenity.Slot[T] = Available`
- **After State**: `Amenity.Slot[T] = Reserved_TenantXYZ`

### 🔷 Lifecycle Continuity
- **Upstream Source**: Tenant interacting with the lifestyle module of their application.
- **Downstream Paths**: Terminal workflow, though it does trigger an OS-level notification.

### 🔷 Execution Context
- **Lifecycle Role**: Tenant retention and community management.
- **Enabled Capabilities**: Preventing overcrowding in gym/pool areas.
- **Dependencies**: Requires low-latency websocket connections for real-time occupancy.

---

## 2. Persona: Property Manager (PM) / Maintenance Tech / Owner

### Epic: On-The-Go Operations & Edge Computing
**Story 2.1: Voice-Assisted Mobile Inspections (Offline-First)**
- **As a** Maintenance Technician / PM
- **I want to** conduct move-out inspections using contextual voice dictation and offline edge-computing
- **So that** I can simply walk through a unit, speak my findings, and have the app automatically itemize and cost damages even when deep inside a concrete building with zero cell service.
- **Acceptance Criteria:**
  - [ ] App utilizes on-device speech-to-text to transcribe notes in real time.
  - [ ] App runs a local lightweight classification model to categorize spoken issues (e.g., "Wall needs paint, heavy damage" maps to the 'Painting' damage category automatically).
  - [ ] Sync manager queues the entire inspection locally and silently syncs to the cloud the moment a stable connection is re-established.

### 🔷 Property OS Augmentation
- **Expected Loss Definition:** Missed damage chargebacks due to technicians skipping line items in low-connectivity environments, minus the cost of the repair text classification API.
- **ActionIntent Mapping:** Transcribes voice notes into an `AssessDamageIntent`.
- **Priority Logic:** Offline jobs are flagged for highest priority background syncing the instant an edge connection is detected.

### 🔷 UI Enhancements
- Feedback indicators explicitly show the PM/Tech how their speech mapped to standardized damage codes.

### 🔷 Feedback & Learning
- Technicians manually correcting the AI's classification choice ("Painting" vs "Drywall Patch") immediately reinforces the localized model for that specific property.

- Preserve the raw audio file metadata alongside the transcription to resolve disputes about the original spoken assessment.

### 🔷 Execution Flow
- **Trigger**: PM initializes a "Move-Out Inspection" and taps the microphone icon.
- **Preconditions**: PM must be physically inside the unit (geofenced) and logged into the staff app.
- **Execution Intent**: Ingest continuous raw audio, transcribing to text, extracting nouns/adjectives via NLP, and matching to an offline damage dictionary.
- **System Changes**: Temporary offline state logs the classified damages into the device's local SQLite storage.
- **Output**: A comprehensive `AssessDamageIntent` payload queued in the background sync manager.

### 🔷 State Transition
- **Before State**: `Unit.Inspection = Empty_Draft`
- **After State**: `Unit.Inspection = Offline_Cached_Complete` -> eventually `Synced_Complete`

### 🔷 Lifecycle Continuity
- **Upstream Source**: Lease termination and physical tenant move-out.
- **Downstream Paths**: Upon syncing, triggers the `Smart Security Deposit Escrow` logic to dispute funds based on the assessed chargebacks.

**Story 2.2: Geofenced Arrival & Task Routing**
- **As a** Maintenance Technician
- **I want to** receive dynamically optimized route mapping and push notifications for urgent work orders the moment I enter a property's geofence
- **So that** my time on-site is maximized and I don't overlook nearby passive tasks.
- **Acceptance Criteria:**
  - [ ] Opt-in location tracking adjusts the technician's queue based on their physical location (TSP algorithm).
  - [ ] Entering a property sends a silent push notification summarizing all open tickets at that specific address.
  - [ ] Geofencing automatically clocks the technician in and out, updating labor cost tables for precise estimations.

### 🔷 Property OS Augmentation
- **Expected Loss Definition:** Cost of technician travel time and unrouted inefficiency vs optimizing path routing for clustered tickets.
- **ActionIntent Mapping:** Consumes geolocation to produce `TaskDispatchIntent`.
- **Priority Logic:** Re-ranks the technician's queue dynamically based purely on proximity constraints and severity.

### 🔷 UI Enhancements
- Proximity map shows exactly why the next ticket was chosen instead of relying entirely on sequential processing.

### 🔷 Simulation Layer
- Simulates total daily resolution capacity given different routing models (e.g., "Cluster by building" vs "Optimize strictly by age of ticket").

### 🔷 Feedback & Learning
- Track actual time-on-site versus the initial estimated repair time to improve labor cost estimations for billing.

- Give technicians the ability to override geofenced routing with a typed reason (e.g., "Missing parts for Unit 302, skipping to 308") ensuring human agency is retained.

### 🔷 Execution Flow
- **Trigger**: OS GPS daemon registers the technician entering the property boundary coordinates.
- **Preconditions**: Tech is on-shift and location permissions are set to "Always On" or "While Using".
- **Execution Intent**: Fire a background fetch matching the current property ID to all open work orders, routing the highest priority ones to the lock screen.
- **System Changes**: `Technician.Status` transitions to "On-Site" for labor tracking.
- **Output**: Silent push payload rendering the `TaskDispatchIntent` UI on the tech's phone.

### 🔷 State Transition
- **Before State**: `Technician.Location = En_Route`
- **After State**: `Technician.Location = Arrived_On_Site`, `Queue.State = Regionally_Sorted`

### 🔷 Lifecycle Continuity
- **Upstream Source**: Physical movement of the technician via transit.
- **Downstream Paths**: Directly initiates the physical repair workflows on-site.

**Story 2.3: Instant Manager Approvals & Push Alerts**
- **As an** Admin / PM
- **I want to** receive actionable push notifications for critical workflows (e.g., high-cost estimate approval, lease countersignatures)
- **So that** I can approve or reject items with a single swipe directly from my lock screen.
- **Acceptance Criteria:**
  - [ ] Deep-linked rich notifications display cost summaries or tenant application scores.
  - [ ] Interactions like "Approve", "Deny", or "Escalate" exist on the notification payload without necessitating a full app launch.
  - [ ] Biometric authentication (FaceID/Fingerprint) is required on-the-fly for sensitive approvals.

### 🔷 Property OS Coverage
- **Coverage Level:** Partial
- **Reason:** This is an edge-device security protocol that fulfills existing ActionIntents rather than generating analytical insights. A strict UI/UX delivery mechanism.

### 🔷 Execution Flow
- **Trigger**: High-priority backend action (e.g., $10k invoice requires approval) fires a push. PM taps the action deep-link.
- **Preconditions**: App must trust the device enclave; PM must be registered to the biometric payload.
- **Execution Intent**: Intercept the HTTP POST action with a native biometric prompt before dispatching the payload to the server.
- **System Changes**: Target financial or legal object is mutated (e.g., Lease marked countersigned).
- **Output**: System executes the pending intent, protected by hardware-level authentication.

### 🔷 State Transition
- **Before State**: `Pending_Approval_Object = Awaiting_Decision`
- **After State**: `Pending_Approval_Object = Approved_Or_Rejected`

### 🔷 Lifecycle Continuity
- **Upstream Source**: Any high-friction backend component requesting a final sign-off (Leases, High-Cost Invoices).
- **Downstream Paths**: Varies uniquely based on the deep-linked intent returning a success to the requester.

### 🔷 Execution Context
- **Lifecycle Role**: High-friction gateway for critical systemic changes.
- **Enabled Capabilities**: Eliminates PM desk-dependency for approvals.
- **Dependencies**: Depends entirely on iOS/Android native APIs functioning correctly.
