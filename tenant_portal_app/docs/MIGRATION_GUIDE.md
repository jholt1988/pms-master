# Component Migration Guide

## Purpose
This guide helps migrate existing components from the old flat structure to the new domain-driven architecture.

## Migration Workflow

### Step 1: Identify Component Domain
Determine which domain owns the component:

| Component Name | Domain | Reason |
|---------------|--------|--------|
| TenantMaintenancePage | tenant | Tenant submits requests |
| MaintenanceDashboard | property-manager | Manager reviews requests |
| UserManagementPage | admin | System administration |
| MyLeasePage | tenant | Tenant views their lease |
| LeaseManagementPage | property-manager | Manager manages all leases |

### Step 2: Identify Component Type
Where within the domain?

| Type | Location | Examples |
|------|----------|----------|
| Layout | `layouts/` | Shell, Sidebar, Navigation |
| Feature Page | `features/{feature}/` | MaintenancePage, LeasePage |
| Feature Component | `features/{feature}/` | MaintenanceCard, LeaseForm |
| Domain UI | `ui/` | Reusable within domain |
| Generic UI | `src/components/ui/` | Truly generic |

### Step 3: Create New Location
```bash
# Example: Moving TenantMaintenancePage
src/TenantMaintenancePage.tsx
→ src/domains/tenant/features/maintenance/MaintenancePage.tsx
```

### Step 4: Update Imports in Component

#### Before
```typescript
import { PageHeader } from './components/ui/PageHeader';
import { SearchInput } from './components/ui/SearchInput';
import { StatusBadge } from './components/ui/StatusBadge';
```

#### After
```typescript
import { PageHeader } from '../../../../components/ui/PageHeader';
import { SearchInput } from '../../../../components/ui/SearchInput';
import { StatusBadge } from '../../../../components/ui/StatusBadge';
```

### Step 5: Create Feature Index
```typescript
// domains/tenant/features/maintenance/index.ts
export { MaintenancePage } from './MaintenancePage';
```

### Step 6: Update App.tsx Import

#### Before
```typescript
import { TenantMaintenancePage } from './TenantMaintenancePage';
```

#### After
```typescript
import { MaintenancePage as TenantMaintenancePage } from './domains/tenant/features/maintenance';
```

### Step 7: Verify & Test
- Check for TypeScript errors
- Run the application
- Test the feature
- Delete old file once confirmed working

### Step 8: Update Design Token Usage (Optional)
Replace hardcoded values with design tokens:

#### Before
```typescript
<div style={{ padding: '16px', color: '#2563EB' }}>
```

#### After
```typescript
import { spacing, baseColors } from '../../../../design-tokens';

<div style={{ padding: spacing.md, color: baseColors.primary[600] }}>
```

## Component Migration Checklist

### Tenant Domain Components

#### ✅ Completed
- [x] TenantMaintenancePage → domains/tenant/features/maintenance/MaintenancePage.tsx

#### 🚧 In Progress
- [ ] TenantShell → domains/tenant/layouts/TenantShell.tsx
- [ ] Sidebar (tenant version) → domains/tenant/layouts/Sidebar.tsx

#### 📋 Pending
**Features**:
- [ ] MyLeasePage → domains/tenant/features/lease/MyLeasePage.tsx
- [ ] PaymentsPage → domains/tenant/features/payments/PaymentsPage.tsx
- [ ] RentalApplicationPage → domains/tenant/features/application/ApplicationPage.tsx
- [ ] TenantInspectionPage → domains/tenant/features/inspection/InspectionPage.tsx

**Layouts**:
- [ ] NavTop (tenant) → domains/tenant/layouts/NavTop.tsx

### Property Manager Domain Components

#### 📋 Pending
**Features - Leases**:
- [ ] LeaseManagementPage → domains/property-manager/features/leases/LeaseManagementPage.tsx
- [ ] LeaseManagementPageModern → domains/property-manager/features/leases/LeaseManagementPageModern.tsx

