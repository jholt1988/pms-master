# Create All Remaining Issues - Phase 1 and User Stories
# KeyCheck Integration Project

$ErrorActionPreference = "Continue"
$REPO = "jholt1988/pms"

Write-Host "========================================" -ForegroundColor Green
Write-Host "Creating Remaining GitHub Issues" -ForegroundColor Green
Write-Host "KeyCheck Integration - Property Management Suite" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# Phase 1 Week 2: Database Migration
Write-Host "Creating Phase 1 Week 2 issues (Database Migration)..." -ForegroundColor Cyan

gh issue create --repo $REPO `
  --title "[TASK] Create Prisma Migration" `
  --milestone "Epic 1: Data Model Unification" `
  --label "phase-1: data-model,component: database,priority: high,size: M" `
  --body "**Phase 1, Week 2, Task 2.1**

## Description
Generate and execute Prisma migration to add all inspection-related tables to the database.

## Subtasks
- Generate migration with: npx prisma migrate dev --name add-inspection-models
- Review generated SQL for correctness
- Execute migration on development database
- Verify all tables created with correct columns
- Verify foreign key constraints are in place
- Verify indexes are created
- Test rollback procedure

## Acceptance Criteria
- Migration executes without errors
- All 9 new tables exist in database
- Foreign key relationships verified
- Indexes created as specified in schema
- Migration can be rolled back if needed

## SQL Verification
Run queries in docs/PHASE_1_TASK_BREAKDOWN.md to verify schema

## Estimate
6 hours / 5 story points

See: docs/PHASE_1_TASK_BREAKDOWN.md for full details"

Write-Host "  Created: Task 2.1 - Create Prisma Migration" -ForegroundColor Gray

gh issue create --repo $REPO `
  --title "[TASK] Update Prisma Client and Verify Types" `
  --milestone "Epic 1: Data Model Unification" `
  --label "phase-1: data-model,component: backend,priority: high,size: XS" `
  --body "**Phase 1, Week 2, Task 2.2**

## Description
Regenerate Prisma Client to include new inspection models and verify TypeScript types.

## Subtasks
- Run: npx prisma generate
- Verify new model types in node_modules/.prisma/client
- Test type imports in a sample TypeScript file
- Verify relations are properly typed
- Check enum types are available
- Ensure existing code still compiles

## Acceptance Criteria
- Prisma Client regenerated successfully
- All new types available in TypeScript
- No type errors in existing codebase
- Autocomplete works for new models in IDE

## Estimate
2 hours / 1 story point

See: docs/PHASE_1_TASK_BREAKDOWN.md for full details"

Write-Host "  Created: Task 2.2 - Update Prisma Client" -ForegroundColor Gray

gh issue create --repo $REPO `
  --title "[TASK] Create Inspection Seed Data" `
  --milestone "Epic 1: Data Model Unification" `
  --label "phase-1: data-model,component: database,priority: high,size: L" `
  --body "**Phase 1, Week 2, Task 2.3**

## Description
Create comprehensive seed data with inspection checklist templates for different property types.

## Subtasks
- Update prisma/seed.ts with inspection data
- Create apartment checklist template (8 rooms, 30 items)
- Create single-family home template (12 rooms, 45 items)
- Create commercial space template (6 areas, 20 items)
- Create sample completed inspection with photos
- Add sample repair estimates with line items
- Test seed script execution

## Acceptance Criteria
- 3 checklist templates created
- 1 sample completed inspection in database
- At least 5 sample photos linked
- Sample repair estimate with 10 line items
- Seed script runs without errors: npm run db:seed

## Estimate
8 hours / 8 story points

See: docs/PHASE_1_TASK_BREAKDOWN.md for full details"

Write-Host "  Created: Task 2.3 - Create Seed Data" -ForegroundColor Gray

gh issue create --repo $REPO `
  --title "[TASK] Add MaintenanceRequest Inspection Link" `
  --milestone "Epic 1: Data Model Unification" `
  --label "phase-1: data-model,component: database,priority: medium,size: S" `
  --body "**Phase 1, Week 2, Task 2.4**

## Description
Add optional inspectionId foreign key to MaintenanceRequest model to link repairs to inspections.

## Subtasks
- Add inspectionId field to MaintenanceRequest model
- Make field optional (inspectionId Int?)
- Add relation to UnitInspection
- Create migration for schema change
- Update existing maintenance requests (keep null)
- Test backward compatibility

