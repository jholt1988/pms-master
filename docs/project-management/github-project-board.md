# GitHub Project Board Structure
## KeyCheck Integration - Property Management Suite

**Project Name:** KeyCheck Integration  
**Board Type:** Automated Kanban with Custom Fields  
**Created:** November 11, 2025  
**URL:** `https://github.com/jholt1988/pms/projects/1`

---

## Project Board Setup Instructions

### Step 1: Create New Project (GitHub Projects V2)

```bash
# Navigate to repository
https://github.com/jholt1988/pms

# Click "Projects" tab → "New project"
# Select: "Board" template
# Name: "KeyCheck Integration"
# Description: "Integration of property inspection and AI-powered estimate system"
```

---

## Board Columns (Workflow States)

### 1. 📋 Backlog
**Purpose:** All planned work not yet ready to start  
**Entry Criteria:** Story written, estimated  
**Exit Criteria:** Dependencies met, sprint assigned  
**Automation:** None (manual triage)

**Items in this column:**
- User stories not yet scheduled
- Technical debt items
- Future enhancements
- Research spikes

---

### 2. 🎯 Sprint Ready
**Purpose:** Work ready to be pulled into active development  
**Entry Criteria:**
- All dependencies completed
- Acceptance criteria clear
- Story points assigned
- Design/mockups available (if UI work)

**Exit Criteria:** Developer assigns themselves  
**Automation:**
- Auto-move when assigned to sprint milestone
- Label: `sprint-ready`

**Items in this column:**
- Prioritized stories for current/next sprint
- Bug fixes with reproduction steps
- Approved enhancement requests

---

### 3. 🚧 In Progress
**Purpose:** Active development work  
**Entry Criteria:**
- Developer assigned
- Branch created: `feature/ISSUE-123-description`
- Story transitioned from Sprint Ready

**Exit Criteria:** Pull request opened  
**Automation:**
- Auto-move when issue assigned
- Auto-move when branch created with issue number
- Label: `in-progress`

**WIP Limit:** 3 items per developer (recommended)

**Items in this column:**
- Features being coded
- Bugs being fixed
- Documentation being written

---

### 4. 👀 In Review
**Purpose:** Code review and testing phase  
**Entry Criteria:**
- Pull request opened
- All tests passing (CI green)
- Self-review completed

**Exit Criteria:** PR approved by 1+ reviewers  
**Automation:**
- Auto-move when PR opened
- Auto-move back to "In Progress" if changes requested
- Label: `in-review`

**Review SLA:** 24 hours for feedback

**Items in this column:**
- PRs awaiting code review
- PRs awaiting QA testing
- Documentation awaiting approval

---

### 5. ✅ Done (Sprint)
**Purpose:** Completed work in current sprint  
**Entry Criteria:**
- PR merged to develop branch
- Tests passing on develop
- Acceptance criteria verified

**Exit Criteria:** Sprint ends (moved to Archive)  
**Automation:**
- Auto-move when PR merged
- Auto-close issue
- Label: `done`

**Items in this column:**
- Merged features
- Deployed fixes
- Completed documentation

---

### 6. 🚀 Deployed (Staging)
**Purpose:** Features deployed to staging environment  
**Entry Criteria:**
- Merged to develop
- Deployed to staging environment
- Smoke tests passing

**Exit Criteria:** Deployed to production  
**Automation:**
- Label: `deployed-staging`
- Auto-comment with deployment details

**Items in this column:**
- Features in staging testing
- Awaiting production deployment

---

### 7. 🔒 Archived
**Purpose:** Historical record of completed work  
**Entry Criteria:** Sprint completed or issue closed  
**Automation:**
- Auto-move 2 weeks after sprint ends
- Label: `archived`

---

## Custom Fields Configuration

### Field 1: Phase
**Type:** Single Select  
**Options:**
- Phase 1: Data Model (Weeks 1-3)
- Phase 2: Backend Integration (Weeks 4-7)
- Phase 3: Frontend Integration (Weeks 8-11)
- Phase 4: AI Agent Integration (Weeks 12-14)
- Phase 5: Workflow Integration (Weeks 15-16)
- Phase 6: Testing & QA (Weeks 17-18)
- Phase 7: Documentation (Week 19)

**Purpose:** Track which implementation phase the work belongs to

---

### Field 2: Story Points
**Type:** Number (0-21)  
**Values:** 1, 2, 3, 5, 8, 13, 21  
**Purpose:** Estimation for sprint planning

