# User Stories: KeyCheck Integration
## Property Management Suite - Inspection & Estimate Workflows

**Project:** KeyCheck Integration  
**Epic:** Unified Property Inspection System  
**Date:** November 11, 2025

---

## Epic Overview

As a **property management company**, we want to **integrate comprehensive property inspection capabilities** so that we can **streamline move-in/move-out processes, generate accurate repair estimates, and improve maintenance planning**.

**Business Value:**
- Reduce inspection time by 60%
- Improve repair cost accuracy by ±15%
- Eliminate manual estimate creation
- Create audit trail for security deposits
- Link inspection findings directly to maintenance requests

---

## User Personas

### 1. Property Manager (Primary User)
- **Name:** Sarah Johnson
- **Role:** Property Manager
- **Goals:** Efficiently manage properties, minimize vacancies, maintain property value
- **Pain Points:** Manual inspections take 2+ hours, estimates are inaccurate, hard to track deposit deductions
- **Tech Savvy:** Moderate (uses smartphone apps daily)

### 2. Maintenance Technician
- **Name:** Mike Rodriguez
- **Role:** In-house Technician
- **Goals:** Clear work orders, accurate cost estimates, complete repairs efficiently
- **Pain Points:** Surprise costs, unclear scope, missing details from inspections
- **Tech Savvy:** Low to Moderate

### 3. Tenant
- **Name:** Emily Chen
- **Role:** Tenant
- **Goals:** Fair treatment, transparent deposit handling, document property condition
- **Pain Points:** Disputes over damages, lack of documentation, unclear charges
- **Tech Savvy:** High (expects digital-first experience)

### 4. Property Owner/Landlord
- **Name:** David Martinez
- **Role:** Property Owner
- **Goals:** Protect investment, minimize costs, accurate financial reporting
- **Pain Points:** Unexpected repair costs, lack of visibility, manual reporting
- **Tech Savvy:** Moderate

---

## Core Workflow User Stories

## Workflow 1: Move-In Inspection

### Story 1.1: Schedule Move-In Inspection
**As a** Property Manager  
**I want to** automatically schedule a move-in inspection when a lease is created  
**So that** I don't forget to document the property's initial condition

**Acceptance Criteria:**
- [ ] When lease is created, system prompts to schedule inspection
- [ ] Inspection auto-scheduled 2 days before lease start date
- [ ] Email notification sent to property manager and tenant
- [ ] Inspection appears in calendar view
- [ ] Inspection linked to specific lease and unit

**Technical Notes:**
- Trigger: `LeaseService.createLease()` 
- Auto-create `ScheduleEvent` with type `INSPECTION_MOVE_IN`
- Send email via `EmailService.sendInspectionScheduled()`

**Priority:** HIGH  
**Story Points:** 5  
**Sprint:** Phase 2, Week 4

---

### Story 1.2: Conduct Digital Move-In Inspection
**As a** Property Manager  
**I want to** complete a digital inspection checklist on my tablet  
**So that** I can document property condition without paper forms

**Acceptance Criteria:**
- [ ] Access inspection from property manager dashboard
- [ ] View room-by-room checklist (kitchen, bathroom, bedrooms, etc.)
- [ ] Select condition for each item (Excellent, Good, Fair, Poor, Damaged, Non-functional)
- [ ] Add notes to any checklist item
- [ ] Upload photos (up to 5 per item)
- [ ] Mark estimated age of items in years
- [ ] Check "Requires Action" flag for items needing repair
- [ ] Auto-save progress every 30 seconds
- [ ] Continue inspection later if interrupted

**Technical Notes:**
- Component: `InspectionDetailPage.tsx`
- API: `PATCH /api/inspections/:id/items/:itemId`
- Use `PhotoUploader` component from shared
- LocalStorage for offline capability

**Priority:** HIGH  
**Story Points:** 13  
**Sprint:** Phase 3, Weeks 8-9

---