## Acceptance Criteria
- MaintenanceRequest has optional inspectionId
- Relation works both directions
- Existing maintenance requests unaffected
- Can query maintenance requests by inspection
- Can query inspections with related maintenance

## Estimate
3 hours / 3 story points

See: docs/PHASE_1_TASK_BREAKDOWN.md for full details"

Write-Host "  Created: Task 2.4 - MaintenanceRequest Relation" -ForegroundColor Gray
Write-Host ""

# Phase 1 Week 3: Testing & Optimization
Write-Host "Creating Phase 1 Week 3 issues (Testing & Optimization)..." -ForegroundColor Cyan

gh issue create --repo $REPO `
  --title "[TASK] Add Database Indexes for Performance" `
  --milestone "Epic 1: Data Model Unification" `
  --label "phase-1: data-model,component: database,priority: high,size: S" `
  --body "**Phase 1, Week 3, Task 3.1**

## Description
Create composite indexes for common query patterns to optimize inspection queries.

## Subtasks
- Add index on UnitInspection(unitId, inspectionDate)
- Add index on UnitInspection(propertyId, status)
- Add index on InspectionRoom(inspectionId, roomName)
- Add index on RepairEstimate(inspectionId, createdAt)
- Add index on UnitInspectionPhoto(inspectionId, roomId)
- Create migration for indexes
- Test query performance with EXPLAIN ANALYZE

## Acceptance Criteria
- All 5 composite indexes created
- Query performance < 50ms for common queries
- EXPLAIN ANALYZE shows index usage
- No negative impact on write performance

## Target Queries
See docs/PHASE_1_TASK_BREAKDOWN.md for SQL queries to test

## Estimate
4 hours / 3 story points

See: docs/PHASE_1_TASK_BREAKDOWN.md for full details"

Write-Host "  Created: Task 3.1 - Database Indexing" -ForegroundColor Gray

gh issue create --repo $REPO `
  --title "[TASK] Create Test Data Factories" `
  --milestone "Epic 1: Data Model Unification" `
  --label "phase-1: data-model,component: testing,priority: high,size: M" `
  --body "**Phase 1, Week 3, Task 3.2**

## Description
Build test factory functions for all inspection models to use in unit and E2E tests.

## Subtasks
- Create createTestInspection() factory
- Create createTestRoom() factory
- Create createTestChecklistItem() factory
- Create createTestPhoto() factory
- Create createTestEstimate() factory
- Create createTestSignature() factory
- Add to test/factories/index.ts
- Test factory usage in sample spec

## Acceptance Criteria
- 6 factory functions created
- Factories support custom overrides
- Factories create valid related data
- Factories integrated with existing factory pattern
- Documentation added to factories file

## Example Usage
See docs/PHASE_1_TASK_BREAKDOWN.md for code examples

## Estimate
6 hours / 5 story points

See: docs/PHASE_1_TASK_BREAKDOWN.md for full details"

Write-Host "  Created: Task 3.2 - Test Factories" -ForegroundColor Gray

gh issue create --repo $REPO `
  --title "[TASK] Write Unit Tests for Data Models" `
  --milestone "Epic 1: Data Model Unification" `
  --label "phase-1: data-model,component: testing,priority: high,size: M" `
  --body "**Phase 1, Week 3, Task 3.3**

## Description
Create comprehensive unit tests for all inspection models targeting 100% coverage.

## Subtasks
- Test model creation and validation
- Test required field constraints
- Test unique constraints
- Test foreign key relationships
- Test cascade delete behavior
- Test enum value validation
- Verify 100% model test coverage
- Ensure existing 141 tests still pass

## Acceptance Criteria
- Tests for all 9 new models
- 100% coverage for model layer
- All constraint violations properly tested
- Cascade deletes verified
- All 141 existing tests pass
- New tests follow existing patterns

## Estimate
6 hours / 5 story points

See: docs/PHASE_1_TASK_BREAKDOWN.md for full details"

Write-Host "  Created: Task 3.3 - Unit Tests" -ForegroundColor Gray

gh issue create --repo $REPO `
  --title "[TASK] Implement Database Backup Strategy" `
  --milestone "Epic 1: Data Model Unification" `
  --label "phase-1: data-model,component: database,priority: high,size: S" `
  --body "**Phase 1, Week 3, Task 3.4**

