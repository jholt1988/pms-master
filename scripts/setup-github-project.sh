#!/bin/bash
# GitHub Project Board Setup Script
# KeyCheck Integration - Property Management Suite
# Run this script to create initial issues and milestones

set -e

REPO="jholt1988/pms"
PROJECT_NAME="KeyCheck Integration"

echo "🚀 Setting up GitHub Project Board for KeyCheck Integration"
echo "Repository: $REPO"
echo ""

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) not found. Please install it first:"
    echo "   https://cli.github.com/"
    exit 1
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
    echo "❌ Not authenticated with GitHub CLI. Please run:"
    echo "   gh auth login"
    exit 1
fi

echo "✅ GitHub CLI authenticated"
echo ""

# Create milestones (Epics)
echo "📦 Creating Milestones (Epics)..."

gh milestone create --title "Epic 1: Data Model Unification" \
    --description "Phase 1: Prisma schema extensions, migrations, seed data (Weeks 1-3)" \
    --due-date "2025-12-02" --repo $REPO || echo "Milestone may already exist"

gh milestone create --title "Epic 2: Backend API Development" \
    --description "Phase 2: NestJS inspection module, services, controllers (Weeks 4-7)" \
    --due-date "2025-12-30" --repo $REPO || echo "Milestone may already exist"

gh milestone create --title "Epic 3: Frontend UI Components" \
    --description "Phase 3: React components, inspection forms, photo upload (Weeks 8-11)" \
    --due-date "2026-01-27" --repo $REPO || echo "Milestone may already exist"

gh milestone create --title "Epic 4: AI Agent Integration" \
    --description "Phase 4: OpenAI agents, estimate generation, tools (Weeks 12-14)" \
    --due-date "2026-02-17" --repo $REPO || echo "Milestone may already exist"

gh milestone create --title "Epic 5: Workflow Automation" \
    --description "Phase 5: Inspection→Maintenance, email notifications (Weeks 15-16)" \
    --due-date "2026-03-03" --repo $REPO || echo "Milestone may already exist"

gh milestone create --title "Epic 6: Testing & QA" \
    --description "Phase 6: Unit tests, E2E tests, performance testing (Weeks 17-18)" \
    --due-date "2026-03-17" --repo $REPO || echo "Milestone may already exist"

gh milestone create --title "Epic 7: Documentation" \
    --description "Phase 7: User guides, API docs, training materials (Week 19)" \
    --due-date "2026-03-24" --repo $REPO || echo "Milestone may already exist"

echo "✅ Milestones created"
echo ""

# Create labels
echo "🏷️  Creating Labels..."

# Priority labels
gh label create "priority: critical" --color "d73a4a" --description "P0 - Blocking, immediate attention" --repo $REPO --force
gh label create "priority: high" --color "ff9800" --description "P1 - Core functionality, current sprint" --repo $REPO --force
gh label create "priority: medium" --color "ffc107" --description "P2 - Important, next sprint" --repo $REPO --force
gh label create "priority: low" --color "9e9e9e" --description "P3 - Nice to have, backlog" --repo $REPO --force

# Type labels
gh label create "type: feature" --color "4caf50" --description "New functionality" --repo $REPO --force
gh label create "type: bug" --color "d73a4a" --description "Defect or error" --repo $REPO --force
gh label create "type: enhancement" --color "2196f3" --description "Improvement to existing feature" --repo $REPO --force
gh label create "type: documentation" --color "9c27b0" --description "Documentation only" --repo $REPO --force
gh label create "type: technical-debt" --color "795548" --description "Code quality work" --repo $REPO --force
gh label create "type: spike" --color "00bcd4" --description "Research or investigation" --repo $REPO --force

# Status labels
gh label create "status: blocked" --color "d73a4a" --description "Cannot proceed" --repo $REPO --force
gh label create "status: waiting" --color "ffc107" --description "Waiting on external input" --repo $REPO --force
gh label create "status: in-progress" --color "2196f3" --description "Active development" --repo $REPO --force
gh label create "status: in-review" --color "ff9800" --description "Code review phase" --repo $REPO --force
gh label create "status: done" --color "4caf50" --description "Completed" --repo $REPO --force

# Component labels
gh label create "component: backend" --color "9c27b0" --description "Backend/API work" --repo $REPO --force
gh label create "component: frontend" --color "2196f3" --description "Frontend/UI work" --repo $REPO --force
gh label create "component: database" --color "4caf50" --description "Database/Schema work" --repo $REPO --force
gh label create "component: ai-ml" --color "ff9800" --description "AI/ML work" --repo $REPO --force
gh label create "component: testing" --color "00bcd4" --description "Testing work" --repo $REPO --force
gh label create "component: documentation" --color "9e9e9e" --description "Documentation work" --repo $REPO --force

