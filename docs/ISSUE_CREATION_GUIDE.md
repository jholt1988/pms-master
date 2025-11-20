# Quick Guide: Creating Remaining GitHub Issues

## Phase 1 Issues (Tasks 2.1 - 3.5)

### Week 2: Database Migration (Tasks 2.1-2.4)

```powershell
# Task 2.1: Create Prisma Migration
gh issue create --repo jholt1988/pms `
  --title "[TASK] Create Prisma Migration" `
  --milestone "Epic 1: Data Model Unification" `
  --label "phase-1: data-model,component: database,priority: high,size: M" `
  --body "**Phase 1, Week 2, Task 2.1**`n`nGenerate and execute Prisma migration for inspection models.`n`nEstimate: 6 hours / 5 story points`n`nSee: docs/PHASE_1_TASK_BREAKDOWN.md"

# Task 2.2: Update Prisma Client
gh issue create --repo jholt1988/pms `
  --title "[TASK] Update Prisma Client and Verify Types" `
  --milestone "Epic 1: Data Model Unification" `
  --label "phase-1: data-model,component: backend,priority: high,size: XS" `
  --body "**Phase 1, Week 2, Task 2.2**`n`nRegenerate Prisma Client and verify TypeScript types.`n`nEstimate: 2 hours / 1 story point`n`nSee: docs/PHASE_1_TASK_BREAKDOWN.md"

# Task 2.3: Create Seed Data
gh issue create --repo jholt1988/pms `
  --title "[TASK] Create Inspection Seed Data" `
  --milestone "Epic 1: Data Model Unification" `
  --label "phase-1: data-model,component: database,priority: high,size: L" `
  --body "**Phase 1, Week 2, Task 2.3**`n`nCreate seed data with inspection checklists for different property types.`n`nEstimate: 8 hours / 8 story points`n`nSee: docs/PHASE_1_TASK_BREAKDOWN.md"

# Task 2.4: Add MaintenanceRequest Relation
gh issue create --repo jholt1988/pms `
  --title "[TASK] Add MaintenanceRequest Inspection Link" `
  --milestone "Epic 1: Data Model Unification" `
  --label "phase-1: data-model,component: database,priority: medium,size: S" `
  --body "**Phase 1, Week 2, Task 2.4**`n`nAdd optional inspectionId to MaintenanceRequest model.`n`nEstimate: 3 hours / 3 story points`n`nSee: docs/PHASE_1_TASK_BREAKDOWN.md"
```

### Week 3: Testing & Optimization (Tasks 3.1-3.5)

```powershell
# Task 3.1: Database Indexing
gh issue create --repo jholt1988/pms `
  --title "[TASK] Add Database Indexes for Performance" `
  --milestone "Epic 1: Data Model Unification" `
  --label "phase-1: data-model,component: database,priority: high,size: S" `
  --body "**Phase 1, Week 3, Task 3.1**`n`nCreate composite indexes for common queries.`n`nEstimate: 4 hours / 3 story points`n`nSee: docs/PHASE_1_TASK_BREAKDOWN.md"

# Task 3.2: Test Factories
gh issue create --repo jholt1988/pms `
  --title "[TASK] Create Test Data Factories" `
  --milestone "Epic 1: Data Model Unification" `
  --label "phase-1: data-model,component: testing,priority: high,size: M" `
  --body "**Phase 1, Week 3, Task 3.2**`n`nBuild test factories for all inspection models.`n`nEstimate: 6 hours / 5 story points`n`nSee: docs/PHASE_1_TASK_BREAKDOWN.md"

# Task 3.3: Unit Tests
gh issue create --repo jholt1988/pms `
  --title "[TASK] Write Unit Tests for Data Models" `
  --milestone "Epic 1: Data Model Unification" `
  --label "phase-1: data-model,component: testing,priority: high,size: M" `
  --body "**Phase 1, Week 3, Task 3.3**`n`nCreate comprehensive unit tests for all models (100% coverage target).`n`nEstimate: 6 hours / 5 story points`n`nSee: docs/PHASE_1_TASK_BREAKDOWN.md"

# Task 3.4: Backup Strategy
gh issue create --repo jholt1988/pms `
  --title "[TASK] Implement Database Backup Strategy" `
  --milestone "Epic 1: Data Model Unification" `
  --label "phase-1: data-model,component: database,priority: high,size: S" `
  --body "**Phase 1, Week 3, Task 3.4**`n`nCreate backup scripts and test restoration.`n`nEstimate: 3 hours / 3 story points`n`nSee: docs/PHASE_1_TASK_BREAKDOWN.md"

# Task 3.5: Documentation
gh issue create --repo jholt1988/pms `
  --title "[TASK] Create Schema Documentation" `
  --milestone "Epic 1: Data Model Unification" `
  --label "phase-1: data-model,component: documentation,priority: medium,size: S" `
  --body "**Phase 1, Week 3, Task 3.5**`n`nGenerate ERD diagram and data dictionary.`n`nEstimate: 4 hours / 3 story points`n`nSee: docs/PHASE_1_TASK_BREAKDOWN.md"
```

## Sample User Stories (from docs/USER_STORIES.md)

### Workflow 1: Move-In Inspection

