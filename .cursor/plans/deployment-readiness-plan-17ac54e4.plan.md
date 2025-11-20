<!-- 17ac54e4-341b-4e5d-b126-045317fca656 d44dbe4b-903d-40dc-8b1f-df9d7aaee485 -->
# App Shell Views and Unit Inspection Manager

## Overview

Refactor the current single AppLayout into separate, role-specific shell views (TenantShell and StaffShell) and implement a new unit inspection management system that allows property managers to schedule and record inspections, and tenants to view their unit inspection history.

## Phase 1: Create Separate Shell Views

### 1.1 Tenant Shell Component

**File**: `tenant_portal_app/src/TenantShell.tsx`

- Create a dedicated shell component for tenant users
- Include tenant-specific navigation (Maintenance, Payments, Messaging, My Lease, Unit Inspections)
- Use modern styling with Tailwind CSS
- Include NotificationCenter in header
- Responsive design for mobile/tablet

### 1.2 Staff/Management Shell Component

**File**: `tenant_portal_app/src/StaffShell.tsx`

- Create a dedicated shell component for property managers
- Include all management navigation items
- Professional layout optimized for desktop use
- Include NotificationCenter in header
- Sidebar navigation option for better organization

### 1.3 Update App.tsx Routing

**File**: `tenant_portal_app/src/App.tsx`

- Replace single AppLayout with role-based shell selection
- Use TenantShell for TENANT role
- Use StaffShell for PROPERTY_MANAGER role
- Maintain existing route structure

## Phase 2: Unit Inspection Backend

### 2.1 Database Schema

**File**: `tenant_portal_backend/prisma/schema.prisma`

- Add `UnitInspection` model:
- id, unitId, propertyId, scheduledDate, completedDate
- type (MOVE_IN, MOVE_OUT, ROUTINE, DAMAGE, COMPLIANCE)
- status (SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED)
- inspectorId (User), notes, findings (JSON)
- photos relation, createdBy, createdAt, updatedAt
- Add `UnitInspectionPhoto` model for inspection photos
- Add indexes for performance

### 2.2 Inspection Service

**File**: `tenant_portal_backend/src/inspections/inspections.service.ts`

- CRUD operations for inspections
- Schedule inspection (managers only)
- Complete inspection with findings
- List inspections with filters (by unit, property, date range, status)
- Tenant view (only their unit's inspections)
- Manager view (all inspections with filters)
- Photo upload handling

### 2.3 Inspection Controller

**File**: `tenant_portal_backend/src/inspections/inspections.controller.ts`

- POST /inspections (schedule - managers only)
- GET /inspections (list with filters)
- GET /inspections/:id (view details)
- PUT /inspections/:id (update - managers only)
- PUT /inspections/:id/complete (complete inspection)
- POST /inspections/:id/photos (upload photos)
- DELETE /inspections/:id (cancel - managers only)

### 2.4 Inspection Module

**File**: `tenant_portal_backend/src/inspections/inspections.module.ts`

- Register service and controller
- Import necessary modules (Prisma, Documents for photo handling)

## Phase 3: Unit Inspection Frontend

### 3.1 Tenant Inspection View

**File**: `tenant_portal_app/src/TenantInspectionPage.tsx`

- Display list of inspections for tenant's unit
- Show inspection history with status
- View inspection details (scheduled date, completed date, findings)
- View inspection photos
- Simple, clean interface focused on viewing

### 3.2 Manager Inspection View

**File**: `tenant_portal_app/src/InspectionManagementPage.tsx`

- Full inspection management dashboard
- Schedule new inspections (form with unit selection, date, type)
- List all inspections with filters (property, unit, status, date range)
- Inspection calendar view
- Complete inspections (add findings, upload photos)
- Edit/cancel inspections
- Export inspection reports

### 3.3 Add Routes

**File**: `tenant_portal_app/src/App.tsx`

- Add `/inspections` route for tenants
- Add `/inspection-management` route for managers
- Update navigation in both shell components

## Technical Decisions

1. **Inspection Types**: Move-in, Move-out, Routine, Damage, Compliance
2. **Photo Storage**: Reuse document storage service or create dedicated inspection photo storage
3. **Findings Structure**: JSON field to store structured findings (condition, issues, recommendations)
4. **Notifications**: Send notifications when inspections are scheduled or completed
5. **Styling**: Use Tailwind CSS for consistent modern UI across both shells

## Database Migration Required

- Add `UnitInspection` model
- Add `UnitInspectionPhoto` model
- Add relationships to Unit, Property, and User models
- Run `npx prisma migrate dev --name unit_inspections`