## Description
Create automated backup scripts and test database restoration procedures.

## Subtasks
- Create pg_dump backup script
- Schedule automated daily backups
- Test restoration to new database
- Document rollback procedure
- Create migration rollback script
- Test rollback with sample data
- Document recovery procedures

## Acceptance Criteria
- Backup script runs successfully
- Backup can be restored to clean database
- Rollback procedure documented and tested
- Backup includes schema and data
- Restoration tested with inspection data

## Estimate
3 hours / 3 story points

See: docs/PHASE_1_TASK_BREAKDOWN.md for full details"

Write-Host "  Created: Task 3.4 - Backup Strategy" -ForegroundColor Gray

gh issue create --repo $REPO `
  --title "[TASK] Create Schema Documentation" `
  --milestone "Epic 1: Data Model Unification" `
  --label "phase-1: data-model,component: documentation,priority: medium,size: S" `
  --body "**Phase 1, Week 3, Task 3.5**

## Description
Generate comprehensive schema documentation including ERD diagram and data dictionary.

## Subtasks
- Generate ERD diagram using Prisma tools
- Create data dictionary with all fields
- Document relationships and cardinality
- Add common query examples
- Document enum values and meanings
- Update README with schema overview
- Export as PDF and Markdown

## Acceptance Criteria
- ERD diagram clearly shows all models
- Data dictionary documents all fields
- Relationships documented with cardinality
- 10+ common query examples included
- Documentation accessible to team

## Estimate
4 hours / 3 story points

See: docs/PHASE_1_TASK_BREAKDOWN.md for full details"

Write-Host "  Created: Task 3.5 - Documentation" -ForegroundColor Gray
Write-Host ""

# User Stories - Workflow 1: Move-In Inspection
Write-Host "Creating Workflow 1 user stories (Move-In Inspection)..." -ForegroundColor Cyan

gh issue create --repo $REPO `
  --title "[STORY] Schedule Move-In Inspection on Lease Creation" `
  --milestone "Epic 2: Backend API Development" `
  --label "type: feature,phase-2: backend,priority: high,size: M" `
  --body "**User Story 1.1 - Move-In Inspection Workflow**

## User Story
**As a** Property Manager  
**I want to** automatically schedule a move-in inspection when a lease is created  
**So that** I do not forget to document the property condition before tenant moves in

## Acceptance Criteria
- When lease is created, system prompts to schedule inspection
- Inspection auto-scheduled 2 days before lease start date
- Email notification sent to property manager and tenant
- Inspection appears in calendar view with lease details
- Inspection linked to specific lease and unit in database

## Technical Notes
- Trigger: LeaseService.createLease()
- Auto-create ScheduleEvent with type INSPECTION_MOVE_IN
- Send email via EmailService.sendInspectionScheduled()
- API: POST /api/inspections/schedule
- Component: InspectionSchedulingForm

## Story Points
5

See: docs/USER_STORIES.md for full details"

Write-Host "  Created: Story 1.1 - Schedule Inspection" -ForegroundColor Gray

gh issue create --repo $REPO `
  --title "[STORY] Conduct Digital Move-In Inspection" `
  --milestone "Epic 3: Frontend UI Components" `
  --label "type: feature,phase-3: frontend,priority: high,size: XL" `
  --body "**User Story 1.2 - Move-In Inspection Workflow**

## User Story
**As a** Property Manager  
**I want to** complete the inspection on my tablet with photo documentation  
**So that** I can efficiently document property condition room by room

## Acceptance Criteria
- Digital checklist loads on mobile device
- Can mark each item as Good/Fair/Poor/Damaged
- Can upload 5 photos per checklist item
- Inspection auto-saves every 30 seconds
- Works offline with sync when online
- Can add custom notes per room
- Progress indicator shows completion percentage

## Technical Notes
- Component: InspectionForm (mobile-responsive)
- API: POST /api/inspections/conduct
- Service: InspectionService.conductInspection()
- Photo upload: UnitInspectionPhoto model, 5MB limit
- Offline support: IndexedDB cache

## Story Points
13

See: docs/USER_STORIES.md for full details"

Write-Host "  Created: Story 1.2 - Conduct Inspection" -ForegroundColor Gray