### Story 1.3: Capture Tenant Signature
**As a** Tenant  
**I want to** digitally sign the move-in inspection  
**So that** I have proof of the property's condition at move-in

**Acceptance Criteria:**
- [ ] Receive email with inspection review link
- [ ] View completed inspection details (read-only)
- [ ] See all photos and notes
- [ ] Use signature pad on screen (touch or mouse)
- [ ] Preview signature before submitting
- [ ] Ability to re-draw signature if unsatisfied
- [ ] Submit signature and receive confirmation email
- [ ] Signed inspection locked from further edits
- [ ] PDF report automatically generated with signatures

**Technical Notes:**
- Component: `SignInspectionPage.tsx`
- Use `SignaturePad` component (canvas-based)
- Store signature as base64 PNG in `InspectionSignature` table
- Trigger PDF generation on signature submit

**Priority:** HIGH  
**Story Points:** 8  
**Sprint:** Phase 3, Week 10

---

## Workflow 2: AI-Powered Repair Estimation

### Story 2.1: Generate Repair Estimate from Inspection
**As a** Property Manager  
**I want to** automatically generate repair cost estimates from inspection findings  
**So that** I can budget for repairs and plan maintenance

**Acceptance Criteria:**
- [ ] Button "Generate Estimate" visible after inspection completed
- [ ] Click triggers AI analysis of all "Requires Action" items
- [ ] Progress indicator shows 6-step process:
  - Step 1: Researching labor rates
  - Step 2: Finding material costs
  - Step 3: Calculating depreciation
  - Step 4: Adjusting for condition
  - Step 5: Determining original cost
  - Step 6: Estimating item lifetime
- [ ] Estimate completes in < 30 seconds
- [ ] Results show total cost, labor breakdown, material breakdown
- [ ] Line-by-line breakdown with repair vs replace recommendation
- [ ] Depreciation analysis per item
- [ ] Save estimate to database
- [ ] Email notification with estimate summary

**Technical Notes:**
- API: `POST /api/inspections/:id/estimate`
- Service: `EstimateService.generateEstimateFromInspection()`
- OpenAI Agent: `createEnhancedEstimateAgent()`
- Progress updates via Server-Sent Events or polling

**Priority:** HIGH  
**Story Points:** 21  
**Sprint:** Phase 4, Weeks 12-14

---

### Story 2.2: Review and Approve Estimate
**As a** Property Manager  
**I want to** review AI-generated estimates before taking action  
**So that** I can verify accuracy and make adjustments if needed

**Acceptance Criteria:**
- [ ] View estimate summary card (total cost, item counts)
- [ ] Expand line items to see details
- [ ] See depreciation calculation per item
- [ ] View condition-based adjustments
- [ ] See "Repair" vs "Replace" recommendation with rationale
- [ ] Add notes to individual line items
- [ ] Adjust costs manually if needed (override AI)
- [ ] Approve estimate (locks costs)
- [ ] Reject estimate (requires reason)
- [ ] Request new estimate generation

**Technical Notes:**
- Component: `EstimateDetailPage.tsx`
- API: `PATCH /api/estimates/:id/approve`
- Status flow: DRAFT → PENDING_REVIEW → APPROVED → COMPLETED

**Priority:** HIGH  
**Story Points:** 8  
**Sprint:** Phase 3, Week 11

---

### Story 2.3: Convert Estimate to Maintenance Requests
**As a** Property Manager  
**I want to** convert approved estimates into maintenance requests  
**So that** technicians can execute the repairs

**Acceptance Criteria:**
- [ ] Button "Create Work Orders" visible on approved estimates
- [ ] System groups line items by category (plumbing, electrical, etc.)
- [ ] One maintenance request created per category
- [ ] Maintenance request includes:
  - Title: "{Category} Repairs - Inspection #{id}"
  - Description: List of items with costs
  - Priority: Determined by condition severity
  - Estimated cost: Sum of line items
