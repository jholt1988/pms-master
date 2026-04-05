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

**Story 1.2: Augmented Reality (AR) Unit Introductions & Spacial Maintenance**
- **As a** Tenant
- **I want to** use an AR lens in the app to scan my unit upon move-in to instantly point out where shut-off valves, breaker boxes, and filters are located
- **So that** I am empowered to manage my space and can quickly locate emergency shut-offs.
- **Acceptance Criteria:**
  - [ ] AR guidance overlays labels onto the camera view (e.g., "Main Water Shutoff").
  - [ ] When submitting a maintenance ticket, the user can use AR to place an accurate spatial "pin" and measure dimensions (e.g., "The hole in the wall is exactly 3.2 x 4 inches").

**Story 1.3: Real-Time Community & Amenity Bookings**
- **As a** Tenant
- **I want to** view live occupancy of community amenities (e.g., gym, pool) and reserve spaces directly via mobile with instant push notifications
- **So that** I optimize my use of the property and never arrive at a crowded facility.
- **Acceptance factor:**
  - [ ] API integration with smart-sensors in amenity spaces shows real-time crowd levels.
  - [ ] One-click booking reserves spaces and optionally blocks out community calendars.
  - [ ] Native push notifications alert the user 15 minutes before reservations start.

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

**Story 2.2: Geofenced Arrival & Task Routing**
- **As a** Maintenance Technician
- **I want to** receive dynamically optimized route mapping and push notifications for urgent work orders the moment I enter a property's geofence
- **So that** my time on-site is maximized and I don't overlook nearby passive tasks.
- **Acceptance Criteria:**
  - [ ] Opt-in location tracking adjusts the technician's queue based on their physical location (TSP algorithm).
  - [ ] Entering a property sends a silent push notification summarizing all open tickets at that specific address.
  - [ ] Geofencing automatically clocks the technician in and out, updating labor cost tables for precise estimations.

**Story 2.3: Instant Manager Approvals & Push Alerts**
- **As an** Admin / PM
- **I want to** receive actionable push notifications for critical workflows (e.g., high-cost estimate approval, lease countersignatures)
- **So that** I can approve or reject items with a single swipe directly from my lock screen.
- **Acceptance Criteria:**
  - [ ] Deep-linked rich notifications display cost summaries or tenant application scores.
  - [ ] Interactions like "Approve", "Deny", or "Escalate" exist on the notification payload without necessitating a full app launch.
  - [ ] Biometric authentication (FaceID/Fingerprint) is required on-the-fly for sensitive approvals.