gh issue create --repo $REPO `
  --title "[STORY] Obtain Digital Signatures on Inspection" `
  --milestone "Epic 3: Frontend UI Components" `
  --label "type: feature,phase-3: frontend,priority: high,size: L" `
  --body "**User Story 1.3 - Move-In Inspection Workflow**

## User Story
**As a** Property Manager  
**I want to** capture digital signatures from both tenant and manager  
**So that** both parties acknowledge the documented property condition

## Acceptance Criteria
- Signature pad appears after inspection completion
- Captures tenant signature with name and date
- Captures property manager signature with name and date
- Signatures saved as base64 images
- Cannot complete inspection without both signatures
- Generates PDF with signatures for records

## Technical Notes
- Component: SignaturePad
- API: POST /api/inspections/sign
- Service: InspectionService.captureSignatures()
- Model: InspectionSignature
- PDF generation: PDFKit library

## Story Points
8

See: docs/USER_STORIES.md for full details"

Write-Host "  Created: Story 1.3 - Digital Signatures" -ForegroundColor Gray
Write-Host ""

# User Stories - Workflow 2: AI Estimation
Write-Host "Creating Workflow 2 user stories (AI Estimation)..." -ForegroundColor Cyan

gh issue create --repo $REPO `
  --title "[STORY] Generate AI Repair Estimate from Photos" `
  --milestone "Epic 4: AI Agent Integration" `
  --label "type: feature,phase-4: ai-agent,priority: high,size: XXL" `
  --body "**User Story 2.1 - AI Estimation Workflow**

## User Story
**As a** Property Manager  
**I want to** generate AI-powered repair cost estimates from inspection photos  
**So that** I can quickly assess potential move-out charges

## Acceptance Criteria
- Click Generate Estimate button on completed inspection
- AI analyzes all flagged damage photos
- Generates estimate within 30 seconds
- Shows 6-step analysis breakdown (labor rates, materials, depreciation, condition, original cost, lifetime)
- Creates line items per damaged area
- Total estimate shown with confidence score
- Email notification when estimate ready

## Technical Notes
- Service: EstimateService.generateEstimate()
- AI Agent: OpenAI Agents SDK with custom tools
- API: POST /api/estimates/generate
- Model: RepairEstimate, RepairEstimateLineItem
- Agent: 6-step process per KEYCHECK_INTEGRATION_PLAN.md

## Story Points
21

See: docs/USER_STORIES.md for full details"

Write-Host "  Created: Story 2.1 - AI Estimate Generation" -ForegroundColor Gray

gh issue create --repo $REPO `
  --title "[STORY] Review and Adjust AI Estimates" `
  --milestone "Epic 4: AI Agent Integration" `
  --label "type: feature,phase-4: ai-agent,priority: high,size: L" `
  --body "**User Story 2.2 - AI Estimation Workflow**

## User Story
**As a** Property Manager  
**I want to** review and manually adjust AI-generated estimates  
**So that** I ensure accuracy before presenting charges to tenant

## Acceptance Criteria
- View estimate with all line items
- Can edit quantity, unit cost, or description
- Can add custom line items
- Can remove incorrect items
- Shows original AI values vs adjusted values
- Recalculates total dynamically
- Can mark estimate as Approved/Rejected

## Technical Notes
- Component: EstimateReviewForm
- API: PATCH /api/estimates/:id
- Service: EstimateService.updateEstimate()
- Track AI accuracy for model improvement

## Story Points
8

See: docs/USER_STORIES.md for full details"

Write-Host "  Created: Story 2.2 - Review Estimates" -ForegroundColor Gray

gh issue create --repo $REPO `
  --title "[STORY] Convert Estimates to Maintenance Requests" `
  --milestone "Epic 5: Workflow Automation" `
  --label "type: feature,phase-5: workflow,priority: high,size: XL" `
  --body "**User Story 2.3 - AI Estimation Workflow**

## User Story
**As a** Property Manager  
**I want to** convert approved estimates into maintenance requests  
**So that** repairs can be scheduled and tracked in the system

## Acceptance Criteria
- Click Convert to Maintenance button on approved estimate
- Creates MaintenanceRequest with estimate details
- Links maintenance request to inspection via inspectionId
- Copies line items as maintenance tasks
- Sets priority based on damage severity
- Auto-assigns technician if available
- Sends notification to assigned technician

## Technical Notes
- Service: WorkflowService.convertEstimateToMaintenance()
- API: POST /api/workflow/estimate-to-maintenance
- Link: MaintenanceRequest.inspectionId
- Email: EmailService.sendMaintenanceCreated()