**Features - Applications**:
- [ ] RentalApplicationsManagementPage → domains/property-manager/features/applications/ApplicationsManagementPage.tsx
- [ ] ApplicationView → domains/property-manager/features/applications/ApplicationView.tsx

**Features - Maintenance**:
- [ ] MaintenanceDashboard → domains/property-manager/features/maintenance/MaintenanceDashboard.tsx
- [ ] MaintenanceDashboardModern → domains/property-manager/features/maintenance/MaintenanceDashboardModern.tsx

**Features - Expenses**:
- [ ] ExpenseTrackerPage → domains/property-manager/features/expenses/ExpenseTrackerPage.tsx
- [ ] ExpenseTrackerPageModern → domains/property-manager/features/expenses/ExpenseTrackerPageModern.tsx

**Features - Payments**:
- [ ] PaymentsPage (manager version) → domains/property-manager/features/payments/PaymentsPage.tsx
- [ ] PaymentsPageModern → domains/property-manager/features/payments/PaymentsPageModern.tsx

**Features - Messaging**:
- [ ] MessagingPage → domains/property-manager/features/messaging/MessagingPage.tsx

**Features - Inspections**:
- [ ] InspectionManagementPage → domains/property-manager/features/inspections/InspectionManagementPage.tsx

**Features - Documents**:
- [ ] DocumentManagementPage → domains/property-manager/features/documents/DocumentManagementPage.tsx

**Features - Reporting**:
- [ ] ReportingPage → domains/property-manager/features/reporting/ReportingPage.tsx

**Layouts**:
- [ ] StaffShell → domains/property-manager/layouts/ManagerShell.tsx
- [ ] AppShell → domains/property-manager/layouts/AppShell.tsx
- [ ] Topbar (manager) → domains/property-manager/layouts/Topbar.tsx

### Admin Domain Components

#### 📋 Pending
**Features - Users**:
- [ ] UserManagementPage → domains/admin/features/users/UserManagementPage.tsx

**Features - Audit**:
- [ ] AuditLogPage → domains/admin/features/audit/AuditLogPage.tsx

**Layouts**:
- [ ] AdminShell (create new) → domains/admin/layouts/AdminShell.tsx

### Shared Components (Keep in src/components/ui/)

These are truly generic and used identically across domains:

- [x] PageHeader
- [x] SearchInput
- [x] StatusBadge
- [ ] Content (generic wrapper)

## Migration Priority

### High Priority (Do First)
1. **TenantShell** - Affects all tenant pages
2. **StaffShell/AppShell** - Affects all manager pages
3. **Sidebar variations** - Core navigation

### Medium Priority (Do Second)
4. **Feature pages** - Main user-facing pages
5. **Feature components** - Supporting components

### Low Priority (Do Last)
6. **Utility components** - Can remain in current location
7. **Documentation updates** - Ongoing

## Common Migration Patterns

### Pattern 1: Simple Page Component
```typescript
// Old: src/MyLeasePage.tsx
export const MyLeasePage = () => { /* ... */ };

// New: domains/tenant/features/lease/MyLeasePage.tsx
export const MyLeasePage = () => { /* ... */ };

// New: domains/tenant/features/lease/index.ts
export { MyLeasePage } from './MyLeasePage';
```

### Pattern 2: Page with Sub-Components
```typescript
// Old: src/LeaseManagementPage.tsx (one big file)

// New: domains/property-manager/features/leases/
// ├── LeaseManagementPage.tsx (main page)
// ├── LeaseCard.tsx (extracted component)
// ├── LeaseForm.tsx (extracted component)
// └── index.ts (exports)
```

### Pattern 3: Shared Between Features (Same Domain)
```typescript
// If used by multiple features in SAME domain:
// domains/tenant/ui/TenantCard.tsx

// Import in features:
import { TenantCard } from '../../ui/TenantCard';
```

### Pattern 4: Version Migration (Modern vs Legacy)
```typescript
// Keep both during transition:
domains/property-manager/features/leases/
├── LeaseManagementPage.tsx (legacy)
├── LeaseManagementPageModern.tsx (new version)
└── index.ts

// Export both:
export { LeaseManagementPage } from './LeaseManagementPage';
export { LeaseManagementPageModern } from './LeaseManagementPageModern';

// Eventually deprecate legacy version
```