- [ ] Link maintenance request to inspection
- [ ] Link maintenance request to estimate
- [ ] Assign to appropriate technician (if available)
- [ ] Email notification sent to assigned technician
- [ ] Estimate status changes to COMPLETED

**Technical Notes:**
- API: `POST /api/estimates/:id/convert-to-maintenance`
- Service: `InspectionService.convertEstimateToMaintenanceRequests()`
- Group by `RepairEstimateLineItem.category`
- Create multiple `MaintenanceRequest` records

**Priority:** HIGH  
**Story Points:** 13  
**Sprint:** Phase 5, Week 15

---

## Workflow 3: Move-Out Inspection & Deposit Handling

### Story 3.1: Compare Move-In vs Move-Out Inspection
**As a** Property Manager  
**I want to** view side-by-side comparison of move-in and move-out inspections  
**So that** I can identify new damages and calculate deposit deductions

**Acceptance Criteria:**
- [ ] View both inspections in split-screen layout
- [ ] Room-by-room comparison
- [ ] Highlight condition changes (Good → Poor)
- [ ] Show before/after photos side-by-side
- [ ] Calculate condition deterioration (normal wear vs damage)
- [ ] Flag items that changed 2+ condition levels
- [ ] Generate damage summary report
- [ ] Export comparison as PDF

**Technical Notes:**
- Component: `InspectionComparisonPage.tsx`
- API: `GET /api/inspections/:id/compare/:compareId`
- Complex comparison logic needed
- Consider normal wear vs tenant damage

**Priority:** MEDIUM  
**Story Points:** 13  
**Sprint:** Phase 5, Week 16

---

### Story 3.2: Calculate Security Deposit Deductions
**As a** Property Manager  
**I want to** calculate fair deposit deductions based on inspection findings  
**So that** I can return the correct amount to tenants

**Acceptance Criteria:**
- [ ] Start from move-out inspection estimate
- [ ] Auto-calculate depreciation from move-in to move-out
- [ ] Apply tenant responsibility percentage per item
- [ ] Show formula: (Original Cost × Depreciation) × Tenant %
- [ ] Sum all deductions
- [ ] Compare to deposit amount
- [ ] Generate itemized deduction letter
- [ ] Export as PDF with photos
- [ ] Email to tenant within 30 days (configurable)

**Technical Notes:**
- Component: `DepositCalculationPage.tsx`
- Complex business logic for depreciation
- State-specific deposit return laws (consider config)
- Generate PDF with `pdfmake` or similar

**Priority:** MEDIUM  
**Story Points:** 13  
**Sprint:** Phase 6, Week 17

---

## Workflow 4: Routine Maintenance Inspections

### Story 4.1: Schedule Annual Property Inspection
**As a** Property Manager  
**I want to** schedule annual inspections for all properties  
**So that** I can proactively identify maintenance needs

**Acceptance Criteria:**
- [ ] Create inspection without linking to lease
- [ ] Select inspection type: ROUTINE or ANNUAL
- [ ] Schedule for specific date
- [ ] Assign to specific inspector
- [ ] Send calendar invite to inspector
- [ ] Reminder email 1 day before
- [ ] Track completion status
- [ ] Generate trend report (condition over time)

**Technical Notes:**
- Type: `ROUTINE` or `ANNUAL` enum value
- Optional `leaseId` (null for routine)
- Recurring schedule capability (future enhancement)

**Priority:** MEDIUM  
**Story Points:** 8  
**Sprint:** Phase 5, Week 16

---

### Story 4.2: Identify Preventive Maintenance Opportunities
**As a** Property Manager  
**I want to** see items approaching end-of-life based on inspection age tracking  
**So that** I can plan preventive maintenance before failures occur

**Acceptance Criteria:**
- [ ] Dashboard widget showing items > 80% expected lifetime
- [ ] Alert for items in "FAIR" or "POOR" condition
- [ ] Group by property and category
- [ ] Estimate replacement cost
- [ ] Create maintenance request directly from alert
- [ ] Track preventive maintenance ROI

