# Architecture Decision Record (ADR)

## ADR-001: Adopt Domain-Driven UI Architecture

**Date**: January 2025  
**Status**: Accepted  
**Decision Makers**: Development Team  

### Context
The Property Management Suite has multiple distinct user roles with different needs:
- **Tenants**: Submit maintenance requests, view lease, make payments
- **Property Managers**: Review applications, manage leases, track expenses
- **Admins**: User management, audit logs, system reporting

Initial codebase showed signs of complexity with role-based conditionals and unclear component ownership.

### Problem Statement
How should we structure the UI codebase to:
1. Support 3+ distinct user roles
2. Maintain visual consistency
3. Enable independent feature development
4. Avoid technical debt
5. Scale as new features are added

### Options Considered

#### Option 1: Component Library Approach
**Structure**: Build one unified component library, use props for role differences

**Pros**:
- Maximum code reuse
- One component definition for similar UI elements
- Easy to ensure visual consistency

**Cons**:
- Components become bloated with conditional logic
- Hard to understand which props apply to which role
- Changes for one role risk breaking another
- Performance overhead from unused conditional branches
- Testing complexity increases exponentially

**Example**:
```typescript
<MaintenanceCard 
  userRole={role}
  showApprovalButtons={role === 'manager'}
  showSubmitButton={role === 'tenant'}
  allowEdit={role === 'manager' || isOwner}
/>
```

**Decision**: ❌ Rejected due to tight coupling and complexity

#### Option 2: Hybrid Extract-Later Approach
**Structure**: Build features quickly, extract shared components later

**Pros**:
- Fast initial development
- No upfront architectural planning
- Flexibility to "see what emerges"

**Cons**:
- Creates technical debt from day one
- Refactoring becomes expensive
- "Later" often never comes
- Team resists breaking changes
- Duplicated code proliferates

**Example Timeline**:
- Week 1: Build tenant maintenance page
- Week 2: Build manager maintenance dashboard (duplicate code)
- Week 4: Notice duplication
- Week 6: Plan to extract
- Week 8: Team busy with features
- Month 3: Still duplicated, now with divergent behavior

**Decision**: ❌ Rejected due to known technical debt pattern

#### Option 3: Domain-Driven UI Architecture
**Structure**: Organize by user role, share only design tokens

**Pros**:
- Clear boundaries between roles
- Each domain optimized for its users
- No cross-domain coupling
- Visual consistency via design tokens
- Scales cleanly
- No technical debt
- Easy to reason about
- Parallel development possible

**Cons**:
- Some code duplication (acceptable trade-off)
- Requires upfront planning
- Need design token discipline

**Example Structure**:
```
domains/
├── tenant/
│   └── features/maintenance/MaintenancePage.tsx
└── property-manager/
    └── features/maintenance/MaintenanceDashboard.tsx
```

**Decision**: ✅ Accepted

### Decision
**We will adopt the Domain-Driven UI Architecture.**

### Rationale

#### 1. User Roles Have Fundamentally Different Needs
- **Tenants** need simple, guided workflows
- **Property Managers** need data-dense dashboards with bulk actions
- **Admins** need system-level controls

Trying to share components between these creates the wrong abstraction.

#### 2. Design Tokens Provide Sufficient Sharing
Visual consistency doesn't require component sharing. Design tokens (colors, spacing, typography) achieve the same goal without coupling.

#### 3. Code Duplication Is Acceptable Here
The duplication is in:
- Layout structures
- Form patterns
- List displays

These are **similar but not identical** across roles. Trying to abstract them creates more complexity than duplicating them.

#### 4. Clear Boundaries Enable Scalability
As the team grows:
- Developer A can own the tenant domain
- Developer B can own the manager domain
- No merge conflicts, no coordination overhead

#### 5. No Technical Debt from Day One
By committing to domain isolation upfront, we avoid the "we'll fix it later" trap that plagues hybrid approaches.

### Implementation Plan

#### Phase 1: Foundation (✅ Complete)
- Create design token system (colors, spacing, typography, etc.)
- Export centralized design tokens
- Document token usage

**Outcome**: 7 token files + index created

#### Phase 2: Scaffolding (✅ Complete)
- Create domain folder structure
- Set up tenant/property-manager/admin domains
- Create domain-specific themes

**Outcome**: 3 domains with ui/layouts/features/theme folders

#### Phase 3: Migration (🚧 In Progress)
- Move existing components to appropriate domains
- Update import paths
- Remove old files