## Migration Commands

### Create Domain Feature Structure
```bash
# Tenant maintenance (already done)
mkdir -p src/domains/tenant/features/maintenance
touch src/domains/tenant/features/maintenance/index.ts

# Tenant lease
mkdir -p src/domains/tenant/features/lease
touch src/domains/tenant/features/lease/index.ts

# Property manager leases
mkdir -p src/domains/property-manager/features/leases
touch src/domains/property-manager/features/leases/index.ts
```

### Move File (Windows)
```cmd
move src\ComponentName.tsx src\domains\tenant\features\feature-name\ComponentName.tsx
```

### Copy File (to preserve old while testing)
```cmd
copy src\ComponentName.tsx src\domains\tenant\features\feature-name\ComponentName.tsx
```

## Validation Checklist

After migrating a component:

- [ ] TypeScript compiles without errors
- [ ] No import errors in VS Code
- [ ] Application runs successfully
- [ ] Component renders correctly
- [ ] All features work as before
- [ ] No cross-domain imports
- [ ] Design tokens used (no magic numbers)
- [ ] Feature index.ts created
- [ ] App.tsx import updated
- [ ] Old file removed

## Common Issues & Solutions

### Issue 1: Import Path Too Deep
**Problem**: `import { X } from '../../../../../components/ui/X'`

**Solution**: Will add TypeScript path aliases in future
```json
// Future tsconfig.json
{
  "paths": {
    "@/components/*": ["src/components/*"],
    "@/design-tokens": ["src/design-tokens"]
  }
}
```

### Issue 2: Circular Dependencies
**Problem**: Component A imports B, B imports A

**Solution**: Extract shared logic to third file
```
features/maintenance/
├── MaintenancePage.tsx
├── MaintenanceCard.tsx
└── shared/
    └── types.ts (shared by both)
```

### Issue 3: Component Belongs to Multiple Domains
**Problem**: Component seems to fit in 2+ domains

**Solution**: 
1. **First check**: Is it truly identical? → `src/components/ui/`
2. **Different behavior**: Create separate versions in each domain
3. **Similar but customized**: Duplicate is okay, don't force abstraction

### Issue 4: Lost Track of Old File Location
**Solution**: Use file search
```bash
# Find all files with name
dir /s /b ComponentName.tsx

# Or in VS Code: Ctrl+P, type filename
```

## Progress Tracking

Update this section as you migrate:

**Session 1** (Current):
- ✅ TenantMaintenancePage

**Session 2** (Next):
- [ ] TenantShell
- [ ] Sidebar (tenant)
- [ ] MyLeasePage

**Session 3**:
- [ ] PaymentsPage (tenant)
- [ ] RentalApplicationPage (tenant)

## Testing Strategy

### Per-Component Testing
After each migration:
1. Compile check: `npm run build`
2. Visual check: Browse to component
3. Interaction check: Test all buttons/forms
4. Console check: No errors/warnings

### Integration Testing
After domain completion:
1. Test all pages in domain
2. Test navigation between pages
3. Test role-based access
4. Performance check

### Full Migration Testing
After all migrations:
1. Full regression test
2. Cross-browser check
3. Responsive design check
4. Performance comparison

## Rollback Plan

If migration causes issues:

1. **Keep old file** during initial migration (copy, don't move)
2. **Revert import** in App.tsx
3. **Delete new file** if needed
4. **Document issue** for future attempt

## Success Metrics

Migration is successful when:
- ✅ All components in domain folders
- ✅ Zero cross-domain imports
- ✅ All features working as before
- ✅ No TypeScript errors
- ✅ No runtime errors
- ✅ Design tokens used consistently
- ✅ Clean folder structure

---

**Document Version**: 1.0  
**Last Updated**: January 5, 2025  
**Next Review**: After 25% migration complete