```powershell
# Story 1.1
gh issue create --repo jholt1988/pms `
  --title "[STORY] Schedule Move-In Inspection on Lease Creation" `
  --milestone "Epic 2: Backend API Development" `
  --label "type: feature,phase-2: backend,priority: high,size: M" `
  --body "**User Story 1.1**`n`n**As a** Property Manager`n**I want to** automatically schedule a move-in inspection when lease is created`n**So that** I document property condition before tenant moves in`n`nStory Points: 5`n`nSee: docs/USER_STORIES.md"

# Story 1.2
gh issue create --repo jholt1988/pms `
  --title "[STORY] Conduct Digital Move-In Inspection" `
  --milestone "Epic 3: Frontend UI Components" `
  --label "type: feature,phase-3: frontend,priority: high,size: XL" `
  --body "**User Story 1.2**`n`n**As a** Property Manager`n**I want to** complete inspection on tablet with photos`n**So that** I can efficiently document property condition`n`nStory Points: 13`n`nSee: docs/USER_STORIES.md"

# Story 1.3
gh issue create --repo jholt1988/pms `
  --title "[STORY] Obtain Digital Signatures on Inspection" `
  --milestone "Epic 3: Frontend UI Components" `
  --label "type: feature,phase-3: frontend,priority: high,size: L" `
  --body "**User Story 1.3**`n`n**As a** Property Manager`n**I want to** capture digital signatures from tenant and manager`n**So that** both parties acknowledge property condition`n`nStory Points: 8`n`nSee: docs/USER_STORIES.md"
```

### Workflow 2: AI Estimation

```powershell
# Story 2.1
gh issue create --repo jholt1988/pms `
  --title "[STORY] Generate AI Repair Estimate from Photos" `
  --milestone "Epic 4: AI Agent Integration" `
  --label "type: feature,phase-4: ai-agent,priority: high,size: XXL" `
  --body "**User Story 2.1**`n`n**As a** Property Manager`n**I want to** generate AI repair estimates from inspection photos`n**So that** I can quickly assess move-out charges`n`nStory Points: 21`n`nSee: docs/USER_STORIES.md"

# Story 2.2
gh issue create --repo jholt1988/pms `
  --title "[STORY] Review and Adjust AI Estimates" `
  --milestone "Epic 4: AI Agent Integration" `
  --label "type: feature,phase-4: ai-agent,priority: high,size: L" `
  --body "**User Story 2.2**`n`n**As a** Property Manager`n**I want to** review and manually adjust AI estimates`n**So that** I ensure accuracy before billing`n`nStory Points: 8`n`nSee: docs/USER_STORIES.md"
```

## Batch Creation Script

Save all commands to a file and run:

```powershell
# Save to: scripts\create-all-issues.ps1
# Run with: powershell -ExecutionPolicy Bypass -File .\scripts\create-all-issues.ps1

$REPO = "jholt1988/pms"

Write-Host "Creating Phase 1 Week 2 issues..." -ForegroundColor Cyan
# Paste Task 2.1-2.4 commands here

Write-Host "Creating Phase 1 Week 3 issues..." -ForegroundColor Cyan  
# Paste Task 3.1-3.5 commands here

Write-Host "Creating user story issues..." -ForegroundColor Cyan
# Paste user story commands here

Write-Host "All issues created!" -ForegroundColor Green
gh issue list --repo $REPO
```

## Verify Created Issues

```powershell
# List all issues
gh issue list --repo jholt1988/pms --limit 30

# List issues by milestone
gh issue list --repo jholt1988/pms --milestone "Epic 1: Data Model Unification"

# List issues by label
gh issue list --repo jholt1988/pms --label "phase-1: data-model"

# View specific issue
gh issue view 3 --repo jholt1988/pms
```

## Tips

1. **Story Points to Size Mapping:**
   - XS: 1-2 points
   - S: 3 points
   - M: 5 points
   - L: 8 points
   - XL: 13 points
   - XXL: 21 points

2. **Priority Guidelines:**
   - critical: Blocking work, P0
   - high: Current sprint, P1
   - medium: Next sprint, P2
   - low: Backlog, P3

3. **Component Tags:**
   - Use multiple if task spans areas: `component: backend,component: database`
   - Always include phase tag: `phase-1: data-model`

4. **Milestone Assignment:**
   - Phase 1 tasks → "Epic 1: Data Model Unification"
   - Backend stories → "Epic 2: Backend API Development"
   - Frontend stories → "Epic 3: Frontend UI Components"
   - AI stories → "Epic 4: AI Agent Integration"
   - Workflow stories → "Epic 5: Workflow Automation"
   - Testing stories → "Epic 6: Testing and QA"
   - Docs stories → "Epic 7: Documentation"

## Reference Documents

- **Full task details:** `docs/PHASE_1_TASK_BREAKDOWN.md`
- **All user stories:** `docs/USER_STORIES.md`
- **Label guide:** `docs/GITHUB_PROJECT_BOARD.md`
- **Integration plan:** `KEYCHECK_INTEGRATION_PLAN.md`

---

**Next:** After creating all issues, set up GitHub Project Board per `docs/GITHUB_PROJECT_BOARD.md`
