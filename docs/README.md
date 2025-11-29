# Property Management Suite - Documentation

**Version:** 1.0  
**Last Updated:** November 2025

---

## Executive Summary

The **Property Management Suite (PMS)** is a comprehensive, AI-powered property management platform designed to streamline operations for property managers and enhance the experience for tenants. The system consists of multiple integrated components:

### Core Components

1. **Backend Service** (`tenant_portal_backend`)
   - NestJS/TypeScript REST API
   - PostgreSQL database with Prisma ORM
   - JWT-based authentication and role-based access control
   - Comprehensive feature set including leases, maintenance, payments, inspections, and more

2. **Frontend Application** (`tenant_portal_app`)
   - React/TypeScript web application
   - "Digital Twin OS" design system (dark, glassmorphic UI)
   - Role-based dashboards for tenants and property managers
   - Real-time notifications and messaging

3. **Mobile Application** (`tenant_portal_mobile`)
   - React Native mobile app
   - Biometric authentication
   - Core tenant features (payments, maintenance, messaging)

4. **ML Service** (`rent_optimization_ml`)
   - Python/FastAPI microservice
   - XGBoost-based rent prediction models
   - Market data integration (Zillow, Rentometer)
   - Batch prediction support

### Key Features

- **AI-Powered Capabilities**
  - Voice AI agents for call handling and leasing
  - Predictive maintenance with ML
  - AI chatbot for tenant support
  - Rent optimization recommendations
  - Payment risk assessment

- **Core Functionality**
  - Property and unit management
  - Lease lifecycle management
  - Maintenance request tracking with SLA monitoring
  - Payment processing with autopay
  - Document management and e-signatures
  - Inspection workflows
  - Rental application processing
  - Financial reporting and QuickBooks integration

- **Integration Ecosystem**
  - QuickBooks for accounting
  - RentCast for market data
  - KeyCheck for inspections (planned)
  - Email and SMS notifications
  - Payment gateways (Stripe)

---

## Documentation Structure

The documentation is organized into logical categories within the `/docs` directory:

