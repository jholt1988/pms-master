# Domain-Driven UI Architecture

## Overview
This document describes the architectural approach for the Property Management Suite tenant portal application. The architecture is designed to handle multiple distinct user roles (tenants, property managers, admins) with domain isolation while maintaining visual consistency through shared design tokens.

## Architecture Decision: Domain-Driven UI

### Why Domain-Driven?
We evaluated three architectural approaches:

1. **Component Library Approach** (❌ Rejected)
   - Build one unified component library
   - Use props/conditional rendering for role differences
   - **Problem**: Creates bloated components with complex conditionals, tight coupling between roles

2. **Hybrid Extract-Later Approach** (❌ Rejected)
   - Build features quickly, extract shared components later
   - **Problem**: Creates technical debt, refactoring overhead, "never gets done" syndrome

3. **Domain-Driven UI Architecture** (✅ Adopted)
   - Organize by user role (tenant/property-manager/admin)
   - Shared design tokens only, no shared components initially
   - Each domain is self-contained
   - **Benefits**: Clear boundaries, optimized per role, scalable, no technical debt

### Core Principle
> **"Domains share a design language, not components"**

Each user role has fundamentally different:
- **Workflows**: Tenants submit requests, managers review/approve
- **Data models**: Tenants see "my lease", managers see "all leases"
- **Permissions**: Different access levels and capabilities
- **UI complexity**: Manager dashboards are more complex than tenant views

## Architecture Layers

### Layer 1: Design Tokens (Shared Foundation)
**Location**: `src/design-tokens/`

The **only** shared layer across all domains. Provides the visual design language.

```
design-tokens/
├── colors.ts        # Base palettes + semantic mappings
├── spacing.ts       # 4px-based spacing system
├── typography.ts    # Font system + text styles
├── radius.ts        # Border radius values
├── shadows.ts       # Elevation system
├── breakpoints.ts   # Responsive breakpoints
├── transitions.ts   # Animation system
└── index.ts         # Centralized exports
```

**Purpose**: 
- Ensure visual consistency across all domains
- Single source of truth for design values
- Enable theme customization per domain
- Type-safe design system with TypeScript

**Usage**:
```typescript
import { baseColors, spacing, typography } from '@/design-tokens';
```

### Layer 2: Domain Folders (Isolated Contexts)
**Location**: `src/domains/[domain-name]/`

Each domain is completely self-contained with its own:

```
domains/
├── tenant/
│   ├── ui/              # Tenant-specific UI components
│   ├── layouts/         # Tenant shell, navigation
│   ├── features/        # Tenant features (maintenance, lease, payments)
│   │   ├── maintenance/
│   │   ├── lease/
│   │   └── payments/
│   └── theme/           # Tenant-specific NextUI theme config
│       └── tenant-theme.ts
├── property-manager/
│   ├── ui/
│   ├── layouts/
│   ├── features/        # Manager features (applications, leases, expenses)
│   │   ├── applications/
│   │   ├── leases/
│   │   └── expenses/
│   └── theme/
│       └── manager-theme.ts
└── admin/
    ├── ui/
    ├── layouts/
    ├── features/        # Admin features (users, audit, reporting)
    │   ├── users/
    │   ├── audit/
    │   └── reporting/
    └── theme/
        └── admin-theme.ts
```

**Key Rules**:
- ✅ Domains import from design-tokens
- ✅ Domains import from shared utilities (date-fns, etc.)
- ❌ Domains NEVER import from other domains
- ❌ No cross-domain component sharing

### Layer 3: Shared Utilities (Optional)
**Location**: `src/components/ui/` (for truly generic components)

Only for components that are:
- 100% generic (no domain knowledge)
- Used by multiple domains in identical form
- Pure presentation (no business logic)

Examples:
- `PageHeader` - Generic header with title/subtitle/actions
- `SearchInput` - Basic search input wrapper
- `StatusBadge` - Generic status chip component

**Critical**: If a component needs domain-specific behavior, it belongs in the domain folder, not here.

## Domain Theme System

Each domain extends base design tokens with NextUI-specific configurations:

```typescript
// domains/tenant/theme/tenant-theme.ts
import { baseColors, radius, shadows } from '@/design-tokens';

export const tenantTheme = {
  extend: {
    colors: {
      primary: {
        DEFAULT: baseColors.primary[600], // Brighter for tenants
        // ...full palette
      }
    },
    borderRadius: {
      small: radius.button,
      medium: radius.card,
      large: radius.modal,
    },
    boxShadow: {
      small: shadows.sm,
      medium: shadows.md,
      large: shadows.lg,
    },
  },
};
```

Property managers might use a darker primary color for a more professional feel:
```typescript
DEFAULT: baseColors.primary[700], // Darker for managers
```

## Migration Strategy

### Phase 1: Design Tokens (✅ Complete)
1. Create all design token files
2. Export from centralized index
3. Document token usage patterns

### Phase 2: Domain Scaffolding (✅ Complete)
1. Create domain folder structure
2. Create domain themes
3. Set up feature folders

### Phase 3: Component Migration (🚧 In Progress)
1. Identify components by domain
2. Move components to appropriate domain/feature folders
3. Update imports in App.tsx
4. Remove old files

**Migration Checklist**:
- [x] TenantMaintenancePage → tenant/features/maintenance
- [ ] MyLeasePage → tenant/features/lease
- [ ] PaymentsPage → tenant/features/payments
- [ ] TenantShell → tenant/layouts
- [ ] LeaseManagementPage → property-manager/features/leases
- [ ] RentalApplicationsManagementPage → property-manager/features/applications
- [ ] UserManagementPage → admin/features/users