**Technical Notes:**
- Calculate: `currentAge / estimatedLifetime >= 0.8`
- Query: `InspectionChecklistItem` where condition IN ('FAIR', 'POOR')
- Dashboard component: `PreventiveMaintenanceWidget.tsx`

**Priority:** LOW  
**Story Points:** 8  
**Sprint:** Phase 6, Week 18

---

## Workflow 5: Technician Experience

### Story 5.1: View Work Order with Estimate Details
**As a** Maintenance Technician  
**I want to** see estimated costs and repair instructions from inspections  
**So that** I know what parts to buy and how much time to allocate

**Acceptance Criteria:**
- [ ] Access maintenance request details
- [ ] See linked inspection (if applicable)
- [ ] View linked estimate with line items
- [ ] See estimated labor hours per task
- [ ] View estimated material costs
- [ ] See repair instructions from AI estimate
- [ ] View photos from inspection
- [ ] Download estimate as PDF for reference

**Technical Notes:**
- Component: `MaintenanceRequestDetailPage.tsx` (existing, enhance)
- Show `RepairEstimate` details if linked
- Display `RepairEstimateLineItem.repairInstructions`

**Priority:** MEDIUM  
**Story Points:** 5  
**Sprint:** Phase 5, Week 15

---

### Story 5.2: Update Actual Costs vs Estimates
**As a** Maintenance Technician  
**I want to** record actual time and material costs after completing work  
**So that** estimates can be improved over time

**Acceptance Criteria:**
- [ ] Form to enter actual hours worked
- [ ] Form to enter actual material costs
- [ ] Compare actual vs estimated costs
- [ ] Calculate variance percentage
- [ ] Track variance trends over time
- [ ] Feed data back to improve AI estimates (future)

**Technical Notes:**
- Add fields to `MaintenanceRequest`: `actualLaborHours`, `actualMaterialCost`, `actualTotalCost`
- Calculate: `(actual - estimated) / estimated * 100`
- Store for ML model training (future phase)

**Priority:** LOW  
**Story Points:** 5  
**Sprint:** Phase 6, Week 18

---

## Workflow 6: Tenant Self-Service

### Story 6.1: View My Inspection History
**As a** Tenant  
**I want to** view all inspections for my unit  
**So that** I can reference property condition at any time

**Acceptance Criteria:**
- [ ] Access from tenant dashboard
- [ ] List all inspections (move-in, move-out, routine)
- [ ] View inspection details (read-only)
- [ ] Download PDF reports
- [ ] See signature status
- [ ] Filter by date range
- [ ] Search by room or item

**Technical Notes:**
- Component: `MyInspectionsPage.tsx` in tenant domain
- API: `GET /api/tenant/inspections` (filtered by tenant user)
- Enforce permission checks (tenant can only see their own)

**Priority:** MEDIUM  
**Story Points:** 5  
**Sprint:** Phase 3, Week 11

---

### Story 6.2: Dispute Deposit Deduction
**As a** Tenant  
**I want to** review and dispute deposit deductions  
**So that** I can challenge unfair charges

**Acceptance Criteria:**
- [ ] View itemized deduction letter
- [ ] See comparison photos (move-in vs move-out)
- [ ] Add comments to specific line items
- [ ] Upload evidence photos
- [ ] Submit dispute with reason
- [ ] Track dispute status
- [ ] Receive response from property manager

**Technical Notes:**
- Component: `DepositDisputePage.tsx`
- New model: `DepositDispute` with status workflow
- Notifications for both parties
- Admin review queue

**Priority:** LOW  
**Story Points:** 13  
**Sprint:** Future Phase (not Phase 1-7)

---

## Workflow 7: Reporting & Analytics

### Story 7.1: Generate Inspection Summary Report
**As a** Property Owner  
**I want to** see aggregate inspection data across all properties  
**So that** I can understand property condition trends

**Acceptance Criteria:**
- [ ] Select date range
- [ ] Select properties (one or multiple)
- [ ] View metrics:
  - Total inspections completed
  - Average condition score
  - Most common issues
  - Total estimated repair costs
  - Completed vs pending repairs