```
docs/
├── README.md                          # This file - documentation index
│
├── architecture/                      # System architecture and design
│   ├── comprehensive-analysis-report.md
│   ├── comprehensive-analysis-report-part2.md
│   ├── comprehensive-analysis-report-part3.md
│   ├── ai-voice-agent-architecture.md
│   ├── app-architecture.md
│   ├── adr.md
│   └── schema-validation-report.md
│
├── setup/                            # Environment setup and installation
│   ├── environment-setup-backend.md
│   ├── environment-setup-app.md
│   ├── phase-1-seed-implementation.md
│   ├── phase-2-environment-setup.md
│   ├── complete-execution-guide.md
│   ├── admin-setup.md
│   ├── e2e-setup.md
│   ├── quick-start-leasing-agent.md
│   ├── quick-start-ml-training.md
│   ├── ml-database-extraction-guide.md
│   └── ml-scripts-readme.md
│
├── implementation/                    # Implementation status and phases
│   ├── phase-1-complete.md
│   ├── phase-2-complete.md
│   ├── phase-3-complete.md
│   ├── phase-4-complete.md
│   ├── phase-5-complete.md
│   ├── phase-6-complete.md
│   ├── phase-1-implementation-complete.md
│   ├── phase-2-implementation-complete.md
│   ├── phase-3-implementation-complete.md
│   ├── phase-1-next-steps-complete.md
│   ├── phase-2-next-steps-complete.md
│   ├── phase-3-next-steps-complete.md
│   ├── phase-4-next-steps-complete.md
│   ├── phase-5-next-steps-complete.md
│   ├── phase-6-next-steps-complete.md
│   ├── all-phases-implementation-plan.md
│   ├── all-phases-complete-implementation.md
│   ├── implementation-status.md
│   ├── all-features-implementation-status.md
│   ├── comprehensive-feature-implementation.md
│   ├── acceptance-criteria-verification.md
│   ├── endpoint-implementation-status.md
│   ├── endpoint-audit-and-testing.md
│   ├── real-world-data-migration-plan.md
│   ├── production-readiness-audit.md
│   ├── app-implementation-summary.md
│   ├── app-domain-implementation-status.md
│   ├── production-ready-implementation-summary.md
│   └── ml-schema-extension-complete.md
│
├── api/                              # API documentation
│   ├── api-specs.md
│   ├── api-inventory.md
│   ├── frontend-api-usage.md
│   ├── inspection-service.md
│   ├── leasing-agent-api-reference.md
│   └── postman-seed-api-tests.json
│
├── testing/                          # Testing guides and reports
│   ├── testing.md
│   ├── e2e-test-coverage.md
│   ├── comprehensive-testing-plan.md
│   ├── testing-implementation-status.md
│   ├── backend-testing.md
│   ├── testing-quick-start.md
│   ├── testing-implementation-summary.md
│   ├── testing-complete-summary.md
│   ├── testing-final-report.md
│   ├── testing-status.md
│   ├── workflow-testing-guide.md
│   ├── app-testing-guide.md
│   ├── app-testing-improvements.md
│   ├── leasing-agent-testing-guide.md
│   ├── mobile-app-testing-guide.md
│   └── mobile-app-login-test-guide.md
│
├── ai-ml/                            # AI and ML documentation
│   ├── ai-implementation-executive-summary.md
│   ├── ai-implementation-feasibility-analysis.md
│   ├── ai-implementation-presentation-slides.md
│   ├── ai-implementation-roadmap.md
│   ├── ai-chatbot-implementation.md
│   ├── ai-chatbot-ui-integration.md
│   ├── ai-leasing-agent-implementation.md
│   ├── ai-features-documentation.md
│   ├── ai-features-phase-3-complete.md
│   ├── ai-configuration.md
│   ├── ai-monitoring-guide.md
│   ├── ai-services-integration-plan.md
│   ├── chatbot-ai-setup.md
│   ├── ai-operating-system.md
│   ├── ai-operating-system-quick-start.md
│   ├── ai-feature-integration-executive-summary.md
│   ├── ai-feature-integration-plan-architecture.txt
│   ├── ai-features-review.md
│   ├── rent-optimization-implementation.md
│   ├── ai-rent-optimization-status.md
│   ├── ml-training-guide.md
│   ├── llm-platform-evaluation.md
│   ├── ai-features-development-plan-files.md
│   └── ai-features-development-plan.md
│
├── integrations/                     # Third-party integrations
│   ├── quickbooks-integration-status.md
│   ├── quickbooks-integration-completion-summary.md
│   ├── quickbooks-integration-testing-complete.md
│   ├── quickbooks-sandbox-testing-guide.md
│   ├── quickbooks-testing-guide.md
│   ├── rentcast-integration-success.md
│   ├── keycheck-integration-plan.md
│   └── market-data-integration-status.md
│
├── guides/                           # User guides and how-to docs
│   ├── email-notifications-guide.md
│   ├── rent-notifications-guide.md
│   ├── overall-user-guide.md
│   ├── end-user-guide.md
│   ├── quick-reference.md
│   ├── functionality.md
│   ├── migration-guide.md
│   ├── ui-ux-handoff.md
│   ├── tablet-layout-guidelines.md
│   ├── msw-setup.md
│   ├── backend-connection-test.md
│   ├── backend-integration-next-steps.md
│   ├── backend-integration-summary.md
│   ├── test-data-guide.md
│   │
│   ├── wiki/                         # Feature-specific wiki pages
│   │   ├── home.md
│   │   ├── authentication.md
│   │   ├── changelog.md
│   │   ├── documentation-update-2025-01-05.md
│   │   ├── expense-tracker.md
│   │   ├── lease-management.md
│   │   ├── maintenance.md
│   │   ├── messaging.md
│   │   ├── payments.md
│   │   ├── rent-estimator.md
│   │   ├── rental-application.md
│   │   ├── routing-migration-guide.md
│   │   ├── routing-system.md
│   │   └── tenant-screening.md
│   │
│   ├── components/                   # Component documentation
│   │   ├── app-readme.md
│   │   ├── app-main-readme.md
│   │   ├── app-changelog.md
│   │   ├── app-pr-description.md
│   │   ├── app-performance-optimization.md
│   │   ├── app-report-state.md
│   │   ├── app-report-ui-refresh.md
│   │   ├── app-follow-ups.md
│   │   ├── app-follow-ups-update.md
│   │   ├── app-follow-ups-status.md
│   │   ├── app-follow-ups-progress.md
│   │   ├── app-follow-ups-implementation-summary.md
│   │   ├── app-follow-ups-complete.md
│   │   ├── App/
│   │   ├── AuthContext/
│   │   ├── ExpenseTrackerPage/
│   │   ├── LeaseManagementPage/
│   │   ├── LoginPage/
│   │   ├── MaintenanceDashboard/
│   │   ├── MessagingPage/
│   │   ├── MyLeasePage/
│   │   ├── PaymentsPage/
│   │   ├── RentalApplicationPage/
│   │   ├── RentalApplicationsManagementPage/
│   │   ├── RentEstimatorPage/
│   │   └── SignupPage/
│   │
│   └── ui-wireframes/                # UI wireframe diagrams
│       ├── ApplicationsHub.svg
│       ├── AppShell.svg
│       ├── AuditLog.svg
│       ├── CreateAccount.svg
│       ├── ExpensesOverview.svg
│       ├── LeasesOverview.svg
│       ├── LoginScreen.svg
│       ├── MaintenanceDashboard.svg
│       ├── MessagingInbox.svg
│       ├── PaymentsConsole.svg
│       ├── RentEstimator.svg
│       └── TenantShell.svg
│
├── troubleshooting/                  # Debugging and fixes
│   ├── quick-fixes.md
│   ├── ml-service-down-guide.md
│   ├── debugging-blank-pages.md
│   ├── resolving-blocked-push.md
│   ├── app-page-rendering-fixes.md
│   ├── routing-fixes-summary.md
│   ├── routing-test-report.md
│   ├── ml-cors-origins-fix.md
│   ├── ml-pydantic-v2-fix.md
│   └── ml-database-url-fix.md
│
├── project-management/               # Project planning and status
│   ├── github-setup-complete.md
│   ├── github-issues-complete.md
│   ├── project-board-setup-complete.md
│   ├── github-project-board.md
│   ├── issue-creation-guide.md
│   ├── user-stories.md
│   ├── phase-1-task-breakdown.md
│   ├── lease-lifecycle-upgrade-plan.md
│   ├── maintenance-modernization-rollout.md
│   ├── tablet-implementation-summary.md
│   ├── upgraded-tablet-implementation-plan.md
│   ├── property-management-suite-marketing.md
│   ├── untitled-plan-connect-frontend-to-backend.md
│   └── pdf-generation-instructions.md
│
└── mobile/                           # Mobile app documentation
    ├── mobile-app-mvp-plan.md
    ├── mobile-app-mvp-complete.md
    ├── mobile-app-phase-1-complete.md
    ├── mobile-app-phase-2-progress.md
    ├── mobile-app-phase-2.5-registration-complete.md
    ├── mobile-app-phase-2.6-biometric-complete.md
    ├── mobile-app-phase-2.7-profile-complete.md
    └── mobile-app-phase-2.8-navigation-complete.md
```

