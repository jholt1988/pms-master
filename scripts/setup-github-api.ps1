# GitHub Project Setup Script (API Version)
# KeyCheck Integration - Property Management Suite

$ErrorActionPreference = "Stop"
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
try {
    gh auth status 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) { throw }
} catch {
    Write-Host "ERROR: Not authenticated. Run: gh auth login" -ForegroundColor Red
    exit 1
}

Write-Host "GitHub CLI authenticated" -ForegroundColor Green
Write-Host ""

# Create Milestones using API
Write-Host "Creating Milestones..." -ForegroundColor Cyan

$milestones = @(
    @{ title = "Epic 1: Data Model Unification"; description = "Phase 1: Prisma schema extensions, migrations, seed data (Weeks 1-3)"; due_on = "2025-12-02T00:00:00Z" }
    @{ title = "Epic 2: Backend API Development"; description = "Phase 2: NestJS inspection module, services, controllers (Weeks 4-7)"; due_on = "2025-12-30T00:00:00Z" }
    @{ title = "Epic 3: Frontend UI Components"; description = "Phase 3: React components, inspection forms, photo upload (Weeks 8-11)"; due_on = "2026-01-27T00:00:00Z" }
    @{ title = "Epic 4: AI Agent Integration"; description = "Phase 4: OpenAI agents, estimate generation, tools (Weeks 12-14)"; due_on = "2026-02-17T00:00:00Z" }
    @{ title = "Epic 5: Workflow Automation"; description = "Phase 5: Inspection to Maintenance, email notifications (Weeks 15-16)"; due_on = "2026-03-03T00:00:00Z" }
    @{ title = "Epic 6: Testing and QA"; description = "Phase 6: Unit tests, E2E tests, performance testing (Weeks 17-18)"; due_on = "2026-03-17T00:00:00Z" }
    @{ title = "Epic 7: Documentation"; description = "Phase 7: User guides, API docs, training materials (Week 19)"; due_on = "2026-03-24T00:00:00Z" }
)

foreach ($milestone in $milestones) {
    $body = $milestone | ConvertTo-Json -Compress
    try {
        $body | gh api -X POST "repos/$REPO/milestones" --input - 2>&1 | Out-Null
        Write-Host "  Created: $($milestone.title)" -ForegroundColor Gray
    } catch {
        Write-Host "  Skipped: $($milestone.title) (may already exist)" -ForegroundColor Yellow
    }
}

Write-Host "Milestones created" -ForegroundColor Green
Write-Host ""

# Create Labels
Write-Host "Creating Labels..." -ForegroundColor Cyan

gh label create "priority: critical" --color "d73a4a" --description "P0 - Blocking, immediate attention" --repo $REPO --force 2>&1 | Out-Null
gh label create "priority: high" --color "ff9800" --description "P1 - Core functionality, current sprint" --repo $REPO --force 2>&1 | Out-Null
gh label create "priority: medium" --color "ffc107" --description "P2 - Important, next sprint" --repo $REPO --force 2>&1 | Out-Null
gh label create "priority: low" --color "9e9e9e" --description "P3 - Nice to have, backlog" --repo $REPO --force 2>&1 | Out-Null

gh label create "type: feature" --color "4caf50" --description "New functionality" --repo $REPO --force 2>&1 | Out-Null
gh label create "type: bug" --color "d73a4a" --description "Defect or error" --repo $REPO --force 2>&1 | Out-Null
gh label create "type: enhancement" --color "2196f3" --description "Improvement to existing feature" --repo $REPO --force 2>&1 | Out-Null
gh label create "type: documentation" --color "9c27b0" --description "Documentation only" --repo $REPO --force 2>&1 | Out-Null
gh label create "type: technical-debt" --color "795548" --description "Code quality work" --repo $REPO --force 2>&1 | Out-Null
gh label create "type: spike" --color "00bcd4" --description "Research or investigation" --repo $REPO --force 2>&1 | Out-Null

gh label create "status: blocked" --color "d73a4a" --description "Cannot proceed" --repo $REPO --force 2>&1 | Out-Null
gh label create "status: waiting" --color "ffc107" --description "Waiting on external input" --repo $REPO --force 2>&1 | Out-Null
gh label create "status: in-progress" --color "2196f3" --description "Active development" --repo $REPO --force 2>&1 | Out-Null
gh label create "status: in-review" --color "ff9800" --description "Code review phase" --repo $REPO --force 2>&1 | Out-Null
gh label create "status: done" --color "4caf50" --description "Completed" --repo $REPO --force 2>&1 | Out-Null

gh label create "component: backend" --color "9c27b0" --description "Backend/API work" --repo $REPO --force 2>&1 | Out-Null
gh label create "component: frontend" --color "2196f3" --description "Frontend/UI work" --repo $REPO --force 2>&1 | Out-Null
gh label create "component: database" --color "4caf50" --description "Database/Schema work" --repo $REPO --force 2>&1 | Out-Null
gh label create "component: ai-ml" --color "ff9800" --description "AI/ML work" --repo $REPO --force 2>&1 | Out-Null
gh label create "component: testing" --color "00bcd4" --description "Testing work" --repo $REPO --force 2>&1 | Out-Null
gh label create "component: documentation" --color "9e9e9e" --description "Documentation work" --repo $REPO --force 2>&1 | Out-Null

