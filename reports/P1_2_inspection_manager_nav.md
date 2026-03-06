# P1-2 Report: Inspection Manager Navigation (PM/Admin + Owner optional)

## Scope
Implement nav access for **Inspection Manager** so PM/Admin users can reach the inspections management screen via navigation, using route:
- `/inspection-management`

Optional owner read-only support was included where straightforward.

## Changes made

### 1) Primary app nav (Dock) updated
File: `tenant_portal_app/src/components/ui/DockNavigation.tsx`

- Added **Inspection Manager** dock item for PM/Admin flow:
  - `label: 'Inspection Manager'`
  - `path: '/inspection-management'`
  - `icon: ClipboardList`
- Added **Inspection Manager** for Owner dock flow as optional enhancement.
- Added **Inspection Manager** to PM/Admin **All Apps** menu.
- Owner All Apps entry normalized from `Inspections` -> `Inspection Manager` at same route.

### 2) Sidebar nav parity update (defensive / no-regression)
File: `tenant_portal_app/src/components/ui/Sidebar.tsx`

- Added `ClipboardList` icon import.
- Added main nav link for PM/Owner/Admin:
  - `{ path: '/inspection-management', label: 'Inspection Manager', roles: ['PROPERTY_MANAGER', 'OWNER', 'ADMIN'] }`

This keeps legacy/sidebar-based screens consistent and avoids nav mismatch across shells.

## Route validation
Route already exists and is role-gated correctly in `tenant_portal_app/src/App.tsx`:

- PM/Admin/Operator block includes:
  - line 249: `path="inspection-management"`
  - line 252: `path="inspections"` redirecting to `/inspection-management`
- Owner block includes:
  - line 264: `path="inspection-management"`
  - line 265: `path="inspections"` redirecting to `/inspection-management`

Evidence command used:
- `nl -ba tenant_portal_app/src/App.tsx | grep -n "inspection-management\|RequireRole allowedRoles"`

## No-duplication / regression check
- No duplicate inspection nav item introduced within the same role menu arrays.
- PM/Admin previously had no inspection manager nav in Dock; now exactly one explicit entry.
- Owner now has one explicit inspection manager entry in Dock + one in All Apps (expected for those two menu contexts).

## Test / validation evidence

### Automated test run
Command:
- `npm run test:run -- src/components/ui/DockNavigation.test.tsx` (from `tenant_portal_app`)

Result:
- ✅ `1 passed` test file
- ✅ `3 passed` tests

### Type-check note
Command:
- `npm run type-check` (from `tenant_portal_app`)

Result:
- Fails due to **pre-existing unrelated issues**:
  - `src/App.tsx(170,69): 'user' is possibly 'null'`
  - `src/PaymentsPage.tsx(114,62): Cannot find name 'NeedsAuthAttempt'`

No new type errors attributable to this nav change were observed in modified files.

## Diff evidence
Modified files for this task:
- `tenant_portal_app/src/components/ui/DockNavigation.tsx`
- `tenant_portal_app/src/components/ui/Sidebar.tsx`

(Repo also contains unrelated pre-existing modifications in backend files not touched by this task.)