### Phase 4: Routing Refactor
Update App.tsx to use domain-based routing:
```typescript
// Before
import { TenantMaintenancePage } from './TenantMaintenancePage';

// After
import { MaintenancePage } from './domains/tenant/features/maintenance';
```

### Phase 5: Testing & Validation
- Verify no cross-domain imports
- Test role-based navigation
- Validate theme switching
- Check responsive behavior

## Import Path Conventions

### Design Tokens
```typescript
// Always use absolute path from design-tokens
import { baseColors, spacing, typography } from '../../../design-tokens';
```

### Within Same Domain
```typescript
// Relative paths within domain
import { MaintenanceCard } from '../ui/MaintenanceCard';
import { MaintenanceList } from './MaintenanceList';
```

### Shared Components (Rare)
```typescript
// Absolute path from src/components
import { PageHeader } from '../../../../components/ui/PageHeader';
```

## Design Token Categories

### Colors
- **Base Palettes**: primary, success, warning, danger, neutral (50-900 shades)
- **Semantic Colors**: background, foreground, border, status mappings
- **Usage**: `baseColors.primary[600]`

### Spacing
- **Literal**: 0-32 (0px to 128px in 4px increments)
- **Semantic**: none, xxs, xs, sm, md, lg, xl, 2xl, 3xl, 4xl
- **Layout**: pageGutter, sectionGap, cardPadding
- **Usage**: `spacing.md` or `spacing[4]`

### Typography
- **Font Family**: Inter (primary), system fallbacks
- **Scale**: xs(12px) to 6xl(60px) using Major Third (1.25) ratio
- **Weights**: 100-900
- **Semantic Styles**: h1-h6, bodyLarge, bodyNormal, bodySmall, label, caption
- **Usage**: `typography.textStyles.h1`

### Radius
- **Base**: none, sm, md, lg, xl, 2xl, full
- **Component**: button, card, input, badge, modal, avatar
- **Usage**: `radius.card`

### Shadows
- **Levels**: none, sm, md, lg, xl, 2xl, inner
- **Semantic**: card, cardHover, modal, dropdown, navbar, button, input
- **Usage**: `shadows.lg` or `elevation.card`

### Breakpoints
- **Values**: sm(640px), md(768px), lg(1024px), xl(1280px), 2xl(1536px)
- **Media Queries**: `mediaQueries.md` → `@media (min-width: 768px)`
- **Usage**: For responsive design logic

### Transitions
- **Duration**: fast(150ms), normal(250ms), slow(350ms)
- **Easing**: default, linear, easeIn, easeOut, easeInOut
- **Presets**: default, fast, slow, colors, transform, opacity, shadow
- **Usage**: `transition.default`

## Benefits of This Architecture

### 1. Clear Separation of Concerns
- Each domain is self-contained
- No cross-domain dependencies
- Easy to understand scope

### 2. Scalability
- Add new features within domains without affecting others
- Add new domains (e.g., "vendor", "inspector") easily
- Team members can work on different domains in parallel

### 3. Maintainability
- Changes in tenant features don't break manager features
- Easier to reason about codebase
- Clear file structure

### 4. Visual Consistency
- Design tokens ensure cohesive look and feel
- Easy to update global design (change one token file)
- Type-safe design system

### 5. Performance
- No unused code in components (no conditional logic for other roles)
- Smaller bundle sizes per domain
- Optimized for specific user workflows

### 6. No Technical Debt
- No "we'll extract later" promises
- No complex refactoring needed
- Clean architecture from day one

## Anti-Patterns to Avoid

### ❌ Cross-Domain Imports
```typescript
// WRONG - Don't do this!
import { TenantCard } from '../../tenant/ui/TenantCard';
```
**Why**: Creates tight coupling, defeats domain isolation

### ❌ Shared Components with Role Logic
```typescript
// WRONG - Don't do this!
const MaintenanceCard = ({ userRole, ...props }) => {
  if (userRole === 'tenant') {
    return <TenantView {...props} />;
  } else if (userRole === 'manager') {
    return <ManagerView {...props} />;
  }
};
```
**Why**: Creates bloated components, hard to maintain

### ❌ Bypassing Design Tokens
```typescript
// WRONG - Don't do this!
<div style={{ color: '#2563EB' }} />

// RIGHT - Do this instead!
import { baseColors } from '@/design-tokens';
<div style={{ color: baseColors.primary[600] }} />
```
**Why**: Breaks design system consistency

## Success Metrics

- ✅ Zero cross-domain imports
- ✅ All design values come from tokens
- ✅ Each domain has <10 files in root features folder
- ✅ New features take <1 hour to scaffold
- ✅ No components with role-based conditionals

## Future Enhancements

### Potential Additions
1. **Domain-Specific State Management**: Each domain could have its own Redux slice or Context
2. **Domain-Specific API Clients**: Separate API layers per domain
3. **Domain-Specific Testing**: Test suites organized by domain
4. **Domain-Specific Documentation**: Auto-generated docs per domain

### Theme Switching
Could implement runtime theme switching:
```typescript
const theme = user.role === 'tenant' ? tenantTheme : managerTheme;
<NextUIProvider theme={theme}>
  {/* App content */}
</NextUIProvider>
```

## Conclusion

The Domain-Driven UI Architecture provides a scalable, maintainable foundation for multi-role applications. By isolating domains and sharing only design tokens, we achieve the best balance between consistency and flexibility.

**Remember**: When in doubt, keep it in the domain. Only extract to shared when you have identical usage across 2+ domains.

---

**Document Version**: 1.0  
**Last Updated**: January 2025  
**Status**: Architecture Implemented, Migration In Progress
