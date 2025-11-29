# Documentation Reorganization Script
# Moves all documentation files to the new /docs directory structure

param(
    [switch]$DryRun = $false,
    [switch]$Backup = $false
)

$ErrorActionPreference = "Stop"
$script:MoveCount = 0
$script:ErrorCount = 0
$script:LogFile = "docs-reorganization-log.txt"

function Write-Log {
    param([string]$Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] $Message"
    Write-Host $logMessage
    Add-Content -Path $script:LogFile -Value $logMessage
}

function Move-FileSafe {
    param(
        [string]$Source,
        [string]$Destination
    )
    
    if (-not (Test-Path $Source)) {
        Write-Log "WARNING: Source file not found: $Source"
        $script:ErrorCount++
        return $false
    }
    
    $destDir = Split-Path -Parent $Destination
    if (-not (Test-Path $destDir)) {
        New-Item -ItemType Directory -Path $destDir -Force | Out-Null
    }
    
    if ($DryRun) {
        Write-Log "DRY RUN: Would move $Source -> $Destination"
        $script:MoveCount++
        return $true
    }
    
    try {
        if ($Backup -and (Test-Path $Destination)) {
            $backupPath = "$Destination.backup"
            Copy-Item -Path $Destination -Destination $backupPath -Force
            Write-Log "Backed up existing file: $backupPath"
        }
        
        Move-Item -Path $Source -Destination $Destination -Force
        Write-Log "Moved: $Source -> $Destination"
        $script:MoveCount++
        return $true
    }
    catch {
        Write-Log "ERROR: Failed to move $Source : $_"
        $script:ErrorCount++
        return $false
    }
}

Write-Log "=========================================="
Write-Log "Documentation Reorganization Script"
Write-Log "Mode: $(if ($DryRun) { 'DRY RUN' } else { 'LIVE' })"
Write-Log "Backup: $(if ($Backup) { 'ENABLED' } else { 'DISABLED' })"
Write-Log "=========================================="

# Root level files
Write-Log "`n=== Processing Root Level Files ==="

# Architecture
Move-FileSafe "COMPREHENSIVE_ANALYSIS_REPORT.md" "docs\architecture\comprehensive-analysis-report.md"
Move-FileSafe "COMPREHENSIVE_ANALYSIS_REPORT_PART2.md" "docs\architecture\comprehensive-analysis-report-part2.md"
Move-FileSafe "COMPREHENSIVE_ANALYSIS_REPORT_PART3.md" "docs\architecture\comprehensive-analysis-report-part3.md"
Move-FileSafe "AI_VOICE_AGENT_ARCHITECTURE.md" "docs\architecture\ai-voice-agent-architecture.md"
Move-FileSafe "tenant_portal_backend\prisma\SCHEMA_VALIDATION_REPORT.md" "docs\architecture\schema-validation-report.md"
Move-FileSafe "tenant_portal_app\docs\ARCHITECTURE.md" "docs\architecture\app-architecture.md"
Move-FileSafe "tenant_portal_app\docs\ADR.md" "docs\architecture\adr.md"