**Guidelines:**
- 1-3: Small tasks (< 1 day)
- 5: Medium tasks (1-2 days)
- 8: Large tasks (2-3 days)
- 13: Very large (3-5 days, consider splitting)
- 21: Epic (must split into smaller stories)

---

### Field 3: Priority
**Type:** Single Select  
**Options:**
- 🔥 Critical (P0) - Blocking, immediate attention
- ⚠️ High (P1) - Core functionality, current sprint
- 📌 Medium (P2) - Important, next sprint
- 📋 Low (P3) - Nice to have, backlog

**Purpose:** Prioritization for work sequencing

---

### Field 4: Component
**Type:** Single Select  
**Options:**
- Backend - API & Services
- Frontend - UI Components
- Database - Schema & Migrations
- AI/ML - Estimate Agent
- Testing - Unit/E2E Tests
- Documentation
- DevOps - CI/CD
- Infrastructure

**Purpose:** Team specialization and filtering

---

### Field 5: Assignee Sprint
**Type:** Single Select  
**Options:**
- Sprint 1 (Nov 11-24, 2025)
- Sprint 2 (Nov 25 - Dec 8, 2025)
- Sprint 3 (Dec 9-22, 2025)
- Sprint 4 (Dec 23 - Jan 5, 2026)
- Sprint 5 (Jan 6-19, 2026)
- Sprint 6 (Jan 20 - Feb 2, 2026)
- Sprint 7 (Feb 3-16, 2026)
- Sprint 8 (Feb 17 - Mar 1, 2026)
- Backlog (Not scheduled)

**Purpose:** Sprint planning and capacity management

---

### Field 6: Estimate Accuracy
**Type:** Single Select  
**Options:**
- 🎯 On Target (±10%)
- 📈 Over Estimated (>10% under actual)
- 📉 Under Estimated (>10% over actual)
- ❓ Not Tracked

**Purpose:** Retrospective analysis and estimation improvement

---

### Field 7: User Persona
**Type:** Multi Select  
**Options:**
- Property Manager
- Maintenance Technician
- Tenant
- Property Owner
- Admin

**Purpose:** Track which users benefit from the feature

---

### Field 8: Blocked By
**Type:** Text  
**Purpose:** Document blocking issues or dependencies  
**Example:** "Blocked by #45 (Database migration)"

---

## Labels Configuration

### Priority Labels
- `priority: critical` (Red) - P0 items
- `priority: high` (Orange) - P1 items
- `priority: medium` (Yellow) - P2 items
- `priority: low` (Gray) - P3 items

### Type Labels
- `type: feature` (Green) - New functionality
- `type: bug` (Red) - Defect or error
- `type: enhancement` (Blue) - Improvement to existing feature
- `type: documentation` (Purple) - Docs only
- `type: technical-debt` (Brown) - Code quality work
- `type: spike` (Cyan) - Research or investigation

### Status Labels
- `status: blocked` (Red) - Cannot proceed
- `status: waiting` (Yellow) - Waiting on external input
- `status: in-progress` (Blue) - Active development
- `status: in-review` (Orange) - Code review phase
- `status: done` (Green) - Completed

### Component Labels
- `component: backend` (Purple)
- `component: frontend` (Blue)
- `component: database` (Green)
- `component: ai-ml` (Orange)
- `component: testing` (Cyan)

### Phase Labels
- `phase-1: data-model`
- `phase-2: backend`
- `phase-3: frontend`
- `phase-4: ai-agent`
- `phase-5: workflow`
- `phase-6: testing`
- `phase-7: documentation`

### Size Labels (T-Shirt)
- `size: XS` (1-2 points)
- `size: S` (3 points)
- `size: M` (5 points)
- `size: L` (8 points)
- `size: XL` (13 points)
- `size: XXL` (21 points - needs splitting)

---

## Issue Templates

### Template 1: Feature Story
**File:** `.github/ISSUE_TEMPLATE/feature_story.md`

```markdown
---
name: Feature Story
about: User story for new functionality
title: '[STORY] '
labels: type: feature
assignees: ''
---

## User Story
**As a** [user persona]  
**I want to** [goal/desire]  
**So that** [benefit/value]

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

## Technical Notes
<!-- Implementation details, API endpoints, components -->

## Design/Mockups
<!-- Link to Figma, screenshots, wireframes -->

## Dependencies
<!-- Related issues, blocking items -->

## Story Points
<!-- Estimate: 1, 2, 3, 5, 8, 13, 21 -->

## Definition of Done
- [ ] Code implemented and reviewed
- [ ] Unit tests written (80%+ coverage)
- [ ] E2E tests passing
- [ ] Documentation updated
- [ ] Deployed to staging
- [ ] Product owner approval
```

