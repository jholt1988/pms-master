# GitHub Project Setup Script (Simple Version)
# KeyCheck Integration - Property Management Suite

$ErrorActionPreference = "Continue"
$REPO = "jholt1988/pms"

Write-Host "Setting up GitHub Project Board for KeyCheck Integration" -ForegroundColor Green
Write-Host "Repository: $REPO"
Write-Host ""

# Check if gh CLI is installed
if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: GitHub CLI (gh) not found. Install from: https://cli.github.com/" -ForegroundColor Red
    exit 1
}

# Check authentication
$authCheck = gh auth status 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Not authenticated. Run: gh auth login" -ForegroundColor Red
    exit 1
}

Write-Host "GitHub CLI authenticated" -ForegroundColor Green
Write-Host ""

# Create Milestones
Write-Host "Creating Milestones..." -ForegroundColor Cyan

gh milestone create --title "Epic 1: Data Model Unification" --description "Phase 1: Prisma schema extensions, migrations, seed data (Weeks 1-3)" --due-date "2025-12-02" --repo $REPO 2>&1 | Out-Null
gh milestone create --title "Epic 2: Backend API Development" --description "Phase 2: NestJS inspection module, services, controllers (Weeks 4-7)" --due-date "2025-12-30" --repo $REPO 2>&1 | Out-Null
gh milestone create --title "Epic 3: Frontend UI Components" --description "Phase 3: React components, inspection forms, photo upload (Weeks 8-11)" --due-date "2026-01-27" --repo $REPO 2>&1 | Out-Null
gh milestone create --title "Epic 4: AI Agent Integration" --description "Phase 4: OpenAI agents, estimate generation, tools (Weeks 12-14)" --due-date "2026-02-17" --repo $REPO 2>&1 | Out-Null
gh milestone create --title "Epic 5: Workflow Automation" --description "Phase 5: Inspection to Maintenance, email notifications (Weeks 15-16)" --due-date "2026-03-03" --repo $REPO 2>&1 | Out-Null
gh milestone create --title "Epic 6: Testing and QA" --description "Phase 6: Unit tests, E2E tests, performance testing (Weeks 17-18)" --due-date "2026-03-17" --repo $REPO 2>&1 | Out-Null
gh milestone create --title "Epic 7: Documentation" --description "Phase 7: User guides, API docs, training materials (Week 19)" --due-date "2026-03-24" --repo $REPO 2>&1 | Out-Null

Write-Host "Milestones created" -ForegroundColor Green
Write-Host ""

# Create Priority Labels
Write-Host "Creating Labels..." -ForegroundColor Cyan

gh label create "priority: critical" --color "d73a4a" --description "P0 - Blocking, immediate attention" --repo $REPO --force 2>&1 | Out-Null
gh label create "priority: high" --color "ff9800" --description "P1 - Core functionality, current sprint" --repo $REPO --force 2>&1 | Out-Null
gh label create "priority: medium" --color "ffc107" --description "P2 - Important, next sprint" --repo $REPO --force 2>&1 | Out-Null
gh label create "priority: low" --color "9e9e9e" --description "P3 - Nice to have, backlog" --repo $REPO --force 2>&1 | Out-Null

# Type Labels
gh label create "type: feature" --color "4caf50" --description "New functionality" --repo $REPO --force 2>&1 | Out-Null
gh label create "type: bug" --color "d73a4a" --description "Defect or error" --repo $REPO --force 2>&1 | Out-Null
gh label create "type: enhancement" --color "2196f3" --description "Improvement to existing feature" --repo $REPO --force 2>&1 | Out-Null
gh label create "type: documentation" --color "9c27b0" --description "Documentation only" --repo $REPO --force 2>&1 | Out-Null
gh label create "type: technical-debt" --color "795548" --description "Code quality work" --repo $REPO --force 2>&1 | Out-Null
gh label create "type: spike" --color "00bcd4" --description "Research or investigation" --repo $REPO --force 2>&1 | Out-Null

# Status Labels
gh label create "status: blocked" --color "d73a4a" --description "Cannot proceed" --repo $REPO --force 2>&1 | Out-Null
gh label create "status: waiting" --color "ffc107" --description "Waiting on external input" --repo $REPO --force 2>&1 | Out-Null
gh label create "status: in-progress" --color "2196f3" --description "Active development" --repo $REPO --force 2>&1 | Out-Null
gh label create "status: in-review" --color "ff9800" --description "Code review phase" --repo $REPO --force 2>&1 | Out-Null
gh label create "status: done" --color "4caf50" --description "Completed" --repo $REPO --force 2>&1 | Out-Null

# Component Labels
gh label create "component: backend" --color "9c27b0" --description "Backend/API work" --repo $REPO --force 2>&1 | Out-Null
gh label create "component: frontend" --color "2196f3" --description "Frontend/UI work" --repo $REPO --force 2>&1 | Out-Null
gh label create "component: database" --color "4caf50" --description "Database/Schema work" --repo $REPO --force 2>&1 | Out-Null
gh label create "component: ai-ml" --color "ff9800" --description "AI/ML work" --repo $REPO --force 2>&1 | Out-Null
gh label create "component: testing" --color "00bcd4" --description "Testing work" --repo $REPO --force 2>&1 | Out-Null
gh label create "component: documentation" --color "9e9e9e" --description "Documentation work" --repo $REPO --force 2>&1 | Out-Null