# AI/ML
Move-FileSafe "AI_IMPLEMENTATION_EXECUTIVE_SUMMARY.md" "docs\ai-ml\ai-implementation-executive-summary.md"
Move-FileSafe "AI_IMPLEMENTATION_FEASIBILITY_ANALYSIS.md" "docs\ai-ml\ai-implementation-feasibility-analysis.md"
Move-FileSafe "AI_IMPLEMENTATION_PRESENTATION_SLIDES.md" "docs\ai-ml\ai-implementation-presentation-slides.md"
Move-FileSafe "AI_IMPLEMENTATION_ROADMAP.md" "docs\ai-ml\ai-implementation-roadmap.md"
Move-FileSafe "AI_CHATBOT_IMPLEMENTATION.md" "docs\ai-ml\ai-chatbot-implementation.md"
Move-FileSafe "AI_CHATBOT_UI_INTEGRATION.md" "docs\ai-ml\ai-chatbot-ui-integration.md"
Move-FileSafe "AI_LEASING_AGENT_IMPLEMENTATION.md" "docs\ai-ml\ai-leasing-agent-implementation.md"
Move-FileSafe "AI_FEATURES_DOCUMENTATION.md" "docs\ai-ml\ai-features-documentation.md"
Move-FileSafe "AI_FEATURES_PHASE_3_COMPLETE.md" "docs\ai-ml\ai-features-phase-3-complete.md"
Move-FileSafe "tenant_portal_backend\AI_CONFIGURATION.md" "docs\ai-ml\ai-configuration.md"
Move-FileSafe "tenant_portal_backend\AI_MONITORING_GUIDE.md" "docs\ai-ml\ai-monitoring-guide.md"
Move-FileSafe "tenant_portal_backend\AI-SERVICES-INTEGRATION-PLAN.md" "docs\ai-ml\ai-services-integration-plan.md"
Move-FileSafe "tenant_portal_backend\CHATBOT_AI_SETUP.md" "docs\ai-ml\chatbot-ai-setup.md"
Move-FileSafe "tenant_portal_app\docs\AI_OPERATING_SYSTEM.md" "docs\ai-ml\ai-operating-system.md"
Move-FileSafe "tenant_portal_app\docs\AI_OPERATING_SYSTEM_QUICK_START.md" "docs\ai-ml\ai-operating-system-quick-start.md"
Move-FileSafe "tenant_portal_app\docs\AI_FEATURE_INTEGRATION_EXECUTIVE_SUMMARY.md" "docs\ai-ml\ai-feature-integration-executive-summary.md"
Move-FileSafe "tenant_portal_app\docs\AI_FEATURE_INTEGRATION_PLAN_ARCHITECTURE.txt" "docs\ai-ml\ai-feature-integration-plan-architecture.txt"
Move-FileSafe "tenant_portal_app\AI-FEATURES-REVIEW.md" "docs\ai-ml\ai-features-review.md"
Move-FileSafe "tenant_portal_app\RENT_OPTIMIZATION_IMPLEMENTATION.md" "docs\ai-ml\rent-optimization-implementation.md"
Move-FileSafe "tenant_portal_app\AI_RENT_OPTIMIZATION_STATUS.md" "docs\ai-ml\ai-rent-optimization-status.md"
Move-FileSafe "rent_optimization_ml\TRAINING_GUIDE.md" "docs\ai-ml\ml-training-guide.md"
Move-FileSafe "rent_optimization_ml\CORS_ORIGINS_FIX.md" "docs\troubleshooting\ml-cors-origins-fix.md"
Move-FileSafe "rent_optimization_ml\PYDANTIC_V2_FIX.md" "docs\troubleshooting\ml-pydantic-v2-fix.md"
Move-FileSafe "rent_optimization_ml\scripts\DATABASE_URL_FIX.md" "docs\troubleshooting\ml-database-url-fix.md"
Move-FileSafe "rent_optimization_ml\scripts\DATABASE_EXTRACTION_GUIDE.md" "docs\setup\ml-database-extraction-guide.md"
Move-FileSafe "rent_optimization_ml\scripts\README.md" "docs\setup\ml-scripts-readme.md"

# Setup
Move-FileSafe "tenant_portal_backend\ENVIRONMENT_SETUP.md" "docs\setup\environment-setup-backend.md"
Move-FileSafe "tenant_portal_app\ENVIRONMENT_SETUP.md" "docs\setup\environment-setup-app.md"
Move-FileSafe "tenant_portal_backend\PHASE_1_SEED_IMPLEMENTATION.md" "docs\setup\phase-1-seed-implementation.md"
Move-FileSafe "tenant_portal_backend\PHASE_2_ENVIRONMENT_SETUP.md" "docs\setup\phase-2-environment-setup.md"
Move-FileSafe "PHASE_1_DATABASE_COMPLETION_SUMMARY.md" "docs\setup\phase-1-database-completion-summary.md"
Move-FileSafe "PHASE_3_ML_SERVICE_SETUP.md" "docs\setup\phase-3-ml-service-setup.md"
Move-FileSafe "PHASE_3.2_COMPLETION_SUMMARY.md" "docs\setup\phase-3.2-completion-summary.md"
Move-FileSafe "tenant_portal_backend\COMPLETE_EXECUTION_GUIDE.md" "docs\setup\complete-execution-guide.md"
Move-FileSafe "tenant_portal_backend\ADMIN_SETUP.md" "docs\setup\admin-setup.md"
Move-FileSafe "tenant_portal_backend\E2E_SETUP.md" "docs\setup\e2e-setup.md"
Move-FileSafe "QUICK_START_LEASING_AGENT.md" "docs\setup\quick-start-leasing-agent.md"
Move-FileSafe "QUICK_START_ML_TRAINING.md" "docs\setup\quick-start-ml-training.md"