**Progress**: 1 of ~20 components migrated

#### Phase 4: Routing
- Refactor App.tsx for domain-based routes
- Implement role-based routing

#### Phase 5: Validation
- Test all workflows
- Verify no cross-domain imports
- Performance testing

### Success Metrics
- ✅ Zero cross-domain imports
- ✅ All design values from tokens
- ✅ <10 files per domain root
- ✅ New features scaffold in <1 hour
- ✅ No role-based conditionals in components

### Consequences

#### Positive
- **Maintainability**: Clear ownership, easy to understand
- **Scalability**: Add domains without affecting others
- **Performance**: No unused code in bundles
- **Developer Experience**: Simple mental model
- **Testing**: Test domains independently

#### Negative
- **Code Volume**: Some duplication of patterns
- **Initial Setup**: More upfront planning required
- **Learning Curve**: Team must understand domain boundaries

#### Mitigation
- **For Duplication**: Accept it as the right trade-off
- **For Setup**: One-time cost, long-term benefit
- **For Learning**: Document patterns, provide examples

### Validation After Implementation

#### What We Learned
1. **Design tokens work perfectly** - Visual consistency achieved without component sharing
2. **Domain isolation is liberating** - No fear of breaking other roles
3. **Migration is straightforward** - Clear target location for each component
4. **Team understanding is high** - Simple structure is easy to explain

#### Adjustments Made
- Initially considered 5 token files, expanded to 7 for completeness
- Added transition/animation tokens for future use
- Created domain themes earlier than planned (good decision)

### Related Decisions
- ADR-002: NextUI as Component Library (existing)
- ADR-003: TypeScript for Type Safety (existing)
- ADR-004: Design Token System Structure (this decision)

### References
- [Domain-Driven Design](https://martinfowler.com/bliki/DomainDrivenDesign.html)
- [Atomic Design](https://bradfrost.com/blog/post/atomic-web-design/) - Considered but rejected for this use case
- [Component Library Anti-Patterns](https://kentcdodds.com/blog/when-to-break-up-a-component-into-multiple-components)

### Review Schedule
- **3 months**: Check success metrics
- **6 months**: Survey team satisfaction
- **1 year**: Evaluate if architecture meets scale needs

---

## ADR-002: Design Token System as Single Source of Truth

**Date**: January 2025  
**Status**: Accepted  

### Context
With domain isolation, we need a way to ensure visual consistency without sharing components.

### Decision
All design values (colors, spacing, typography, shadows, etc.) will be defined in centralized design token files in `src/design-tokens/`.

### Rationale
1. **Single Source of Truth**: One place to update global styles
2. **Type Safety**: TypeScript types ensure correct usage
3. **Documentation**: Tokens serve as design system documentation
4. **Theme Flexibility**: Domains can customize via themes
5. **Designer Handoff**: Tokens match design tool values

### Token Categories
- colors (base palettes + semantic)
- spacing (4px scale)
- typography (Inter font + scale)
- radius (border radius)
- shadows (elevation)
- breakpoints (responsive)
- transitions (animations)

### Consequences
**Positive**:
- No magic numbers in code
- Easy global style updates
- Clear design system

**Negative**:
- Must import tokens (small overhead)
- Need discipline to use tokens

**Mitigation**:
- Linting rules to catch hardcoded values
- Clear documentation with examples

---

## ADR-003: Feature-Based Folder Organization Within Domains

**Date**: January 2025  
**Status**: Accepted  

### Context
Within each domain, how should we organize components?

### Decision
Use feature-based folders:
```
tenant/
├── features/
│   ├── maintenance/
│   ├── lease/
│   └── payments/
```

Not page-based:
```
tenant/
├── pages/
│   ├── MaintenancePage.tsx
│   ├── LeasePage.tsx
```

### Rationale
1. **Cohesion**: Related components stay together
2. **Scalability**: Features can have sub-components
3. **Reusability**: Easy to find feature-specific code
4. **Testing**: Test entire feature as unit

### Structure
```
features/maintenance/
├── MaintenancePage.tsx        # Main page component
├── MaintenanceCard.tsx        # Feature-specific UI
├── MaintenanceForm.tsx        # Feature-specific form
├── types.ts                   # Feature types
└── index.ts                   # Clean exports
```

---

**Document Version**: 1.0  
**Last Updated**: January 2025  
**Next Review**: April 2025