---

## Documentation Index

### Architecture & Design

Comprehensive system architecture, design decisions, and technical specifications.

- **[Comprehensive Analysis Report](architecture/comprehensive-analysis-report.md)** - Complete feature set, gap analysis, and production readiness assessment
- **[Comprehensive Analysis Report Part 2](architecture/comprehensive-analysis-report-part2.md)** - Functionality gaps and competitive analysis
- **[Comprehensive Analysis Report Part 3](architecture/comprehensive-analysis-report-part3.md)** - Additional analysis and recommendations
- **[AI Voice Agent Architecture](architecture/ai-voice-agent-architecture.md)** - Architecture for voice AI receptionist and leasing agent
- **[App Architecture](architecture/app-architecture.md)** - Frontend application architecture and design patterns
- **[Architecture Decision Records (ADR)](architecture/adr.md)** - Key architectural decisions and rationale
- **[Schema Validation Report](architecture/schema-validation-report.md)** - Database schema validation and analysis

### Setup & Installation

Environment setup, installation guides, and initial configuration.

- **[Backend Environment Setup](setup/environment-setup-backend.md)** - Backend service setup and configuration
- **[Frontend Environment Setup](setup/environment-setup-app.md)** - Frontend application setup
- **[Phase 1: Seed Implementation](setup/phase-1-seed-implementation.md)** - Database seeding and initial data setup
- **[Phase 2: Environment Setup](setup/phase-2-environment-setup.md)** - Development environment configuration
- **[Complete Execution Guide](setup/complete-execution-guide.md)** - End-to-end setup instructions
- **[Admin Setup](setup/admin-setup.md)** - Administrator account configuration
- **[E2E Setup](setup/e2e-setup.md)** - End-to-end testing environment setup
- **[Quick Start: Leasing Agent](setup/quick-start-leasing-agent.md)** - Quick setup for AI leasing agent
- **[Quick Start: ML Training](setup/quick-start-ml-training.md)** - Quick setup for ML service training
- **[ML Database Extraction Guide](setup/ml-database-extraction-guide.md)** - Guide for extracting data for ML training
- **[ML Scripts README](setup/ml-scripts-readme.md)** - Documentation for ML service scripts