# Implementation
Move-FileSafe "tenant_portal_backend\PHASE1-COMPLETE.md" "docs\implementation\phase-1-complete.md"
Move-FileSafe "tenant_portal_backend\PHASE2-COMPLETE.md" "docs\implementation\phase-2-complete.md"
Move-FileSafe "tenant_portal_backend\PHASE3-COMPLETE.md" "docs\implementation\phase-3-complete.md"
Move-FileSafe "tenant_portal_backend\PHASE_3_COMPLETE.md" "docs\implementation\phase-3-complete-detailed.md"
Move-FileSafe "tenant_portal_backend\PHASE4-COMPLETE.md" "docs\implementation\phase-4-complete.md"
Move-FileSafe "tenant_portal_backend\PHASE5-COMPLETE.md" "docs\implementation\phase-5-complete.md"
Move-FileSafe "tenant_portal_backend\PHASE6-COMPLETE.md" "docs\implementation\phase-6-complete.md"
Move-FileSafe "tenant_portal_backend\PHASE1-IMPLEMENTATION-COMPLETE.md" "docs\implementation\phase-1-implementation-complete.md"
Move-FileSafe "tenant_portal_backend\PHASE2-IMPLEMENTATION-COMPLETE.md" "docs\implementation\phase-2-implementation-complete.md"
Move-FileSafe "tenant_portal_backend\PHASE3-IMPLEMENTATION-COMPLETE.md" "docs\implementation\phase-3-implementation-complete.md"
Move-FileSafe "tenant_portal_backend\PHASE1-IMPLEMENTATION-SUMMARY.md" "docs\implementation\phase-1-implementation-summary.md"
Move-FileSafe "tenant_portal_backend\PHASE1-NEXT-STEPS-COMPLETE.md" "docs\implementation\phase-1-next-steps-complete.md"
Move-FileSafe "tenant_portal_backend\PHASE2-NEXT-STEPS-COMPLETE.md" "docs\implementation\phase-2-next-steps-complete.md"
Move-FileSafe "tenant_portal_backend\PHASE3-NEXT-STEPS-COMPLETE.md" "docs\implementation\phase-3-next-steps-complete.md"
Move-FileSafe "tenant_portal_backend\PHASE4-NEXT-STEPS-COMPLETE.md" "docs\implementation\phase-4-next-steps-complete.md"
Move-FileSafe "tenant_portal_backend\PHASE5-NEXT-STEPS-COMPLETE.md" "docs\implementation\phase-5-next-steps-complete.md"
Move-FileSafe "tenant_portal_backend\PHASE6-NEXT-STEPS-COMPLETE.md" "docs\implementation\phase-6-next-steps-complete.md"
Move-FileSafe "tenant_portal_backend\ALL-PHASES-IMPLEMENTATION-PLAN.md" "docs\implementation\all-phases-implementation-plan.md"
Move-FileSafe "tenant_portal_backend\ALL-PHASES-COMPLETE-IMPLEMENTATION.md" "docs\implementation\all-phases-complete-implementation.md"
Move-FileSafe "tenant_portal_backend\IMPLEMENTATION-STATUS.md" "docs\implementation\implementation-status.md"
Move-FileSafe "tenant_portal_backend\ALL_FEATURES_IMPLEMENTATION_STATUS.md" "docs\implementation\all-features-implementation-status.md"
Move-FileSafe "tenant_portal_backend\COMPREHENSIVE_FEATURE_IMPLEMENTATION.md" "docs\implementation\comprehensive-feature-implementation.md"
Move-FileSafe "tenant_portal_backend\ACCEPTANCE-CRITERIA-VERIFICATION.md" "docs\implementation\acceptance-criteria-verification.md"
Move-FileSafe "tenant_portal_backend\ENDPOINT-IMPLEMENTATION-STATUS.md" "docs\implementation\endpoint-implementation-status.md"
Move-FileSafe "tenant_portal_backend\ENDPOINT-AUDIT-AND-TESTING.md" "docs\implementation\endpoint-audit-and-testing.md"
Move-FileSafe "tenant_portal_backend\REAL-WORLD-DATA-MIGRATION-PLAN.md" "docs\implementation\real-world-data-migration-plan.md"
Move-FileSafe "tenant_portal_backend\PRODUCTION-READINESS-AUDIT.md" "docs\implementation\production-readiness-audit.md"
Move-FileSafe "tenant_portal_app\IMPLEMENTATION-SUMMARY.md" "docs\implementation\app-implementation-summary.md"
Move-FileSafe "tenant_portal_app\DOMAIN_IMPLEMENTATION_STATUS.md" "docs\implementation\app-domain-implementation-status.md"
Move-FileSafe "PRODUCTION_READY_IMPLEMENTATION_SUMMARY.md" "docs\implementation\production-ready-implementation-summary.md"
Move-FileSafe "ML_SCHEMA_EXTENSION_COMPLETE.md" "docs\implementation\ml-schema-extension-complete.md"