## Story Points
13

See: docs/USER_STORIES.md for full details"

Write-Host "  Created: Story 2.3 - Convert to Maintenance" -ForegroundColor Gray
Write-Host ""

# User Stories - Workflow 3: Move-Out Inspection
Write-Host "Creating Workflow 3 user stories (Move-Out Inspection)..." -ForegroundColor Cyan

gh issue create --repo $REPO `
  --title "[STORY] Compare Move-Out to Move-In Condition" `
  --milestone "Epic 3: Frontend UI Components" `
  --label "type: feature,phase-3: frontend,priority: high,size: XL" `
  --body "**User Story 3.1 - Move-Out Inspection Workflow**

## User Story
**As a** Property Manager  
**I want to** view move-in and move-out inspections side-by-side  
**So that** I can easily identify new damage for security deposit deductions

## Acceptance Criteria
- Split-screen view with move-in on left, move-out on right
- Same checklist items aligned for easy comparison
- Photos displayed side-by-side for each item
- Highlights items that changed condition
- Shows only damaged/changed items option
- Can flag items for security deposit deduction
- Generates comparison report PDF

## Technical Notes
- Component: InspectionComparisonView
- API: GET /api/inspections/compare/:moveInId/:moveOutId
- Service: InspectionService.compareInspections()
- PDF: Comparison report with photos

## Story Points
13

See: docs/USER_STORIES.md for full details"

Write-Host "  Created: Story 3.1 - Compare Inspections" -ForegroundColor Gray

gh issue create --repo $REPO `
  --title "[STORY] Calculate Security Deposit Deductions" `
  --milestone "Epic 4: AI Agent Integration" `
  --label "type: feature,phase-4: ai-agent,priority: high,size: XL" `
  --body "**User Story 3.2 - Move-Out Inspection Workflow**

## User Story
**As a** Property Manager  
**I want to** automatically calculate security deposit deductions based on move-out damage  
**So that** I can provide accurate itemized deductions to tenant

## Acceptance Criteria
- Calculates deductions for all flagged damage
- Uses AI estimate for each damaged item
- Subtracts security deposit from total charges
- Shows remaining balance or refund amount
- Generates itemized deduction letter
- Can email deduction letter to tenant
- Tracks deposit disposition by state laws

## Technical Notes
- Service: DepositService.calculateDeductions()
- API: POST /api/deposits/calculate
- Uses RepairEstimate data
- Email: EmailService.sendDepositDeduction()
- Compliance: State-specific rules

## Story Points
13

See: docs/USER_STORIES.md for full details"

Write-Host "  Created: Story 3.2 - Deposit Deductions" -ForegroundColor Gray
Write-Host ""

# User Stories - Workflow 4: Routine Inspections
Write-Host "Creating Workflow 4 user stories (Routine Inspections)..." -ForegroundColor Cyan

gh issue create --repo $REPO `
  --title "[STORY] Schedule Annual Property Inspections" `
  --milestone "Epic 2: Backend API Development" `
  --label "type: feature,phase-2: backend,priority: medium,size: M" `
  --body "**User Story 4.1 - Routine Inspection Workflow**

## User Story
**As a** Property Manager  
**I want to** automatically schedule annual inspections for all active leases  
**So that** I can proactively identify maintenance needs

## Acceptance Criteria
- System suggests inspection 12 months after last inspection
- Can schedule inspections in bulk for portfolio
- Sends 7-day advance notice to tenants
- Creates inspection records with ROUTINE type
- Assigns to property manager automatically
- Shows inspection schedule in calendar view

## Technical Notes
- Service: InspectionService.scheduleRoutine()
- API: POST /api/inspections/schedule-routine
- Type: InspectionType.ROUTINE
- Email: EmailService.sendRoutineInspectionNotice()

## Story Points
5

See: docs/USER_STORIES.md for full details"

Write-Host "  Created: Story 4.1 - Schedule Routine" -ForegroundColor Gray

gh issue create --repo $REPO `
  --title "[STORY] Track Preventive Maintenance Findings" `
  --milestone "Epic 5: Workflow Automation" `
  --label "type: feature,phase-5: workflow,priority: medium,size: L" `
  --body "**User Story 4.2 - Routine Inspection Workflow**