# Phase labels
gh label create "phase-1: data-model" --color "e1bee7" --description "Phase 1: Data Model Unification" --repo $REPO --force
gh label create "phase-2: backend" --color "ce93d8" --description "Phase 2: Backend Integration" --repo $REPO --force
gh label create "phase-3: frontend" --color "ba68c8" --description "Phase 3: Frontend Integration" --repo $REPO --force
gh label create "phase-4: ai-agent" --color "ab47bc" --description "Phase 4: AI Agent Integration" --repo $REPO --force
gh label create "phase-5: workflow" --color "9c27b0" --description "Phase 5: Workflow Integration" --repo $REPO --force
gh label create "phase-6: testing" --color "8e24aa" --description "Phase 6: Testing & QA" --repo $REPO --force
gh label create "phase-7: documentation" --color "7b1fa2" --description "Phase 7: Documentation" --repo $REPO --force

# Size labels
gh label create "size: XS" --color "c8e6c9" --description "1-2 story points" --repo $REPO --force
gh label create "size: S" --color "a5d6a7" --description "3 story points" --repo $REPO --force
gh label create "size: M" --color "81c784" --description "5 story points" --repo $REPO --force
gh label create "size: L" --color "66bb6a" --description "8 story points" --repo $REPO --force
gh label create "size: XL" --color "4caf50" --description "13 story points" --repo $REPO --force
gh label create "size: XXL" --color "388e3c" --description "21 points - needs splitting" --repo $REPO --force

echo "✅ Labels created"
echo ""

# Create Phase 1 issues
echo "📝 Creating Phase 1 Issues..."

gh issue create --repo $REPO \
    --title "[TASK] Environment Setup & Prerequisites" \
    --milestone "Epic 1: Data Model Unification" \
    --label "phase-1: data-model,component: backend,priority: high,size: XS" \
    --body "**Phase 1, Week 1, Task 1.1**

## Description
Set up local development environment with both codebases and prepare for integration work.