# API
Move-FileSafe "tenant_portal_backend\docs\API_SPECS.md" "docs\api\api-specs.md"
Move-FileSafe "tenant_portal_backend\docs\api-inventory.md" "docs\api\api-inventory.md"
Move-FileSafe "tenant_portal_backend\docs\FRONTEND_API_USAGE.md" "docs\api\frontend-api-usage.md"
Move-FileSafe "tenant_portal_backend\docs\InspectionService.md" "docs\api\inspection-service.md"
Move-FileSafe "LEASING_AGENT_API_REFERENCE.md" "docs\api\leasing-agent-api-reference.md"
Move-FileSafe "tenant_portal_app\docs\postman-seed-api-tests.json" "docs\api\postman-seed-api-tests.json"

# Testing
Move-FileSafe "TESTING.md" "docs\testing\testing.md"
Move-FileSafe "E2E_TEST_COVERAGE.md" "docs\testing\e2e-test-coverage.md"
Move-FileSafe "COMPREHENSIVE_TESTING_PLAN.md" "docs\testing\comprehensive-testing-plan.md"
Move-FileSafe "TESTING_IMPLEMENTATION_STATUS.md" "docs\testing\testing-implementation-status.md"
Move-FileSafe "tenant_portal_backend\TESTING.md" "docs\testing\backend-testing.md"
Move-FileSafe "tenant_portal_backend\TESTING-QUICK-START.md" "docs\testing\testing-quick-start.md"
Move-FileSafe "tenant_portal_backend\TESTING-IMPLEMENTATION-SUMMARY.md" "docs\testing\testing-implementation-summary.md"
Move-FileSafe "tenant_portal_backend\TESTING_COMPLETE_SUMMARY.md" "docs\testing\testing-complete-summary.md"
Move-FileSafe "tenant_portal_backend\TESTING_FINAL_REPORT.md" "docs\testing\testing-final-report.md"
Move-FileSafe "tenant_portal_backend\TESTING_STATUS.md" "docs\testing\testing-status.md"
Move-FileSafe "tenant_portal_backend\WORKFLOW-TESTING-GUIDE.md" "docs\testing\workflow-testing-guide.md"
Move-FileSafe "tenant_portal_app\TESTING-GUIDE.md" "docs\testing\app-testing-guide.md"
Move-FileSafe "tenant_portal_app\TESTING-IMPROVEMENTS.md" "docs\testing\app-testing-improvements.md"
Move-FileSafe "LEASING_AGENT_TESTING_GUIDE.md" "docs\testing\leasing-agent-testing-guide.md"
Move-FileSafe "MOBILE_APP_TESTING_GUIDE.md" "docs\testing\mobile-app-testing-guide.md"
Move-FileSafe "MOBILE_APP_LOGIN_TEST_GUIDE.md" "docs\testing\mobile-app-login-test-guide.md"