---

### Template 2: Bug Report
**File:** `.github/ISSUE_TEMPLATE/bug_report.md`

```markdown
---
name: Bug Report
about: Report a defect or error
title: '[BUG] '
labels: type: bug, priority: medium
assignees: ''
---

## Bug Description
<!-- Clear and concise description of the bug -->

## Steps to Reproduce
1. Go to '...'
2. Click on '...'
3. Scroll down to '...'
4. See error

## Expected Behavior
<!-- What should happen -->

## Actual Behavior
<!-- What actually happens -->

## Screenshots
<!-- If applicable, add screenshots -->

## Environment
- OS: [e.g. Windows 11]
- Browser: [e.g. Chrome 120]
- Version: [e.g. 1.0.0]

## Error Logs
```
Paste error logs here
```

## Possible Fix
<!-- Optional: Suggestions for fixing the bug -->

## Priority
<!-- Critical, High, Medium, Low -->
```

---

### Template 3: Technical Spike
**File:** `.github/ISSUE_TEMPLATE/technical_spike.md`

```markdown
---
name: Technical Spike
about: Research or investigation task
title: '[SPIKE] '
labels: type: spike
assignees: ''
---

## Research Question
<!-- What do we need to find out? -->

## Context
<!-- Why is this research needed? -->

## Goals
- [ ] Goal 1
- [ ] Goal 2

## Time Box
<!-- Maximum time to spend: X hours/days -->

## Deliverables
- [ ] Document findings in `docs/`
- [ ] Present to team
- [ ] Create follow-up stories

## Success Criteria
<!-- How do we know the spike is complete? -->
```

---

## Automation Rules (GitHub Actions)

### Rule 1: Auto-assign to Project
**Trigger:** Issue opened  
**Action:** Add to "KeyCheck Integration" project → Backlog column

```yaml
# .github/workflows/auto-assign-project.yml
name: Auto-assign to Project
on:
  issues:
    types: [opened]
jobs:
  add-to-project:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/add-to-project@v0.4.0
        with:
          project-url: https://github.com/users/jholt1988/projects/1
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

---

### Rule 2: Move to "In Progress" on Branch Creation
**Trigger:** Branch created with issue number  
**Action:** Move issue to "In Progress" column

```yaml
# .github/workflows/branch-to-in-progress.yml
name: Branch to In Progress
on:
  create:
    branches:
      - 'feature/**'
      - 'bugfix/**'
jobs:
  move-to-in-progress:
    runs-on: ubuntu-latest
    steps:
      - name: Extract issue number
        id: extract
        run: |
          ISSUE_NUM=$(echo ${{ github.ref }} | grep -oP '(?<=feature/|bugfix/)(\d+)')
          echo "issue_number=$ISSUE_NUM" >> $GITHUB_OUTPUT
      - name: Move to In Progress
        uses: alex-page/github-project-automation-plus@v0.8.3
        with:
          project: KeyCheck Integration
          column: In Progress
          issue-number: ${{ steps.extract.outputs.issue_number }}
```

---

### Rule 3: Move to "In Review" on PR Open
**Trigger:** Pull request opened  
**Action:** Move linked issue to "In Review"

```yaml
# .github/workflows/pr-to-review.yml
name: PR to In Review
on:
  pull_request:
    types: [opened, reopened]
jobs:
  move-to-review:
    runs-on: ubuntu-latest
    steps:
      - uses: alex-page/github-project-automation-plus@v0.8.3
        with:
          project: KeyCheck Integration
          column: In Review
```

---

### Rule 4: Move to "Done" on PR Merge
**Trigger:** Pull request merged  
**Action:** Move issue to "Done", close issue

```yaml
# .github/workflows/pr-merged.yml
name: PR Merged
on:
  pull_request:
    types: [closed]
