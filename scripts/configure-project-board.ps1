# Configure GitHub Project Board
# KeyCheck Integration - Property Management Suite

$ErrorActionPreference = "Continue"
$OWNER = "jholt1988"
$PROJECT_NUMBER = 3
$REPO = "jholt1988/pms"

Write-Host "========================================" -ForegroundColor Green
Write-Host "Configuring GitHub Project Board" -ForegroundColor Green
Write-Host "Project: KeyCheck Integration (#$PROJECT_NUMBER)" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# Create Custom Fields
Write-Host "Creating custom fields..." -ForegroundColor Cyan

# Phase field (Single Select)
Write-Host "  Creating Phase field..." -ForegroundColor Gray
gh project field-create $PROJECT_NUMBER `
    --owner $OWNER `
    --name "Phase" `
    --data-type "SINGLE_SELECT" 2>&1 | Out-Null

# Story Points field (Number)
Write-Host "  Creating Story Points field..." -ForegroundColor Gray
gh project field-create $PROJECT_NUMBER `
    --owner $OWNER `
    --name "Story Points" `
    --data-type "NUMBER" 2>&1 | Out-Null

# Component field (Single Select)
Write-Host "  Creating Component field..." -ForegroundColor Gray
gh project field-create $PROJECT_NUMBER `
    --owner $OWNER `
    --name "Component" `
    --data-type "SINGLE_SELECT" 2>&1 | Out-Null

# Sprint field (Single Select)
Write-Host "  Creating Sprint field..." -ForegroundColor Gray
gh project field-create $PROJECT_NUMBER `
    --owner $OWNER `
    --name "Sprint" `
    --data-type "SINGLE_SELECT" 2>&1 | Out-Null

# Estimate Accuracy field (Number)
Write-Host "  Creating Estimate Accuracy field..." -ForegroundColor Gray
gh project field-create $PROJECT_NUMBER `
    --owner $OWNER `
    --name "Estimate Accuracy" `
    --data-type "NUMBER" 2>&1 | Out-Null

# Blocked By field (Text)
Write-Host "  Creating Blocked By field..." -ForegroundColor Gray
gh project field-create $PROJECT_NUMBER `
    --owner $OWNER `
    --name "Blocked By" `
    --data-type "TEXT" 2>&1 | Out-Null

Write-Host "Custom fields created" -ForegroundColor Green
Write-Host ""

# Add all issues to project
Write-Host "Adding all 31 issues to project board..." -ForegroundColor Cyan

for ($i = 3; $i -le 33; $i++) {
    try {
        $issueUrl = "https://github.com/$REPO/issues/$i"
        gh project item-add $PROJECT_NUMBER --owner $OWNER --url $issueUrl 2>&1 | Out-Null
        Write-Host "  Added issue #$i" -ForegroundColor Gray
    } catch {
        Write-Host "  Skipped issue #$i (may already be added)" -ForegroundColor Yellow
    }
}

Write-Host "All issues added to project" -ForegroundColor Green
Write-Host ""

# Link project to repository
Write-Host "Linking project to repository..." -ForegroundColor Cyan
gh project link $PROJECT_NUMBER --owner $OWNER --repo $REPO 2>&1 | Out-Null
Write-Host "Project linked to repository" -ForegroundColor Green
Write-Host ""

Write-Host "========================================" -ForegroundColor Green
Write-Host "Project Board Configuration Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Project URL:" -ForegroundColor Yellow
Write-Host "  https://github.com/users/$OWNER/projects/$PROJECT_NUMBER" -ForegroundColor White
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Open project in browser (URL above)" -ForegroundColor White
Write-Host "2. Configure Phase field options:" -ForegroundColor White
Write-Host "   - Phase 1: Data Model" -ForegroundColor Gray
Write-Host "   - Phase 2: Backend API" -ForegroundColor Gray
Write-Host "   - Phase 3: Frontend UI" -ForegroundColor Gray
Write-Host "   - Phase 4: AI Agent" -ForegroundColor Gray
Write-Host "   - Phase 5: Workflow" -ForegroundColor Gray
Write-Host "   - Phase 6: Testing" -ForegroundColor Gray
Write-Host "   - Phase 7: Documentation" -ForegroundColor Gray
Write-Host "3. Configure Sprint field options:" -ForegroundColor White
Write-Host "   - Sprint 1, Sprint 2, ..., Sprint 8, Backlog" -ForegroundColor Gray
Write-Host "4. Configure Component field options:" -ForegroundColor White
Write-Host "   - Backend, Frontend, Database, AI/ML, Testing, Documentation" -ForegroundColor Gray
Write-Host "5. Add workflow columns (currently has default Status)" -ForegroundColor White
Write-Host "6. Organize issues into columns" -ForegroundColor White
Write-Host ""
Write-Host "See docs/GITHUB_PROJECT_BOARD.md for detailed configuration" -ForegroundColor Cyan
Write-Host ""