# Integrations
Move-FileSafe "QUICKBOOKS_INTEGRATION_STATUS.md" "docs\integrations\quickbooks-integration-status.md"
Move-FileSafe "QUICKBOOKS_INTEGRATION_COMPLETION_SUMMARY.md" "docs\integrations\quickbooks-integration-completion-summary.md"
Move-FileSafe "QUICKBOOKS_INTEGRATION_TESTING_COMPLETE.md" "docs\integrations\quickbooks-integration-testing-complete.md"
Move-FileSafe "QUICKBOOKS_SANDBOX_TESTING_GUIDE.md" "docs\integrations\quickbooks-sandbox-testing-guide.md"
Move-FileSafe "QUICKBOOKS_TESTING_GUIDE.md" "docs\integrations\quickbooks-testing-guide.md"
Move-FileSafe "RENTCAST_INTEGRATION_SUCCESS.md" "docs\integrations\rentcast-integration-success.md"
Move-FileSafe "KEYCHECK_INTEGRATION_PLAN.md" "docs\integrations\keycheck-integration-plan.md"
Move-FileSafe "MARKET_DATA_INTEGRATION_STATUS.md" "docs\integrations\market-data-integration-status.md"

# Guides
Move-FileSafe "EMAIL_NOTIFICATIONS_GUIDE.md" "docs\guides\email-notifications-guide.md"
Move-FileSafe "RENT_NOTIFICATIONS_GUIDE.md" "docs\guides\rent-notifications-guide.md"
Move-FileSafe "tenant_portal_backend\docs\Overall_User_Guide.md" "docs\guides\overall-user-guide.md"
Move-FileSafe "tenant_portal_app\docs\End_User_Guide.md" "docs\guides\end-user-guide.md"
Move-FileSafe "tenant_portal_app\docs\QUICK_REFERENCE.md" "docs\guides\quick-reference.md"
Move-FileSafe "tenant_portal_app\docs\FUNCTIONALITY.md" "docs\guides\functionality.md"
Move-FileSafe "tenant_portal_app\docs\MIGRATION_GUIDE.md" "docs\guides\migration-guide.md"
Move-FileSafe "tenant_portal_app\docs\UI_UX_handoff.md" "docs\guides\ui-ux-handoff.md"
Move-FileSafe "tenant_portal_app\docs\tablet-layout-guidelines.md" "docs\guides\tablet-layout-guidelines.md"
Move-FileSafe "tenant_portal_app\MSW_SETUP.md" "docs\guides\msw-setup.md"
Move-FileSafe "BACKEND_CONNECTION_TEST.md" "docs\guides\backend-connection-test.md"
Move-FileSafe "BACKEND_INTEGRATION_NEXT_STEPS.md" "docs\guides\backend-integration-next-steps.md"
Move-FileSafe "BACKEND_INTEGRATION_SUMMARY.md" "docs\guides\backend-integration-summary.md"
Move-FileSafe "TEST_DATA_GUIDE.md" "docs\guides\test-data-guide.md"

# Wiki files
Move-FileSafe "tenant_portal_app\docs\wiki\Home.md" "docs\guides\wiki\home.md"
Move-FileSafe "tenant_portal_app\docs\wiki\Authentication.md" "docs\guides\wiki\authentication.md"
Move-FileSafe "tenant_portal_app\docs\wiki\Changelog.md" "docs\guides\wiki\changelog.md"
Move-FileSafe "tenant_portal_app\docs\wiki\DOCUMENTATION_UPDATE_2025_01_05.md" "docs\guides\wiki\documentation-update-2025-01-05.md"
Move-FileSafe "tenant_portal_app\docs\wiki\Expense-Tracker.md" "docs\guides\wiki\expense-tracker.md"
Move-FileSafe "tenant_portal_app\docs\wiki\Lease-Management.md" "docs\guides\wiki\lease-management.md"
Move-FileSafe "tenant_portal_app\docs\wiki\Maintenance.md" "docs\guides\wiki\maintenance.md"
Move-FileSafe "tenant_portal_app\docs\wiki\Messaging.md" "docs\guides\wiki\messaging.md"
Move-FileSafe "tenant_portal_app\docs\wiki\Payments.md" "docs\guides\wiki\payments.md"
Move-FileSafe "tenant_portal_app\docs\wiki\Rent-Estimator.md" "docs\guides\wiki\rent-estimator.md"
Move-FileSafe "tenant_portal_app\docs\wiki\Rental-Application.md" "docs\guides\wiki\rental-application.md"
Move-FileSafe "tenant_portal_app\docs\wiki\Routing-Migration-Guide.md" "docs\guides\wiki\routing-migration-guide.md"
Move-FileSafe "tenant_portal_app\docs\wiki\Routing-System.md" "docs\guides\wiki\routing-system.md"
Move-FileSafe "tenant_portal_app\docs\wiki\Tenant-Screening.md" "docs\guides\wiki\tenant-screening.md"