jobs:
  move-to-done:
    if: github.event.pull_request.merged == true
    runs-on: ubuntu-latest
    steps:
      - uses: alex-page/github-project-automation-plus@v0.8.3
        with:
          project: KeyCheck Integration
          column: Done
      - name: Close linked issues
        uses: actions/github-script@v6
        with:
          script: |
            const pr = context.payload.pull_request;
            const body = pr.body || '';
            const issueNumbers = body.match(/#(\d+)/g) || [];
            for (const match of issueNumbers) {
              const issueNumber = match.replace('#', '');
              await github.rest.issues.update({
                owner: context.repo.owner,
                repo: context.repo.repo,
                issue_number: issueNumber,
                state: 'closed'
              });
            }
```

---

### Rule 5: Label PR by Component
**Trigger:** Pull request opened  
**Action:** Auto-label based on files changed

```yaml
# .github/workflows/auto-label-pr.yml
name: Auto Label PR
on:
  pull_request:
    types: [opened, edited, synchronize]
jobs:
  label:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/labeler@v4
        with:
          repo-token: ${{ secrets.GITHUB_TOKEN }}
          configuration-path: .github/labeler.yml

# .github/labeler.yml
'component: backend':
  - tenant_portal_backend/**/*
'component: frontend':
  - tenant_portal_app/**/*
'component: database':
  - tenant_portal_backend/prisma/**/*
'component: ai-ml':
  - rent_optimization_ml/**/*
  - tenant_portal_backend/src/inspection/agents/**/*
'component: documentation':
  - docs/**/*
  - '**/*.md'
```

---

## Sprint Planning Process

### Sprint Duration: 2 weeks

### Sprint Ceremonies

#### 1. Sprint Planning (Day 1, 2 hours)
**Participants:** Full team  
**Agenda:**
- Review sprint goal
- Pull stories from "Sprint Ready" to "In Progress"
- Team capacity: 40-50 story points per sprint
- Each developer commits to specific stories
- Identify blockers and dependencies

**Output:** Sprint backlog populated

---

#### 2. Daily Standup (Every day, 15 minutes)
**Participants:** Full team  
**Format:**
- What did I complete yesterday?
- What will I work on today?
- Any blockers?

**Board Review:**
- Check WIP limits (max 3 per person)
- Move cards as needed
- Flag blocked items (red label)

---

#### 3. Sprint Review (Last day, 1 hour)
**Participants:** Team + stakeholders  
**Agenda:**
- Demo completed stories
- Show working software
- Get stakeholder feedback
- Update acceptance criteria if needed

**Board Update:** Move demoed items to "Deployed"

---

#### 4. Sprint Retrospective (Last day, 1 hour)
**Participants:** Team only  
**Agenda:**
- What went well?
- What could be improved?
- Action items for next sprint

**Board Review:**
- Check estimate accuracy
- Update story points if needed
- Archive completed sprint items

---

## Views Configuration

### View 1: Sprint Board (Default)
**Columns:** Backlog → Sprint Ready → In Progress → In Review → Done  
**Filters:**
- Assignee Sprint = Current Sprint
- Status != Archived

**Sort:** Priority (Critical first), then Story Points (largest first)

---

### View 2: Phase Roadmap
**Layout:** Table view  
**Group by:** Phase  
**Columns:** Title, Priority, Story Points, Assignee, Status  
**Filters:** None (show all)  
**Sort:** Phase order, then Priority

**Purpose:** High-level roadmap view for stakeholders

---

### View 3: My Work
**Columns:** In Progress → In Review → Done  
**Filters:**
- Assignee = @me
- Status IN (In Progress, In Review, Done)

**Sort:** Updated (most recent first)

**Purpose:** Individual developer focus view

---

### View 4: Blocked Items
**Layout:** List view  
**Filters:**
- Label = `status: blocked`
- Status != Done

**Sort:** Priority (Critical first), Created (oldest first)

**Purpose:** Daily standup review and unblocking

---

### View 5: Testing Queue
**Layout:** Table view  
**Filters:**
- Component = Testing
- OR Status = In Review

**Columns:** Title, Type, PR Link, Assignee, Priority  
**Sort:** Priority, then Created date

**Purpose:** QA engineer work queue

---

### View 6: Bug Triage
**Layout:** Table view  
**Filters:**
- Type = Bug
- Status = Backlog OR Sprint Ready

**Columns:** Title, Priority, Severity, Reported Date, Component  
**Sort:** Priority (Critical first), Reported Date (oldest first)

**Purpose:** Bug review and prioritization

---

## Metrics & Reporting

### Sprint Velocity Chart
**Track:** Story points completed per sprint  
**Goal:** Establish baseline (average 40-50 points)  
**Review:** End of each sprint

---

### Cycle Time
**Track:** Time from "In Progress" to "Done"  
**Goal:** Average < 5 days per story  
**Review:** Weekly

---

### Work-In-Progress (WIP)
**Track:** Items in "In Progress" column  
**Goal:** Max 3 per developer  
**Review:** Daily standup

---

### Bug Resolution Time
**Track:** Time from bug report to "Done"  
**Goal:** Critical < 24 hours, High < 3 days, Medium < 1 week  
**Review:** Weekly

---

### Estimate Accuracy
**Track:** Actual vs estimated story points  
**Goal:** ±20% accuracy  
**Review:** Sprint retrospective

---

## Initial Backlog Population

### Step 1: Create Epics (GitHub Milestones)
```
- Epic 1: Data Model Unification (Phase 1)
- Epic 2: Backend API Development (Phase 2)
- Epic 3: Frontend UI Components (Phase 3)
- Epic 4: AI Agent Integration (Phase 4)
- Epic 5: Workflow Automation (Phase 5)
- Epic 6: Testing & Quality Assurance (Phase 6)
- Epic 7: Documentation & Training (Phase 7)
```

---

### Step 2: Create Phase 1 Issues
Based on `PHASE_1_TASK_BREAKDOWN.md`:

```
Issue #1: Environment Setup & Prerequisites
- Labels: phase-1, component: backend, priority: high
- Story Points: 2
- Assignee Sprint: Sprint 1

Issue #2: Design Prisma Schema Extensions
- Labels: phase-1, component: database, priority: high
- Story Points: 8
- Assignee Sprint: Sprint 1

Issue #3: Schema Review & Refinement
- Labels: phase-1, component: database, priority: high
- Story Points: 3
- Assignee Sprint: Sprint 1

... (continue for all Phase 1 tasks)
```

---

### Step 3: Create User Story Issues
Based on `USER_STORIES.md`:

```
Issue #15: [STORY] Schedule Move-In Inspection (Story 1.1)
- Labels: type: feature, phase-2, priority: high, user: property-manager
- Story Points: 5
- Assignee Sprint: Sprint 3

Issue #16: [STORY] Conduct Digital Move-In Inspection (Story 1.2)
- Labels: type: feature, phase-3, priority: high, user: property-manager
- Story Points: 13
- Assignee Sprint: Sprint 4-5

... (continue for all user stories)
```

---

## Board Maintenance Schedule

### Daily (During Standup)
- [ ] Review "Blocked" items
- [ ] Check WIP limits
- [ ] Update issue statuses

### Weekly (Friday)
- [ ] Triage new issues in Backlog
- [ ] Groom "Sprint Ready" for next sprint
- [ ] Review and close stale issues
- [ ] Update sprint progress report

### Bi-weekly (End of Sprint)
- [ ] Move "Done" items to "Archived"
- [ ] Calculate velocity and metrics
- [ ] Plan next sprint capacity
- [ ] Update roadmap dates

### Monthly
- [ ] Review overall project progress
- [ ] Update stakeholder report
- [ ] Adjust priorities based on feedback
- [ ] Clean up old branches and PRs

---

## Quick Reference Commands

### Create Issue from Command Line
```bash
gh issue create --title "[STORY] Feature name" \
  --body "User story template" \
  --label "type: feature,phase-1,priority: high" \
  --project "KeyCheck Integration"
```

### Move Issue Between Columns
```bash
gh project item-edit --id ITEM_ID \
  --project-id PROJECT_ID \
  --field-id STATUS_FIELD_ID \
  --value "In Progress"
```

### List Sprint Issues
```bash
gh issue list --label "sprint-1" --state open
```

### Generate Sprint Report
```bash
gh issue list --label "sprint-1" --state closed \
  --json number,title,labels,assignees \
  --jq '.[] | "\(.number): \(.title)"'
```

---

## Success Criteria

The project board is successful when:
- [ ] All team members use it daily
- [ ] 95%+ of work tracked in board
- [ ] WIP limits respected
- [ ] Velocity stabilizes after 3 sprints
- [ ] Blockers identified and resolved within 24 hours
- [ ] Sprint planning takes < 2 hours
- [ ] Board reflects reality (no stale issues)

---

**Board Owner:** Tech Lead  
**Last Updated:** November 11, 2025  
**Next Review:** Sprint 1 Retrospective
