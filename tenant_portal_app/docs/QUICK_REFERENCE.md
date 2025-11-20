# Quick Reference: Domain-Driven UI Architecture

## 🚀 Quick Start

### Adding a New Feature

1. **Identify the domain**: tenant, property-manager, or admin?
2. **Create feature folder**: `domains/{domain}/features/{feature-name}/`
3. **Import design tokens**: `import { baseColors, spacing } from '@/design-tokens'`
4. **Build the feature**: Create components within the feature folder
5. **Export cleanly**: Add `index.ts` to feature folder
6. **Update routing**: Add route in `App.tsx`

### Example: Adding Tenant Payment History

```bash
# 1. Create folder
src/domains/tenant/features/payments/PaymentHistoryPage.tsx

# 2. In PaymentHistoryPage.tsx
import { baseColors, spacing, typography } from '../../../../design-tokens';
import { Card, Button } from '@nextui-org/react';

export const PaymentHistoryPage = () => {
  // Component code
};

# 3. Create index.ts
export { PaymentHistoryPage } from './PaymentHistoryPage';

# 4. Update App.tsx
import { PaymentHistoryPage } from './domains/tenant/features/payments';
```

## 📐 Design Token Usage

### Colors
```typescript
import { baseColors, semanticColors } from '@/design-tokens';

// Use base colors
<div style={{ color: baseColors.primary[600] }} />

// Use semantic colors
<div style={{ backgroundColor: semanticColors.background.primary }} />
```

### Spacing
```typescript
import { spacing } from '@/design-tokens';

// Literal values
<div style={{ padding: spacing[4] }} /> // 16px

// Semantic values
<div style={{ margin: spacing.md }} /> // 16px

// Layout values
<div style={{ padding: spacing.cardPadding }} /> // 16px
```

### Typography
```typescript
import { typography } from '@/design-tokens';

// Font sizes
<h1 style={{ fontSize: typography.size['4xl'] }} /> // 48px

// Text styles (includes font-size, weight, line-height)
<h1 style={typography.textStyles.h1} />
<p style={typography.textStyles.bodyNormal} />
```

### Other Tokens
```typescript
import { radius, shadows, breakpoints, transition } from '@/design-tokens';

// Border radius
<div style={{ borderRadius: radius.card }} /> // 16px

// Shadows
<div style={{ boxShadow: shadows.md }} />

// Transitions
<div style={{ transition: transition.default }} />

// Breakpoints (in CSS or styled-components)
@media ${mediaQueries.md} { /* styles */ }
```

## 📁 Folder Structure Cheat Sheet

```
src/
├── design-tokens/           # ✅ Shared across all domains
│   ├── colors.ts
│   ├── spacing.ts
│   ├── typography.ts
│   └── ...
│
├── domains/
│   ├── tenant/             # ❌ No imports to/from other domains
│   │   ├── ui/             # Tenant-specific reusable UI components
│   │   ├── layouts/        # TenantShell, Sidebar, etc.
│   │   ├── features/       # Feature-specific code
│   │   │   ├── maintenance/
│   │   │   │   ├── MaintenancePage.tsx
│   │   │   │   ├── MaintenanceCard.tsx
│   │   │   │   └── index.ts
│   │   │   ├── lease/
│   │   │   └── payments/
│   │   └── theme/
│   │       └── tenant-theme.ts
│   │
│   ├── property-manager/   # ❌ No imports to/from other domains
│   │   └── ... (same structure)
│   │
│   └── admin/              # ❌ No imports to/from other domains
│       └── ... (same structure)
│
└── components/             # ✅ Truly generic components only
    └── ui/
        ├── PageHeader.tsx  # Used identically by multiple domains
        └── SearchInput.tsx
```

## ✅ Do's and ❌ Don'ts

### ✅ DO

```typescript
// ✅ Import design tokens
import { baseColors, spacing } from '@/design-tokens';

// ✅ Keep components within their domain
// File: domains/tenant/features/maintenance/MaintenanceCard.tsx

// ✅ Use semantic values
<div style={{ padding: spacing.cardPadding }} />

// ✅ Export cleanly via index.ts
export { MaintenancePage } from './MaintenancePage';

// ✅ Create domain-specific components
// domains/tenant/ui/TenantCard.tsx
// domains/property-manager/ui/ManagerCard.tsx
```

### ❌ DON'T

```typescript
// ❌ Don't cross-import between domains
import { TenantCard } from '../../tenant/ui/TenantCard'; // WRONG!

// ❌ Don't use magic numbers
<div style={{ padding: '16px' }} /> // Use spacing.md instead

// ❌ Don't use hardcoded colors
<div style={{ color: '#2563EB' }} /> // Use baseColors.primary[600]

// ❌ Don't create role-conditional components
const Card = ({ userRole }) => {
  if (userRole === 'tenant') return <TenantCard />;
  return <ManagerCard />;
}; // WRONG! Put in respective domains

// ❌ Don't put domain logic in shared components
// components/ui/MaintenanceCard.tsx with tenant-specific logic // WRONG!
```