# Troubleshooting
Move-FileSafe "QUICK_FIXES.md" "docs\troubleshooting\quick-fixes.md"
Move-FileSafe "tenant_portal_backend\ML_SERVICE_DOWN_GUIDE.md" "docs\troubleshooting\ml-service-down-guide.md"
Move-FileSafe "DEBUGGING_BLANK_PAGES.md" "docs\troubleshooting\debugging-blank-pages.md"
Move-FileSafe "RESOLVING_BLOCKED_PUSH.md" "docs\troubleshooting\resolving-blocked-push.md"
Move-FileSafe "tenant_portal_app\PAGE-RENDERING-FIXES.md" "docs\troubleshooting\app-page-rendering-fixes.md"
Move-FileSafe "ROUTING_FIXES_SUMMARY.md" "docs\troubleshooting\routing-fixes-summary.md"
Move-FileSafe "ROUTING_TEST_REPORT.md" "docs\troubleshooting\routing-test-report.md"

# Project Management
Move-FileSafe "GITHUB_SETUP_COMPLETE.md" "docs\project-management\github-setup-complete.md"
Move-FileSafe "GITHUB_ISSUES_COMPLETE.md" "docs\project-management\github-issues-complete.md"
Move-FileSafe "PROJECT_BOARD_SETUP_COMPLETE.md" "docs\project-management\project-board-setup-complete.md"
Move-FileSafe "docs\GITHUB_PROJECT_BOARD.md" "docs\project-management\github-project-board.md"
Move-FileSafe "docs\ISSUE_CREATION_GUIDE.md" "docs\project-management\issue-creation-guide.md"
Move-FileSafe "docs\USER_STORIES.md" "docs\project-management\user-stories.md"
Move-FileSafe "docs\PHASE_1_TASK_BREAKDOWN.md" "docs\project-management\phase-1-task-breakdown.md"
Move-FileSafe "docs\lease-lifecycle-upgrade-plan.md" "docs\project-management\lease-lifecycle-upgrade-plan.md"
Move-FileSafe "docs\maintenance-modernization-rollout.md" "docs\project-management\maintenance-modernization-rollout.md"
Move-FileSafe "docs\tablet-implementation-summary.md" "docs\project-management\tablet-implementation-summary.md"
Move-FileSafe "docs\upgraded-tablet-implementation-plan.md" "docs\project-management\upgraded-tablet-implementation-plan.md"

# Mobile
Move-FileSafe "MOBILE_APP_MVP_PLAN.md" "docs\mobile\mobile-app-mvp-plan.md"
Move-FileSafe "MOBILE_APP_MVP_COMPLETE.md" "docs\mobile\mobile-app-mvp-complete.md"
Move-FileSafe "MOBILE_APP_PHASE_1_COMPLETE.md" "docs\mobile\mobile-app-phase-1-complete.md"
Move-FileSafe "MOBILE_APP_PHASE_2_PROGRESS.md" "docs\mobile\mobile-app-phase-2-progress.md"
Move-FileSafe "MOBILE_APP_PHASE_2.5_REGISTRATION_COMPLETE.md" "docs\mobile\mobile-app-phase-2.5-registration-complete.md"
Move-FileSafe "MOBILE_APP_PHASE_2.6_BIOMETRIC_COMPLETE.md" "docs\mobile\mobile-app-phase-2.6-biometric-complete.md"
Move-FileSafe "MOBILE_APP_PHASE_2.7_PROFILE_COMPLETE.md" "docs\mobile\mobile-app-phase-2.7-profile-complete.md"
Move-FileSafe "MOBILE_APP_PHASE_2.8_NAVIGATION_COMPLETE.md" "docs\mobile\mobile-app-phase-2.8-navigation-complete.md"