## Subtasks
- [ ] Set up local development environment with both codebases
- [ ] Clone KeyCheck repository and review data structures
- [ ] Install Prisma CLI and verify PostgreSQL connection
- [ ] Create feature branch: \`feature/inspection-integration-phase1\`
- [ ] Document current PMS schema models
- [ ] Document KeyCheck Supabase schema for comparison

## Acceptance Criteria
- Both applications run locally without conflicts
- Database connection verified for PMS PostgreSQL
- Feature branch created and pushed to remote
- Schema comparison document created

## Deliverables
- \`docs/SCHEMA_COMPARISON.md\` - Side-by-side schema analysis

## Estimate
4 hours / 2 story points

See: \`docs/PHASE_1_TASK_BREAKDOWN.md\` for full details"

gh issue create --repo $REPO \
    --title "[TASK] Design Prisma Schema Extensions" \
    --milestone "Epic 1: Data Model Unification" \
    --label "phase-1: data-model,component: database,priority: high,size: L" \
    --body "**Phase 1, Week 1, Task 1.2**

## Description
Design complete Prisma schema extensions for inspection system.

## Subtasks
- [ ] Map KeyCheck data models to Prisma schema format
- [ ] Design UnitInspection model with relations
- [ ] Design InspectionRoom model
- [ ] Design InspectionChecklistItem model
- [ ] Design InspectionChecklistSubItem model
- [ ] Design UnitInspectionPhoto model
- [ ] Design InspectionSignature model
- [ ] Design RepairEstimate model
- [ ] Design RepairEstimateLineItem model
- [ ] Define all enums (InspectionType, Status, Condition, RoomType, EstimateStatus)
- [ ] Map relationships and foreign keys
- [ ] Add indexes for query optimization

## Acceptance Criteria
- Complete Prisma schema draft in schema.prisma
- All relationships properly defined with cascade rules
- Enums match business requirements
- Indexes added for performance-critical queries
- Schema passes Prisma validation: \`npx prisma validate\`

## Deliverables
- Updated \`tenant_portal_backend/prisma/schema.prisma\`
- \`docs/SCHEMA_DESIGN_DECISIONS.md\`

## Estimate
8 hours / 8 story points

See: \`docs/PHASE_1_TASK_BREAKDOWN.md\` for full details"

gh issue create --repo $REPO \
    --title "[TASK] Schema Review & Refinement" \
    --milestone "Epic 1: Data Model Unification" \
    --label "phase-1: data-model,component: database,priority: high,size: S" \
    --body "**Phase 1, Week 1, Task 1.3**

## Description
Conduct peer review of schema design and make necessary adjustments.

## Subtasks
- [ ] Conduct peer review of schema design
- [ ] Validate foreign key relationships
- [ ] Review cascade delete implications
- [ ] Check for naming consistency
- [ ] Verify enum completeness
- [ ] Test schema compatibility with existing queries
- [ ] Address review feedback

## Acceptance Criteria
- Schema approved by tech lead
- No breaking changes to existing models
- Documentation updated
- All review comments addressed

## Deliverables
- Schema review meeting notes
- Approved schema ready for migration

## Estimate
4 hours / 3 story points

See: \`docs/PHASE_1_TASK_BREAKDOWN.md\`"

echo "✅ Phase 1 issues created (3 of 15)"
echo ""
echo "ℹ️  Create remaining Phase 1 issues manually or run extended script"
echo ""

# Create sample user stories
echo "📖 Creating Sample User Stories..."

gh issue create --repo $REPO \
    --title "[STORY] Schedule Move-In Inspection" \
    --milestone "Epic 2: Backend API Development" \
    --label "type: feature,phase-2: backend,priority: high,size: M" \
    --body "**User Story 1.1**

## User Story
**As a** Property Manager  
**I want to** automatically schedule a move-in inspection when a lease is created  
**So that** I don't forget to document the property's initial condition

## Acceptance Criteria
- [ ] When lease is created, system prompts to schedule inspection
- [ ] Inspection auto-scheduled 2 days before lease start date
- [ ] Email notification sent to property manager and tenant
- [ ] Inspection appears in calendar view
- [ ] Inspection linked to specific lease and unit

## Technical Notes
- Trigger: \`LeaseService.createLease()\`
- Auto-create \`ScheduleEvent\` with type \`INSPECTION_MOVE_IN\`
- Send email via \`EmailService.sendInspectionScheduled()\`

## Story Points
5

See: \`docs/USER_STORIES.md\` for full details"

gh issue create --repo $REPO \
    --title "[STORY] Conduct Digital Move-In Inspection" \
    --milestone "Epic 3: Frontend UI Components" \
    --label "type: feature,phase-3: frontend,priority: high,size: XL" \
    --body "**User Story 1.2**

## User Story
**As a** Property Manager  
**I want to** complete a digital inspection checklist on my tablet  
**So that** I can document property condition without paper forms

## Acceptance Criteria
- [ ] Access inspection from property manager dashboard
- [ ] View room-by-room checklist
- [ ] Select condition for each item (Excellent → Non-functional)
- [ ] Add notes to any checklist item
- [ ] Upload photos (up to 5 per item)
- [ ] Mark estimated age of items
- [ ] Check \"Requires Action\" flag
- [ ] Auto-save progress every 30 seconds
- [ ] Continue inspection later if interrupted

## Technical Notes
- Component: \`InspectionDetailPage.tsx\`
- API: \`PATCH /api/inspections/:id/items/:itemId\`
- Use \`PhotoUploader\` component
- LocalStorage for offline capability

## Story Points
13

See: \`docs/USER_STORIES.md\` for full details"

gh issue create --repo $REPO \
    --title "[STORY] Generate AI Repair Estimate from Inspection" \
    --milestone "Epic 4: AI Agent Integration" \
    --label "type: feature,phase-4: ai-agent,priority: high,size: XXL" \
    --body "**User Story 2.1**

## User Story
**As a** Property Manager  
**I want to** automatically generate repair cost estimates from inspection findings  
**So that** I can budget for repairs and plan maintenance

## Acceptance Criteria
- [ ] Button \"Generate Estimate\" visible after inspection completed
- [ ] Click triggers AI analysis of all \"Requires Action\" items
- [ ] Progress indicator shows 6-step process
- [ ] Estimate completes in < 30 seconds
- [ ] Results show total cost, labor/material breakdown
- [ ] Line-by-line breakdown with repair vs replace recommendation
- [ ] Depreciation analysis per item
- [ ] Save estimate to database
- [ ] Email notification with summary

## Technical Notes
- API: \`POST /api/inspections/:id/estimate\`
- Service: \`EstimateService.generateEstimateFromInspection()\`
- OpenAI Agent: \`createEnhancedEstimateAgent()\`
- Progress updates via Server-Sent Events

## Story Points
21 (consider splitting into smaller stories)

See: \`docs/USER_STORIES.md\` for full details"

echo "✅ Sample user stories created (3 of 18)"
echo ""

echo "✨ Initial setup complete!"
echo ""
echo "📋 Next Steps:"
echo "1. Review created issues and milestones on GitHub"
echo "2. Create remaining Phase 1 issues from docs/PHASE_1_TASK_BREAKDOWN.md"
echo "3. Create remaining user stories from docs/USER_STORIES.md"
echo "4. Set up GitHub Project (Projects → New project → Board template)"
echo "5. Configure custom fields as documented in docs/GITHUB_PROJECT_BOARD.md"
echo "6. Link issues to project board"
echo ""
echo "📚 Documentation References:"
echo "- Integration Plan: KEYCHECK_INTEGRATION_PLAN.md"
echo "- Phase 1 Tasks: docs/PHASE_1_TASK_BREAKDOWN.md"
echo "- User Stories: docs/USER_STORIES.md"
echo "- Project Board: docs/GITHUB_PROJECT_BOARD.md"
echo ""
echo "🚀 Happy coding!"