### Implementation Status

Phase completion reports, implementation status, and feature tracking.

- **[Phase 1 Complete](implementation/phase-1-complete.md)** - Phase 1 implementation summary
- **[Phase 2 Complete](implementation/phase-2-complete.md)** - Phase 2 implementation summary
- **[Phase 3 Complete](implementation/phase-3-complete.md)** - Phase 3 implementation summary
- **[Phase 4 Complete](implementation/phase-4-complete.md)** - Phase 4 implementation summary
- **[Phase 5 Complete](implementation/phase-5-complete.md)** - Phase 5 implementation summary
- **[Phase 6 Complete](implementation/phase-6-complete.md)** - Phase 6 implementation summary
- **[All Phases Implementation Plan](implementation/all-phases-implementation-plan.md)** - Complete implementation roadmap
- **[Implementation Status](implementation/implementation-status.md)** - Current implementation status overview
- **[Acceptance Criteria Verification](implementation/acceptance-criteria-verification.md)** - User story acceptance criteria verification
- **[Production Readiness Audit](implementation/production-readiness-audit.md)** - Production deployment readiness assessment
- **[Real-World Data Migration Plan](implementation/real-world-data-migration-plan.md)** - Plan for migrating production data

### API Documentation

API specifications, endpoints, and integration guides.

- **[API Specifications](api/api-specs.md)** - Complete API endpoint documentation
- **[API Inventory](api/api-inventory.md)** - Comprehensive list of all API endpoints
- **[Frontend API Usage](api/frontend-api-usage.md)** - Guide for frontend developers using the API
- **[Inspection Service API](api/inspection-service.md)** - Inspection service API documentation
- **[Leasing Agent API Reference](api/leasing-agent-api-reference.md)** - AI leasing agent API endpoints
- **[Postman API Tests](api/postman-seed-api-tests.json)** - Postman collection for API testing

### Testing

Testing guides, test coverage reports, and testing strategies.

- **[Testing Overview](testing/testing.md)** - General testing documentation
- **[E2E Test Coverage](testing/e2e-test-coverage.md)** - End-to-end test coverage report
- **[Comprehensive Testing Plan](testing/comprehensive-testing-plan.md)** - Complete testing strategy
- **[Backend Testing](testing/backend-testing.md)** - Backend service testing guide
- **[Frontend Testing Guide](testing/app-testing-guide.md)** - Frontend application testing
- **[Workflow Testing Guide](testing/workflow-testing-guide.md)** - Workflow engine testing
- **[Leasing Agent Testing Guide](testing/leasing-agent-testing-guide.md)** - AI leasing agent testing
- **[Mobile App Testing Guide](testing/mobile-app-testing-guide.md)** - Mobile application testing

### AI & Machine Learning

AI features, ML models, and intelligent automation documentation.

- **[AI Implementation Executive Summary](ai-ml/ai-implementation-executive-summary.md)** - High-level AI implementation overview
- **[AI Implementation Roadmap](ai-ml/ai-implementation-roadmap.md)** - AI feature development roadmap
- **[AI Chatbot Implementation](ai-ml/ai-chatbot-implementation.md)** - Chatbot feature implementation
- **[AI Leasing Agent Implementation](ai-ml/ai-leasing-agent-implementation.md)** - AI-powered leasing agent
- **[AI Monitoring Guide](ai-ml/ai-monitoring-guide.md)** - Monitoring and metrics for AI services
- **[AI Configuration](ai-ml/ai-configuration.md)** - AI service configuration guide
- **[AI Services Integration Plan](ai-ml/ai-services-integration-plan.md)** - Integration plan for AI services
- **[Chatbot AI Setup](ai-ml/chatbot-ai-setup.md)** - Chatbot setup and configuration
- **[AI Operating System](ai-ml/ai-operating-system.md)** - AI system architecture and operations
- **[ML Training Guide](ai-ml/ml-training-guide.md)** - Machine learning model training guide
- **[Rent Optimization Implementation](ai-ml/rent-optimization-implementation.md)** - Rent optimization ML feature