## 🎨 Theme Customization

Each domain can customize the base theme:

```typescript
// domains/tenant/theme/tenant-theme.ts
import { baseColors } from '@/design-tokens';

export const tenantTheme = {
  extend: {
    colors: {
      primary: {
        DEFAULT: baseColors.primary[600], // Bright, friendly
      },
    },
  },
};

// domains/property-manager/theme/manager-theme.ts
export const managerTheme = {
  extend: {
    colors: {
      primary: {
        DEFAULT: baseColors.primary[700], // Darker, professional
      },
    },
  },
};
```

## 🔍 Finding Components

### "Where does this component go?"

**Ask yourself:**
1. Is it used identically by 2+ domains? → `src/components/ui/`
2. Is it tenant-specific? → `src/domains/tenant/`
3. Is it property-manager-specific? → `src/domains/property-manager/`
4. Is it admin-specific? → `src/domains/admin/`

### "Where within the domain?"

**Ask yourself:**
1. Is it a layout component (shell, sidebar, nav)? → `layouts/`
2. Is it feature-specific (only used in one feature)? → `features/{feature-name}/`
3. Is it reusable within the domain? → `ui/`

### Decision Tree

```
Is it generic (no domain knowledge)?
├─ Yes → components/ui/
└─ No → Which domain?
    ├─ Tenant → domains/tenant/
    │   └─ Layout or Feature?
    │       ├─ Layout → layouts/
    │       ├─ Feature-specific → features/{feature}/
    │       └─ Reusable in domain → ui/
    ├─ Property Manager → domains/property-manager/
    │   └─ (same structure)
    └─ Admin → domains/admin/
        └─ (same structure)
```

## 🛠️ Common Tasks

### Task: Update Global Primary Color
**File**: `src/design-tokens/colors.ts`
```typescript
primary: {
  600: '#NEW_COLOR', // Change this
}
```
**Impact**: All domains automatically updated

### Task: Add New Spacing Value
**File**: `src/design-tokens/spacing.ts`
```typescript
export const spacing = {
  // ...existing
  '5xl': '80px', // Add new
};
```

### Task: Create New Tenant Feature
```bash
# 1. Create folder
mkdir src/domains/tenant/features/new-feature

# 2. Create main page
touch src/domains/tenant/features/new-feature/NewFeaturePage.tsx

# 3. Create index
echo "export { NewFeaturePage } from './NewFeaturePage';" > src/domains/tenant/features/new-feature/index.ts

# 4. Add route in App.tsx
```

### Task: Fix Import Path Depth
Currently: `import { PageHeader } from '../../../../components/ui/PageHeader';`

**Solution**: Add TypeScript path aliases (future task)
```json
// tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "@/design-tokens": ["src/design-tokens"],
      "@/components/*": ["src/components/*"],
      "@/domains/*": ["src/domains/*"]
    }
  }
}
```

## 📊 Progress Tracking

### Completion Checklist
- [x] Phase 1: Design tokens created
- [x] Phase 2: Domain structure scaffolded
- [ ] Phase 3: Components migrated (5% done)
- [ ] Phase 4: Routing refactored
- [ ] Phase 5: Path aliases added
- [ ] Phase 6: Testing completed

### Component Migration Status
**Tenant Domain**:
- [x] MaintenancePage
- [ ] MyLeasePage
- [ ] PaymentsPage
- [ ] TenantShell (high priority)
- [ ] Sidebar
- [ ] TenantInspectionPage

**Property Manager Domain**:
- [ ] LeaseManagementPage
- [ ] RentalApplicationsManagementPage
- [ ] MaintenanceDashboard
- [ ] ExpenseTrackerPage

**Admin Domain**:
- [ ] UserManagementPage
- [ ] AuditLogPage
- [ ] ReportingPage

## 🆘 Troubleshooting

### "I'm getting import errors"
- Check relative path depth (count `../`)
- Verify file exists at import location
- Check file exports (named vs default)

### "Colors aren't applying"
- Verify you're importing from design-tokens
- Check you're using `baseColors` not `colors`
- Ensure NextUI theme is wrapping component

### "Component feels too big"
- Can you extract a sub-component in the same feature folder?
- Is part of it reusable in the domain? → Move to domain's `ui/`
- Does it have too much business logic? → Extract hooks/utilities

## 📚 Further Reading
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Full architecture explanation
- [ADR.md](./ADR.md) - Architecture decision records
- [DOMAIN_IMPLEMENTATION_STATUS.md](../DOMAIN_IMPLEMENTATION_STATUS.md) - Current progress

---

**Version**: 1.0  
**Last Updated**: January 5, 2025  
**Maintainer**: Development Team