# Phase Labels
gh label create "phase-1: data-model" --color "e1bee7" --description "Phase 1: Data Model Unification" --repo $REPO --force 2>&1 | Out-Null
gh label create "phase-2: backend" --color "ce93d8" --description "Phase 2: Backend Integration" --repo $REPO --force 2>&1 | Out-Null
gh label create "phase-3: frontend" --color "ba68c8" --description "Phase 3: Frontend Integration" --repo $REPO --force 2>&1 | Out-Null
gh label create "phase-4: ai-agent" --color "ab47bc" --description "Phase 4: AI Agent Integration" --repo $REPO --force 2>&1 | Out-Null
gh label create "phase-5: workflow" --color "9c27b0" --description "Phase 5: Workflow Integration" --repo $REPO --force 2>&1 | Out-Null
gh label create "phase-6: testing" --color "8e24aa" --description "Phase 6: Testing and QA" --repo $REPO --force 2>&1 | Out-Null
gh label create "phase-7: documentation" --color "7b1fa2" --description "Phase 7: Documentation" --repo $REPO --force 2>&1 | Out-Null

# Size Labels
gh label create "size: XS" --color "c8e6c9" --description "1-2 story points" --repo $REPO --force 2>&1 | Out-Null
gh label create "size: S" --color "a5d6a7" --description "3 story points" --repo $REPO --force 2>&1 | Out-Null
gh label create "size: M" --color "81c784" --description "5 story points" --repo $REPO --force 2>&1 | Out-Null
gh label create "size: L" --color "66bb6a" --description "8 story points" --repo $REPO --force 2>&1 | Out-Null
gh label create "size: XL" --color "4caf50" --description "13 story points" --repo $REPO --force 2>&1 | Out-Null
gh label create "size: XXL" --color "388e3c" --description "21 points - needs splitting" --repo $REPO --force 2>&1 | Out-Null

Write-Host "Labels created" -ForegroundColor Green
Write-Host ""

# Create Phase 1 Issues
Write-Host "Creating Phase 1 Issues..." -ForegroundColor Cyan

# Task 1.1
gh issue create --repo $REPO `
    --title "[TASK] Environment Setup and Prerequisites" `
    --milestone "Epic 1: Data Model Unification" `
    --label "phase-1: data-model,component: backend,priority: high,size: XS" `
    --body "**Phase 1, Week 1, Task 1.1**

## Description
Set up local development environment with both codebases and prepare for integration work.

## Subtasks
- Set up local development environment with both codebases
- Clone KeyCheck repository and review data structures
- Install Prisma CLI and verify PostgreSQL connection
- Create feature branch: feature/inspection-integration-phase1
- Document current PMS schema models
- Document KeyCheck Supabase schema for comparison

## Acceptance Criteria
- Both applications run locally without conflicts
- Database connection verified for PMS PostgreSQL
- Feature branch created and pushed to remote
- Schema comparison document created

## Estimate
4 hours / 2 story points

See: docs/PHASE_1_TASK_BREAKDOWN.md for full details" 2>&1 | Out-Null

# Task 1.2
gh issue create --repo $REPO `
    --title "[TASK] Design Prisma Schema Extensions" `
    --milestone "Epic 1: Data Model Unification" `
    --label "phase-1: data-model,component: database,priority: high,size: L" `
    --body "**Phase 1, Week 1, Task 1.2**

## Description
Design complete Prisma schema extensions for inspection system.

## Subtasks
- Map KeyCheck data models to Prisma schema format
- Design UnitInspection model with relations
- Design InspectionRoom model
- Design InspectionChecklistItem model
- Design InspectionChecklistSubItem model
- Design UnitInspectionPhoto model
- Design InspectionSignature model
- Design RepairEstimate model
- Design RepairEstimateLineItem model
- Define all enums
- Map relationships and foreign keys
- Add indexes for query optimization

## Acceptance Criteria
- Complete Prisma schema draft
- All relationships properly defined
- Schema passes validation

## Estimate
8 hours / 8 story points

See: docs/PHASE_1_TASK_BREAKDOWN.md for full details" 2>&1 | Out-Null

# Task 1.3
gh issue create --repo $REPO `
    --title "[TASK] Schema Review and Refinement" `
    --milestone "Epic 1: Data Model Unification" `
    --label "phase-1: data-model,component: database,priority: high,size: XS" `
    --body "**Phase 1, Week 1, Task 1.3**

## Description
Conduct peer review of Prisma schema design and refine based on feedback.

## Subtasks
- Schedule schema review meeting with backend team
- Walk through each model and relation
- Document any design decisions or trade-offs
- Address feedback and make necessary adjustments
- Get approval from tech lead

## Acceptance Criteria
- Schema reviewed by at least 2 team members
- All feedback addressed
- Schema design document updated
- Tech lead approval obtained

## Estimate
4 hours / 2 story points

See: docs/PHASE_1_TASK_BREAKDOWN.md for full details" 2>&1 | Out-Null

Write-Host "Phase 1 issues created (3 tasks)" -ForegroundColor Green
Write-Host ""

Write-Host "Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Review created issues at: https://github.com/$REPO/issues"
Write-Host "2. Create remaining Phase 1 issues from docs/PHASE_1_TASK_BREAKDOWN.md"
Write-Host "3. Create user stories from docs/USER_STORIES.md"
Write-Host "4. Set up GitHub Project Board (Projects -> New -> Board template)"
Write-Host "5. Configure custom fields per docs/GITHUB_PROJECT_BOARD.md"
Write-Host ""
Write-Host "Documentation:" -ForegroundColor Cyan
Write-Host "- Integration Plan: KEYCHECK_INTEGRATION_PLAN.md"
Write-Host "- Phase 1 Tasks: docs/PHASE_1_TASK_BREAKDOWN.md"
Write-Host "- User Stories: docs/USER_STORIES.md"
Write-Host "- Project Board: docs/GITHUB_PROJECT_BOARD.md"
Write-Host ""