gh label create "phase-1: data-model" --color "e1bee7" --description "Phase 1: Data Model Unification" --repo $REPO --force 2>&1 | Out-Null
gh label create "phase-2: backend" --color "ce93d8" --description "Phase 2: Backend Integration" --repo $REPO --force 2>&1 | Out-Null
gh label create "phase-3: frontend" --color "ba68c8" --description "Phase 3: Frontend Integration" --repo $REPO --force 2>&1 | Out-Null
gh label create "phase-4: ai-agent" --color "ab47bc" --description "Phase 4: AI Agent Integration" --repo $REPO --force 2>&1 | Out-Null
gh label create "phase-5: workflow" --color "9c27b0" --description "Phase 5: Workflow Integration" --repo $REPO --force 2>&1 | Out-Null
gh label create "phase-6: testing" --color "8e24aa" --description "Phase 6: Testing and QA" --repo $REPO --force 2>&1 | Out-Null
gh label create "phase-7: documentation" --color "7b1fa2" --description "Phase 7: Documentation" --repo $REPO --force 2>&1 | Out-Null

gh label create "size: XS" --color "c8e6c9" --description "1-2 story points" --repo $REPO --force 2>&1 | Out-Null
gh label create "size: S" --color "a5d6a7" --description "3 story points" --repo $REPO --force 2>&1 | Out-Null
gh label create "size: M" --color "81c784" --description "5 story points" --repo $REPO --force 2>&1 | Out-Null
gh label create "size: L" --color "66bb6a" --description "8 story points" --repo $REPO --force 2>&1 | Out-Null
gh label create "size: XL" --color "4caf50" --description "13 story points" --repo $REPO --force 2>&1 | Out-Null
gh label create "size: XXL" --color "388e3c" --description "21 points - needs splitting" --repo $REPO --force 2>&1 | Out-Null

Write-Host "Labels created" -ForegroundColor Green
Write-Host ""

# Get milestone numbers
Write-Host "Fetching milestone numbers..." -ForegroundColor Cyan
$milestonesData = gh api "repos/$REPO/milestones" | ConvertFrom-Json
$epic1 = ($milestonesData | Where-Object { $_.title -eq "Epic 1: Data Model Unification" }).number

if (-not $epic1) {
    Write-Host "ERROR: Could not find Epic 1 milestone. Creating issues without milestone." -ForegroundColor Red
    $epic1 = $null
}

Write-Host ""

# Create Phase 1 Issues
Write-Host "Creating Phase 1 Issues..." -ForegroundColor Cyan

# Task 1.1
$task1Body = "**Phase 1, Week 1, Task 1.1**

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

See: docs/PHASE_1_TASK_BREAKDOWN.md for full details"

gh issue create --repo $REPO `
    --title "[TASK] Environment Setup and Prerequisites" `
    --milestone "Epic 1: Data Model Unification" `
    --label "phase-1: data-model,component: backend,priority: high,size: XS" `
    --body $task1Body

# Task 1.2
$task2Body = "**Phase 1, Week 1, Task 1.2**

## Description
Design complete Prisma schema extensions for inspection system.

## Subtasks
- Map KeyCheck data models to Prisma schema format
- Design UnitInspection model with relations
- Design InspectionRoom model
- Design InspectionChecklistItem and SubItem models
- Design UnitInspectionPhoto model
- Design InspectionSignature model
- Design RepairEstimate and LineItem models
- Define all enums (InspectionType, InspectionStatus, ConditionRating, etc.)
- Map relationships and foreign keys
- Add indexes for query optimization

## Acceptance Criteria
- Complete Prisma schema draft with all 9 models
- All relationships properly defined
- Schema passes Prisma validation

## Estimate
8 hours / 8 story points

See: docs/PHASE_1_TASK_BREAKDOWN.md for full details"

gh issue create --repo $REPO `
    --title "[TASK] Design Prisma Schema Extensions" `
    --milestone "Epic 1: Data Model Unification" `
    --label "phase-1: data-model,component: database,priority: high,size: L" `
    --body $task2Body

# Task 1.3
$task3Body = "**Phase 1, Week 1, Task 1.3**

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
- Schema design document updated with decisions
- Tech lead approval obtained

## Estimate
4 hours / 2 story points

See: docs/PHASE_1_TASK_BREAKDOWN.md for full details"

gh issue create --repo $REPO `
    --title "[TASK] Schema Review and Refinement" `
    --milestone "Epic 1: Data Model Unification" `
    --label "phase-1: data-model,component: database,priority: high,size: XS" `
    --body $task3Body

Write-Host "Phase 1 issues created (3 tasks)" -ForegroundColor Green
Write-Host ""

Write-Host "Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Review created issues at: https://github.com/$REPO/issues"
Write-Host "2. Create remaining Phase 1 issues from docs/PHASE_1_TASK_BREAKDOWN.md"
Write-Host "3. Create user stories from docs/USER_STORIES.md"
Write-Host "4. Set up GitHub Project Board:"
Write-Host "   - Go to https://github.com/$REPO/projects"
Write-Host "   - Click 'New project' -> 'Board' template"
Write-Host "   - Name it 'KeyCheck Integration'"
Write-Host "   - Configure per docs/GITHUB_PROJECT_BOARD.md"
Write-Host ""
Write-Host "Documentation:" -ForegroundColor Cyan
Write-Host "- Integration Plan: KEYCHECK_INTEGRATION_PLAN.md"
Write-Host "- Phase 1 Tasks: docs/PHASE_1_TASK_BREAKDOWN.md"
Write-Host "- User Stories: docs/USER_STORIES.md"
Write-Host "- Project Board: docs/GITHUB_PROJECT_BOARD.md"
Write-Host ""