- [ ] Charts: Condition trends over time
- [ ] Export as PDF or Excel
- [ ] Schedule monthly email reports

**Technical Notes:**
- Component: `InspectionReportsPage.tsx`
- Complex aggregation queries
- Use chart library (recharts or chart.js)
- PDF generation with charts

**Priority:** LOW  
**Story Points:** 13  
**Sprint:** Phase 6, Week 18

---

### Story 7.2: Estimate Accuracy Dashboard
**As a** Property Manager  
**I want to** track how accurate AI estimates are vs actual costs  
**So that** I can trust the system and improve accuracy

**Acceptance Criteria:**
- [ ] Dashboard showing estimate vs actual costs
- [ ] Calculate average variance percentage
- [ ] Break down by category (plumbing, electrical, etc.)
- [ ] Identify consistently over/under estimated items
- [ ] Track improvement over time
- [ ] Filter by property or date range

**Technical Notes:**
- Dashboard widget component
- Query: Join `RepairEstimate` with completed `MaintenanceRequest`
- Calculate: `AVG((actual - estimated) / estimated)`
- Feedback loop for ML model (future)

**Priority:** LOW  
**Story Points:** 8  
**Sprint:** Future Phase

---

## Non-Functional User Stories

### Story NF-1: Mobile-Responsive Inspection UI
**As a** Property Manager  
**I want to** complete inspections on my phone or tablet  
**So that** I can work on-site without a laptop

**Acceptance Criteria:**
- [ ] All inspection pages responsive (320px - 1920px)
- [ ] Photo upload works on mobile camera
- [ ] Signature pad touch-friendly
- [ ] Offline capability (save locally, sync later)
- [ ] Fast load times on mobile network (< 3 seconds)

**Priority:** HIGH  
**Story Points:** 8  
**Sprint:** Phase 3, Weeks 8-11

---

### Story NF-2: Photo Upload Performance
**As a** Property Manager  
**I want to** upload photos quickly even on slow connections  
**So that** inspections don't take too long

**Acceptance Criteria:**
- [ ] Auto-compress images client-side (< 500KB per image)
- [ ] Show upload progress bar
- [ ] Support batch upload (5 images at once)
- [ ] Retry failed uploads automatically
- [ ] Generate thumbnails server-side
- [ ] Load thumbnails first, full-res on demand

**Priority:** MEDIUM  
**Story Points:** 5  
**Sprint:** Phase 3, Week 10

---

### Story NF-3: Estimate Generation Reliability
**As a** Property Manager  
**I want to** estimate generation to succeed 99% of the time  
**So that** I can rely on the system for critical decisions

**Acceptance Criteria:**
- [ ] Handle OpenAI API rate limits gracefully
- [ ] Retry failed API calls (exponential backoff)
- [ ] Fallback to cached data if API unavailable
- [ ] Clear error messages if generation fails
- [ ] Queue estimates during high load
- [ ] Monitor API usage and costs

**Priority:** HIGH  
**Story Points:** 8  
**Sprint:** Phase 4, Week 14

---

## Story Prioritization Matrix