## User Story
**As a** Property Manager  
**I want to** flag preventive maintenance items during routine inspections  
**So that** I can address issues before they become expensive repairs

## Acceptance Criteria
- Can mark items as Needs Attention during routine inspection
- System suggests priority (Low/Medium/High) based on condition
- Auto-creates maintenance requests for High priority
- Generates preventive maintenance report
- Tracks completion of flagged items
- Shows maintenance trend analysis per property

## Technical Notes
- Service: WorkflowService.createPreventiveMaintenance()
- API: POST /api/workflow/preventive-maintenance
- Auto-create: MaintenanceRequest for High priority
- Analytics: Track patterns over time

## Story Points
8

See: docs/USER_STORIES.md for full details"

Write-Host "  Created: Story 4.2 - Preventive Maintenance" -ForegroundColor Gray
Write-Host ""

# User Stories - Workflow 5: Technician Experience
Write-Host "Creating Workflow 5 user stories (Technician Experience)..." -ForegroundColor Cyan

gh issue create --repo $REPO `
  --title "[STORY] View Inspection-Linked Work Orders" `
  --milestone "Epic 2: Backend API Development" `
  --label "type: feature,phase-2: backend,priority: medium,size: S" `
  --body "**User Story 5.1 - Technician Workflow**

## User Story
**As a** Maintenance Technician  
**I want to** view the original inspection photos and AI estimate for my work orders  
**So that** I can understand the expected scope and cost before starting work

## Acceptance Criteria
- Work order shows link to source inspection
- Can view inspection photos for damaged areas
- Can see AI estimate with line items
- Shows expected materials and labor hours
- Can mark as More/Less work than estimated
- Feedback improves future AI accuracy

## Technical Notes
- API: GET /api/maintenance/:id/inspection
- Service: MaintenanceService.getInspectionDetails()
- Link: MaintenanceRequest.inspectionId
- Component: WorkOrderInspectionView

## Story Points
3

See: docs/USER_STORIES.md for full details"

Write-Host "  Created: Story 5.1 - Technician View" -ForegroundColor Gray

gh issue create --repo $REPO `
  --title "[STORY] Track Actual vs Estimated Costs" `
  --milestone "Epic 5: Workflow Automation" `
  --label "type: feature,phase-5: workflow,priority: medium,size: M" `
  --body "**User Story 5.2 - Technician Workflow**

## User Story
**As a** Maintenance Technician  
**I want to** record actual time and materials used vs the AI estimate  
**So that** the system can learn and improve estimate accuracy

## Acceptance Criteria
- Can log actual hours worked
- Can log actual materials with costs
- Shows variance from AI estimate (percentage)
- Calculates actual total cost
- Data feeds back to AI model training
- Shows technician estimate accuracy over time

## Technical Notes
- API: POST /api/maintenance/:id/actual-costs
- Service: MaintenanceService.recordActualCosts()
- Analytics: Track for AI model improvement
- Dashboard: Estimate accuracy metrics

## Story Points
5

See: docs/USER_STORIES.md for full details"

Write-Host "  Created: Story 5.2 - Track Costs" -ForegroundColor Gray
Write-Host ""

# User Stories - Workflow 6: Tenant Self-Service
Write-Host "Creating Workflow 6 user stories (Tenant Self-Service)..." -ForegroundColor Cyan

gh issue create --repo $REPO `
  --title "[STORY] View Inspection History in Tenant Portal" `
  --milestone "Epic 3: Frontend UI Components" `
  --label "type: feature,phase-3: frontend,priority: low,size: M" `
  --body "**User Story 6.1 - Tenant Self-Service Workflow**

## User Story
**As a** Tenant  
**I want to** view my move-in inspection report and photos in the portal  
**So that** I have a record of the property condition when I moved in

## Acceptance Criteria
- Tenant can access inspection report from dashboard
- Shows all photos from move-in inspection
- Shows signed inspection document
- Can download PDF report
- Can print for records
- Shows move-out comparison if available

## Technical Notes
- Route: /tenant/inspections
- Component: TenantInspectionView (read-only)
- API: GET /api/tenant/inspections
- Permission: Only own unit inspections

## Story Points
5

See: docs/USER_STORIES.md for full details"

Write-Host "  Created: Story 6.1 - Tenant View" -ForegroundColor Gray