# App-specific files (component docs - keeping structure but moving to guides/components)
New-Item -ItemType Directory -Force -Path "docs\guides\components" | Out-Null
Move-FileSafe "tenant_portal_app\docs\README.md" "docs\guides\components\app-readme.md"
Move-FileSafe "tenant_portal_app\README.md" "docs\guides\components\app-main-readme.md"
Move-FileSafe "tenant_portal_app\CHANGELOG.md" "docs\guides\components\app-changelog.md"
Move-FileSafe "tenant_portal_app\PR-DESCRIPTION.md" "docs\guides\components\app-pr-description.md"
Move-FileSafe "tenant_portal_app\PERFORMANCE-OPTIMIZATION.md" "docs\guides\components\app-performance-optimization.md"
Move-FileSafe "tenant_portal_app\REPORT-STATE-OF-APP.md" "docs\guides\components\app-report-state.md"
Move-FileSafe "tenant_portal_app\REPORT-UI-REFRESH.md" "docs\guides\components\app-report-ui-refresh.md"
Move-FileSafe "tenant_portal_app\FOLLOW-UPS.md" "docs\guides\components\app-follow-ups.md"
Move-FileSafe "tenant_portal_app\FOLLOW-UPS-UPDATE.md" "docs\guides\components\app-follow-ups-update.md"
Move-FileSafe "tenant_portal_app\FOLLOW-UPS-STATUS.md" "docs\guides\components\app-follow-ups-status.md"
Move-FileSafe "tenant_portal_app\FOLLOW-UPS-PROGRESS.md" "docs\guides\components\app-follow-ups-progress.md"
Move-FileSafe "tenant_portal_app\FOLLOW-UPS-IMPLEMENTATION-SUMMARY.md" "docs\guides\components\app-follow-ups-implementation-summary.md"
Move-FileSafe "tenant_portal_app\FOLLOW-UPS-COMPLETE.md" "docs\guides\components\app-follow-ups-complete.md"

# LLM Platform Evaluation
Move-FileSafe "LLM_PLATFORM_EVALUATION.md" "docs\ai-ml\llm-platform-evaluation.md"

# Property Management Marketing
Move-FileSafe "PROPERTY_MANAGEMENT_SUITE_MARKETING.md" "docs\project-management\property-management-suite-marketing.md"

# Untitled plan file
Move-FileSafe "untitled-plan-connectFrontendToBackend.prompt.md" "docs\project-management\untitled-plan-connect-frontend-to-backend.md"

# PDF Generation Instructions (from existing docs)
Move-FileSafe "docs\# PDF Generation Instructions.md" "docs\project-management\pdf-generation-instructions.md"

# AI Features Development Plan files (from existing docs)
Move-FileSafe "docs\# AI Features Development Plan - Files S.md" "docs\ai-ml\ai-features-development-plan-files.md"
Move-FileSafe "docs\# AI Features Development Plan for Prope.md" "docs\ai-ml\ai-features-development-plan.md"

# Component-specific README files (keeping in guides/components with subdirectories)
New-Item -ItemType Directory -Force -Path "docs\guides\components\App", "docs\guides\components\AuthContext", "docs\guides\components\ExpenseTrackerPage", "docs\guides\components\LeaseManagementPage", "docs\guides\components\LoginPage", "docs\guides\components\MaintenanceDashboard", "docs\guides\components\MessagingPage", "docs\guides\components\MyLeasePage", "docs\guides\components\PaymentsPage", "docs\guides\components\RentalApplicationPage", "docs\guides\components\RentalApplicationsManagementPage", "docs\guides\components\RentEstimatorPage", "docs\guides\components\SignupPage" | Out-Null