| Story ID | Title | Priority | Value | Effort | Dependency | Sprint |
|----------|-------|----------|-------|--------|------------|--------|
| 1.1 | Schedule Move-In Inspection | HIGH | HIGH | LOW | Phase 1 | Phase 2 |
| 1.2 | Conduct Digital Inspection | HIGH | HIGH | HIGH | 1.1 | Phase 3 |
| 1.3 | Capture Tenant Signature | HIGH | MEDIUM | MEDIUM | 1.2 | Phase 3 |
| 2.1 | Generate AI Estimate | HIGH | HIGH | HIGH | 1.2 | Phase 4 |
| 2.2 | Review and Approve Estimate | HIGH | MEDIUM | MEDIUM | 2.1 | Phase 3 |
| 2.3 | Convert to Maintenance | HIGH | HIGH | HIGH | 2.2 | Phase 5 |
| 3.1 | Compare Inspections | MEDIUM | MEDIUM | HIGH | 1.3 | Phase 5 |
| 3.2 | Calculate Deposit Deductions | MEDIUM | MEDIUM | HIGH | 3.1 | Phase 6 |
| 4.1 | Schedule Annual Inspection | MEDIUM | MEDIUM | MEDIUM | 1.1 | Phase 5 |
| 4.2 | Preventive Maintenance | LOW | MEDIUM | MEDIUM | 4.1 | Phase 6 |
| 5.1 | Technician View Estimate | MEDIUM | MEDIUM | LOW | 2.1 | Phase 5 |
| 5.2 | Track Actual Costs | LOW | LOW | LOW | 5.1 | Phase 6 |
| 6.1 | Tenant View Inspections | MEDIUM | MEDIUM | LOW | 1.3 | Phase 3 |
| 6.2 | Dispute Deposit | LOW | LOW | HIGH | 3.2 | Future |
| 7.1 | Inspection Reports | LOW | MEDIUM | HIGH | 1.3 | Phase 6 |
| 7.2 | Estimate Accuracy Dashboard | LOW | LOW | MEDIUM | 5.2 | Future |

---

## Acceptance Testing Scenarios

### Scenario 1: Complete Move-In Flow
**Given** a new lease starting December 1, 2025  
**When** property manager creates the lease  
**Then** inspection is auto-scheduled for November 29, 2025  
**And** both PM and tenant receive email notifications  

**When** property manager conducts inspection  
**Then** they can check off all items, add photos, mark issues  
**And** progress is saved automatically  

**When** tenant signs inspection  
**Then** inspection is locked and PDF is generated  
**And** both parties receive signed PDF via email  

---

### Scenario 2: Generate and Execute Estimate
**Given** a completed move-out inspection with 8 items requiring action  
**When** property manager clicks "Generate Estimate"  
**Then** AI analyzes items in < 30 seconds  
**And** estimate shows $2,450 total cost breakdown  

**When** property manager approves estimate  
**And** clicks "Create Work Orders"  
**Then** 3 maintenance requests created (plumbing, electrical, painting)  
**And** technicians receive email with details and costs  

---

### Scenario 3: Deposit Deduction Calculation
**Given** move-in inspection from 12 months ago  
**And** move-out inspection just completed  
**When** property manager generates comparison report  
**Then** system identifies 5 items with condition decline  
**And** calculates depreciation-adjusted charges  
**And** total deduction is $675 from $1,500 deposit  

**When** property manager generates deduction letter  
**Then** PDF includes photos, calculations, and itemization  
**And** tenant receives letter within legal timeframe  

---

## Story Estimation Guide

**Story Points Scale (Fibonacci):**
- **1 point:** Trivial change, < 2 hours
- **2 points:** Simple feature, 2-4 hours
- **3 points:** Moderate feature, 4-8 hours
- **5 points:** Complex feature, 1-2 days
- **8 points:** Very complex, 2-3 days
- **13 points:** Epic-level, 3-5 days (consider splitting)
- **21 points:** Large epic, 1-2 weeks (must split)

**Velocity Target:** 40-50 story points per 2-week sprint (team of 2-3 engineers)

---

## Definition of Done

A user story is "Done" when:
- [ ] Code implemented and reviewed
- [ ] Unit tests written (80%+ coverage)
- [ ] E2E tests passing
- [ ] UI matches design mockups
- [ ] Acceptance criteria met and verified
- [ ] Documentation updated
- [ ] Deployed to staging and tested
- [ ] Product owner approval received
- [ ] No critical bugs outstanding

---

**Total Stories:** 18 core stories + 3 non-functional  
**Total Story Points (Estimated):** 163 points  
**Estimated Sprints (2 weeks each):** 7-8 sprints (~14-16 weeks)  
**Matches Integration Plan:** Yes (19 weeks including documentation)