### Integrations

Third-party service integrations and API connections.

- **[QuickBooks Integration Status](integrations/quickbooks-integration-status.md)** - QuickBooks accounting integration status
- **[QuickBooks Testing Guide](integrations/quickbooks-testing-guide.md)** - QuickBooks integration testing
- **[RentCast Integration Success](integrations/rentcast-integration-success.md)** - RentCast market data integration
- **[KeyCheck Integration Plan](integrations/keycheck-integration-plan.md)** - KeyCheck inspection integration plan
- **[Market Data Integration Status](integrations/market-data-integration-status.md)** - Market data services integration

### User Guides

How-to guides, user documentation, and feature walkthroughs.

- **[Email Notifications Guide](guides/email-notifications-guide.md)** - Email notification configuration and usage
- **[Rent Notifications Guide](guides/rent-notifications-guide.md)** - Rent payment notification setup
- **[Overall User Guide](guides/overall-user-guide.md)** - Complete user guide for the system
- **[End User Guide](guides/end-user-guide.md)** - End-user focused documentation
- **[Quick Reference](guides/quick-reference.md)** - Quick reference guide for common tasks
- **[Migration Guide](guides/migration-guide.md)** - System migration and upgrade guide
- **[UI/UX Handoff](guides/ui-ux-handoff.md)** - Design handoff documentation
- **[Tablet Layout Guidelines](guides/tablet-layout-guidelines.md)** - Tablet-specific UI guidelines
- **[MSW Setup](guides/msw-setup.md)** - Mock Service Worker setup for development
- **[Test Data Guide](guides/test-data-guide.md)** - Guide for creating and using test data

#### Wiki Documentation

Feature-specific wiki pages with detailed information.

- **[Home](guides/wiki/home.md)** - Wiki home page
- **[Authentication](guides/wiki/authentication.md)** - Authentication system documentation
- **[Lease Management](guides/wiki/lease-management.md)** - Lease management features
- **[Maintenance](guides/wiki/maintenance.md)** - Maintenance request system
- **[Payments](guides/wiki/payments.md)** - Payment processing features
- **[Messaging](guides/wiki/messaging.md)** - Messaging system
- **[Rental Application](guides/wiki/rental-application.md)** - Rental application process
- **[Rent Estimator](guides/wiki/rent-estimator.md)** - Rent estimation tool
- **[Expense Tracker](guides/wiki/expense-tracker.md)** - Expense tracking features
- **[Routing System](guides/wiki/routing-system.md)** - Application routing architecture
- **[Tenant Screening](guides/wiki/tenant-screening.md)** - Tenant screening process

### Troubleshooting

Debugging guides, fix documentation, and problem resolution.

- **[Quick Fixes](troubleshooting/quick-fixes.md)** - Common issues and quick solutions
- **[ML Service Down Guide](troubleshooting/ml-service-down-guide.md)** - Troubleshooting ML service issues
- **[Debugging Blank Pages](troubleshooting/debugging-blank-pages.md)** - Frontend rendering issues
- **[Resolving Blocked Push](troubleshooting/resolving-blocked-push.md)** - Git push issues resolution
- **[App Page Rendering Fixes](troubleshooting/app-page-rendering-fixes.md)** - Frontend page rendering fixes
- **[Routing Fixes Summary](troubleshooting/routing-fixes-summary.md)** - Routing system fixes
- **[ML CORS Origins Fix](troubleshooting/ml-cors-origins-fix.md)** - CORS configuration for ML service
- **[ML Pydantic V2 Fix](troubleshooting/ml-pydantic-v2-fix.md)** - Pydantic version compatibility fixes

### Project Management

Project planning, status tracking, and management documentation.

- **[GitHub Setup Complete](project-management/github-setup-complete.md)** - GitHub repository setup
- **[GitHub Issues Complete](project-management/github-issues-complete.md)** - Issue tracking setup
- **[Project Board Setup](project-management/project-board-setup-complete.md)** - Project board configuration
- **[User Stories](project-management/user-stories.md)** - Complete user story collection
- **[Phase 1 Task Breakdown](project-management/phase-1-task-breakdown.md)** - Detailed task breakdown for Phase 1
- **[Lease Lifecycle Upgrade Plan](project-management/lease-lifecycle-upgrade-plan.md)** - Lease management upgrade plan
- **[Maintenance Modernization Rollout](project-management/maintenance-modernization-rollout.md)** - Maintenance system modernization
- **[Tablet Implementation Summary](project-management/tablet-implementation-summary.md)** - Tablet UI implementation