gh issue create --repo $REPO `
  --title "[STORY] Dispute Security Deposit Deductions" `
  --milestone "Epic 3: Frontend UI Components" `
  --label "type: feature,phase-3: frontend,priority: medium,size: XL" `
  --body "**User Story 6.2 - Tenant Self-Service Workflow**

## User Story
**As a** Tenant  
**I want to** submit disputes for security deposit deductions  
**So that** I can challenge charges I believe are unfair

## Acceptance Criteria
- Can view itemized deduction list
- Can select items to dispute
- Can upload counter-evidence photos
- Can write dispute explanation (500 char limit)
- Dispute submitted to property manager for review
- Email confirmation sent to tenant
- Shows dispute status (Pending/Resolved)

## Technical Notes
- Component: DisputeForm (tenant portal)
- API: POST /api/deposits/:id/dispute
- Service: DepositService.submitDispute()
- Workflow: Notification to property manager
- Email: EmailService.sendDisputeNotification()

## Story Points
13

See: docs/USER_STORIES.md for full details"

Write-Host "  Created: Story 6.2 - Dispute Deductions" -ForegroundColor Gray
Write-Host ""

# User Stories - Workflow 7: Reporting
Write-Host "Creating Workflow 7 user stories (Reporting & Analytics)..." -ForegroundColor Cyan

gh issue create --repo $REPO `
  --title "[STORY] Generate Property Condition Summary Report" `
  --milestone "Epic 3: Frontend UI Components" `
  --label "type: feature,phase-3: frontend,priority: medium,size: L" `
  --body "**User Story 7.1 - Reporting Workflow**

## User Story
**As a** Property Owner  
**I want to** view a summary report of all inspections across my properties  
**So that** I can track property condition trends and maintenance costs

## Acceptance Criteria
- Dashboard shows inspection count by property
- Shows average condition rating per property
- Shows total move-out damage costs per property
- Bar chart of inspections over time
- Pie chart of damage categories
- Exportable to PDF and Excel
- Filterable by date range and property

## Technical Notes
- Component: PropertyConditionDashboard
- API: GET /api/reports/property-condition
- Service: ReportService.getConditionSummary()
- Charts: Chart.js library
- Export: PDF (PDFKit), Excel (xlsx)

## Story Points
8

See: docs/USER_STORIES.md for full details"

Write-Host "  Created: Story 7.1 - Condition Report" -ForegroundColor Gray

gh issue create --repo $REPO `
  --title "[STORY] Track AI Estimate Accuracy Dashboard" `
  --milestone "Epic 4: AI Agent Integration" `
  --label "type: feature,phase-4: ai-agent,priority: low,size: XL" `
  --body "**User Story 7.2 - Reporting Workflow**

## User Story
**As a** Property Manager  
**I want to** view AI estimate accuracy metrics over time  
**So that** I can trust the system and identify areas for improvement

## Acceptance Criteria
- Shows overall accuracy percentage
- Compares AI estimates to actual costs
- Breaks down accuracy by damage type
- Shows trend of accuracy improving over time
- Identifies items consistently over/under estimated
- Shows sample size for statistical significance
- Exportable metrics report

## Technical Notes
- Component: EstimateAccuracyDashboard
- API: GET /api/reports/estimate-accuracy
- Service: AnalyticsService.getEstimateAccuracy()
- Metrics: MAE, RMSE, percentage variance
- ML Feedback: Used to retrain models

## Story Points
13

See: docs/USER_STORIES.md for full details"

Write-Host "  Created: Story 7.2 - Accuracy Dashboard" -ForegroundColor Gray
Write-Host ""

# Non-Functional User Stories
Write-Host "Creating non-functional user stories..." -ForegroundColor Cyan

gh issue create --repo $REPO `
  --title "[STORY] Mobile-Responsive Inspection Interface" `
  --milestone "Epic 3: Frontend UI Components" `
  --label "type: enhancement,phase-3: frontend,priority: high,size: L" `
  --body "**Non-Functional Story - Mobile Performance**

## User Story
**As a** Property Manager  
**I want** the inspection interface to work seamlessly on tablets and phones  
**So that** I can conduct inspections on-site without a laptop

## Acceptance Criteria
- Works on iOS Safari and Android Chrome
- Touch-friendly UI with large tap targets
- Photo upload from device camera
- Signature pad works with finger
- Responsive layout for 7-inch and 10-inch tablets
- No horizontal scrolling required
- Loads in under 3 seconds on 4G