Move-FileSafe "tenant_portal_app\docs\App\README.md" "docs\guides\components\App\README.md"
Move-FileSafe "tenant_portal_app\docs\App\functions\default.md" "docs\guides\components\App\functions\default.md"
Move-FileSafe "tenant_portal_app\docs\AuthContext\README.md" "docs\guides\components\AuthContext\README.md"
Move-FileSafe "tenant_portal_app\docs\AuthContext\functions\AuthProvider.md" "docs\guides\components\AuthContext\functions\AuthProvider.md"
Move-FileSafe "tenant_portal_app\docs\AuthContext\variables\useAuth.md" "docs\guides\components\AuthContext\variables\useAuth.md"
Move-FileSafe "tenant_portal_app\docs\ExpenseTrackerPage\README.md" "docs\guides\components\ExpenseTrackerPage\README.md"
Move-FileSafe "tenant_portal_app\docs\ExpenseTrackerPage\functions\default.md" "docs\guides\components\ExpenseTrackerPage\functions\default.md"
Move-FileSafe "tenant_portal_app\docs\LeaseManagementPage\README.md" "docs\guides\components\LeaseManagementPage\README.md"
Move-FileSafe "tenant_portal_app\docs\LeaseManagementPage\functions\default.md" "docs\guides\components\LeaseManagementPage\functions\default.md"
Move-FileSafe "tenant_portal_app\docs\LoginPage\README.md" "docs\guides\components\LoginPage\README.md"
Move-FileSafe "tenant_portal_app\docs\LoginPage\functions\default.md" "docs\guides\components\LoginPage\functions\default.md"
Move-FileSafe "tenant_portal_app\docs\MaintenanceDashboard\README.md" "docs\guides\components\MaintenanceDashboard\README.md"
Move-FileSafe "tenant_portal_app\docs\MaintenanceDashboard\functions\default.md" "docs\guides\components\MaintenanceDashboard\functions\default.md"
Move-FileSafe "tenant_portal_app\docs\MessagingPage\README.md" "docs\guides\components\MessagingPage\README.md"
Move-FileSafe "tenant_portal_app\docs\MessagingPage\functions\default.md" "docs\guides\components\MessagingPage\functions\default.md"
Move-FileSafe "tenant_portal_app\docs\MyLeasePage\README.md" "docs\guides\components\MyLeasePage\README.md"
Move-FileSafe "tenant_portal_app\docs\MyLeasePage\functions\default.md" "docs\guides\components\MyLeasePage\functions\default.md"
Move-FileSafe "tenant_portal_app\docs\PaymentsPage\README.md" "docs\guides\components\PaymentsPage\README.md"
Move-FileSafe "tenant_portal_app\docs\PaymentsPage\functions\default.md" "docs\guides\components\PaymentsPage\functions\default.md"
Move-FileSafe "tenant_portal_app\docs\RentalApplicationPage\README.md" "docs\guides\components\RentalApplicationPage\README.md"
Move-FileSafe "tenant_portal_app\docs\RentalApplicationPage\functions\default.md" "docs\guides\components\RentalApplicationPage\functions\default.md"
Move-FileSafe "tenant_portal_app\docs\RentalApplicationsManagementPage\README.md" "docs\guides\components\RentalApplicationsManagementPage\README.md"
Move-FileSafe "tenant_portal_app\docs\RentalApplicationsManagementPage\functions\default.md" "docs\guides\components\RentalApplicationsManagementPage\functions\default.md"
Move-FileSafe "tenant_portal_app\docs\RentEstimatorPage\README.md" "docs\guides\components\RentEstimatorPage\README.md"
Move-FileSafe "tenant_portal_app\docs\RentEstimatorPage\functions\default.md" "docs\guides\components\RentEstimatorPage\functions\default.md"
Move-FileSafe "tenant_portal_app\docs\SignupPage\README.md" "docs\guides\components\SignupPage\README.md"
Move-FileSafe "tenant_portal_app\docs\SignupPage\variables\default.md" "docs\guides\components\SignupPage\variables\default.md"

# UI Wireframes
New-Item -ItemType Directory -Force -Path "docs\guides\ui-wireframes" | Out-Null
Get-ChildItem -Path "tenant_portal_app\docs\UI Wireframes" -Filter "*.svg" | ForEach-Object {
    Move-FileSafe $_.FullName "docs\guides\ui-wireframes\$($_.Name)"
}

# Code-level README files (keeping in their original locations - these are code documentation)
# tenant_portal_app\src\mocks\README.md - keep in place
# tenant_portal_app\src\domains\shared\ai-services\README.md - keep in place
# tenant_portal_app\src\domains\shared\ai-services\chatbot\README.md - keep in place
# rent_optimization_ml\README.md - keep in place (it's the service README)

Write-Log "`n=========================================="
Write-Log "Reorganization Complete!"
Write-Log "Files moved: $script:MoveCount"
Write-Log "Errors: $script:ErrorCount"
Write-Log "Log file: $script:LogFile"
Write-Log "=========================================="

if ($DryRun) {
    Write-Host "`nThis was a DRY RUN. No files were actually moved." -ForegroundColor Yellow
    Write-Host "Run without -DryRun to perform the actual migration." -ForegroundColor Yellow
}