### Mobile Application

Mobile app development, features, and implementation status.

- **[Mobile App MVP Plan](mobile/mobile-app-mvp-plan.md)** - Minimum viable product plan
- **[Mobile App MVP Complete](mobile/mobile-app-mvp-complete.md)** - MVP completion summary
- **[Mobile App Phase 1 Complete](mobile/mobile-app-phase-1-complete.md)** - Phase 1 implementation
- **[Mobile App Phase 2 Progress](mobile/mobile-app-phase-2-progress.md)** - Phase 2 development status
- **[Mobile App Registration Complete](mobile/mobile-app-phase-2.5-registration-complete.md)** - Registration feature
- **[Mobile App Biometric Complete](mobile/mobile-app-phase-2.6-biometric-complete.md)** - Biometric authentication
- **[Mobile App Profile Complete](mobile/mobile-app-phase-2.7-profile-complete.md)** - User profile feature
- **[Mobile App Navigation Complete](mobile/mobile-app-phase-2.8-navigation-complete.md)** - Navigation system

---

## Quick Links

### Getting Started
- New to the project? Start with [Backend Environment Setup](setup/environment-setup-backend.md) and [Frontend Environment Setup](setup/environment-setup-app.md)
- Need to understand the system? Read the [Comprehensive Analysis Report](architecture/comprehensive-analysis-report.md)
- Setting up for development? Check the [Complete Execution Guide](setup/complete-execution-guide.md)

### For Developers
- **API Development**: [API Specifications](api/api-specs.md) | [Frontend API Usage](api/frontend-api-usage.md)
- **Testing**: [Testing Overview](testing/testing.md) | [E2E Test Coverage](testing/e2e-test-coverage.md)
- **Architecture**: [App Architecture](architecture/app-architecture.md) | [ADR](architecture/adr.md)

### For AI/ML Work
- **AI Features**: [AI Implementation Roadmap](ai-ml/ai-implementation-roadmap.md) | [AI Monitoring Guide](ai-ml/ai-monitoring-guide.md)
- **ML Service**: [ML Training Guide](ai-ml/ml-training-guide.md) | [Rent Optimization](ai-ml/rent-optimization-implementation.md)

### For Troubleshooting
- **Common Issues**: [Quick Fixes](troubleshooting/quick-fixes.md)
- **Service Issues**: [ML Service Down Guide](troubleshooting/ml-service-down-guide.md)
- **Frontend Issues**: [Debugging Blank Pages](troubleshooting/debugging-blank-pages.md)

### For Project Management
- **Status Tracking**: [Implementation Status](implementation/implementation-status.md)
- **User Stories**: [User Stories](project-management/user-stories.md)
- **Phase Status**: [Phase Completion Reports](implementation/)

---

## Contributing to Documentation

### Adding New Documentation

1. **Choose the Right Category**
   - Architecture docs → `architecture/`
   - Setup guides → `setup/`
   - Implementation status → `implementation/`
   - API docs → `api/`
   - Testing guides → `testing/`
   - AI/ML features → `ai-ml/`
   - Integration guides → `integrations/`
   - User guides → `guides/`
   - Troubleshooting → `troubleshooting/`
   - Project management → `project-management/`
   - Mobile app → `mobile/`

2. **Naming Conventions**
   - Use lowercase with hyphens: `my-new-document.md`
   - Be descriptive: `phase-2-authentication-implementation.md`
   - Avoid special characters and spaces

3. **Update This README**
   - Add your new document to the appropriate section above
   - Include a brief 1-sentence description
   - Maintain alphabetical order within sections

4. **Document Structure**
   - Include a clear title and date
   - Add a table of contents for long documents
   - Use consistent markdown formatting
   - Include code examples where relevant

### Documentation Standards

- **Clarity**: Write for your audience (developers, users, stakeholders)
- **Completeness**: Include all necessary information
- **Currency**: Keep documentation up-to-date with code changes
- **Examples**: Provide working code examples and use cases
- **Links**: Link to related documentation

---

## Document Maintenance

This documentation is actively maintained. If you find:
- Outdated information
- Broken links
- Missing documentation
- Errors or inconsistencies

Please update the relevant files or create an issue in the project repository.

---

**Last Documentation Reorganization**: November 2025  
**Maintained By**: Development Team