## Technical Notes
- Framework: Responsive CSS, mobile-first design
- Testing: BrowserStack or manual device testing
- Photo: Compress images before upload
- Performance: Lazy loading, code splitting

## Story Points
8

See: docs/USER_STORIES.md for full details"

Write-Host "  Created: Story - Mobile Responsive" -ForegroundColor Gray

gh issue create --repo $REPO `
  --title "[STORY] Photo Upload Performance Optimization" `
  --milestone "Epic 3: Frontend UI Components" `
  --label "type: enhancement,phase-3: frontend,priority: medium,size: L" `
  --body "**Non-Functional Story - Performance**

## User Story
**As a** Property Manager  
**I want** photo uploads to be fast and reliable  
**So that** I can document inspections without delays

## Acceptance Criteria
- Images compressed client-side before upload
- Maximum 5MB per photo after compression
- Multiple photos upload in parallel (max 3)
- Shows upload progress indicator
- Retry failed uploads automatically
- Can queue uploads when offline
- Uploads complete in under 10 seconds total

## Technical Notes
- Compression: browser-image-compression library
- Storage: S3 or local file system
- Queue: Background job queue for retries
- Format: Convert to JPEG, quality 80%

## Story Points
8

See: docs/USER_STORIES.md for full details"

Write-Host "  Created: Story - Photo Performance" -ForegroundColor Gray

gh issue create --repo $REPO `
  --title "[STORY] AI Estimate Reliability and Error Handling" `
  --milestone "Epic 4: AI Agent Integration" `
  --label "type: enhancement,phase-4: ai-agent,priority: high,size: M" `
  --body "**Non-Functional Story - Reliability**

## User Story
**As a** Property Manager  
**I want** AI estimate generation to be reliable and handle errors gracefully  
**So that** I can trust the system even when API issues occur

## Acceptance Criteria
- AI estimate completes successfully 95% of time
- Shows clear error messages for failures
- Retries failed API calls (max 3 attempts)
- Fallback to manual estimate if AI fails
- Logs all errors for debugging
- Shows partial results if some items fail
- Notifies admin of repeated failures

## Technical Notes
- Error handling: Try-catch with exponential backoff
- Logging: Winston logger with error tracking
- Monitoring: Track failure rate metrics
- Fallback: Manual estimate form
- SLA: 30 seconds max, 95% success rate

## Story Points
5

See: docs/USER_STORIES.md for full details"

Write-Host "  Created: Story - AI Reliability" -ForegroundColor Gray
Write-Host ""

# Summary
Write-Host "========================================" -ForegroundColor Green
Write-Host "Issue Creation Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Summary:" -ForegroundColor Yellow
Write-Host "  Phase 1 Week 2 Tasks: 4 issues created" -ForegroundColor White
Write-Host "  Phase 1 Week 3 Tasks: 5 issues created" -ForegroundColor White
Write-Host "  Workflow 1 Stories: 3 issues created" -ForegroundColor White
Write-Host "  Workflow 2 Stories: 3 issues created" -ForegroundColor White
Write-Host "  Workflow 3 Stories: 2 issues created" -ForegroundColor White
Write-Host "  Workflow 4 Stories: 2 issues created" -ForegroundColor White
Write-Host "  Workflow 5 Stories: 2 issues created" -ForegroundColor White
Write-Host "  Workflow 6 Stories: 2 issues created" -ForegroundColor White
Write-Host "  Workflow 7 Stories: 2 issues created" -ForegroundColor White
Write-Host "  Non-Functional Stories: 3 issues created" -ForegroundColor White
Write-Host "  ----------------------------------------" -ForegroundColor White
Write-Host "  TOTAL: 28 new issues created" -ForegroundColor Green
Write-Host "  Total with Week 1: 31 issues" -ForegroundColor Green
Write-Host ""
Write-Host "View all issues:" -ForegroundColor Cyan
Write-Host "  https://github.com/jholt1988/pms/issues" -ForegroundColor White
Write-Host ""
Write-Host "Next Step: Set up GitHub Project Board" -ForegroundColor Yellow
Write-Host "  Go to: https://github.com/jholt1988/pms/projects" -ForegroundColor White
Write-Host "  Follow: docs/GITHUB_PROJECT_BOARD.md" -ForegroundColor White
Write-Host ""
