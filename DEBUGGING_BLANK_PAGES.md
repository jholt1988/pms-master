# Debugging Blank Pages Issue

## Changes Made

### 1. Fixed Shell Components (✅ Already Fixed)
- **AppShell.tsx**: Now renders `<Outlet />` instead of hardcoded `MainDashboard`
- **TenantShell.tsx**: Now renders `<Outlet />` instead of expecting `children` prop

### 2. Added Console Logging
Added debug logs to track rendering:
- `[AppShell] Rendering Property Manager shell` - When property manager shell loads
- `[DashboardRouter] Rendering for role: PROPERTY_MANAGER` - When dashboard router executes
- `[PropertyManagerDashboard] Component mounted` - When dashboard component mounts
- `[PropertyManagerDashboard] Rendering dashboard` - When dashboard renders

### 3. Fixed Role Matching
- Added 'ADMIN' role support in `RoleBasedShell` 
- Now checks: `user.role === 'PROPERTY_MANAGER' || user.role === 'ADMIN'`

## Testing Steps

1. **Open Browser DevTools**
   - Press F12 to open console
   - Clear console (Ctrl+L)

2. **Login as Property Manager**
   - Username: `admin_pm`
   - Password: `password123`

3. **Check Console Output**
   You should see:
   ```
   [AppShell] Rendering Property Manager shell
   [DashboardRouter] Rendering for role: PROPERTY_MANAGER
   [PropertyManagerDashboard] Rendering dashboard
   [PropertyManagerDashboard] Component mounted
   ```

4. **What to Look For**

   **If you see ALL console logs:**
   - Components are rendering correctly
   - Issue is likely CSS/styling hiding content
   - Check if content area has `overflow: hidden` or `height: 0`
   
   **If logs stop at `[AppShell]`:**
   - `<Outlet />` is not rendering properly
   - Check React Router version compatibility
   - Verify route nesting structure
   
   **If logs stop at `[DashboardRouter]`:**
   - PropertyManagerDashboard not importing correctly
   - Check for runtime errors in component
   
   **If NO logs appear:**
   - RoleBasedShell not executing
   - Check authentication state
   - User role might not be set correctly

## Expected UI After Fix

### Property Manager View
```
┌─────────────────────────────────────────────────────┐
│ Topbar: [Dashboard][Maintenance][Payments]...      │
├──────────┬──────────────────────────────────────────┤
│ Sidebar  │ Dashboard                                │
│          │ Property management overview...          │
│ • Dash   │                                          │
│ • Maint  │ [Occupancy: 94%] [Revenue: $75k]        │
│ • Pay    │ [Maintenance: 15] [Applications: 12]     │
│ • Leases │                                          │
│ • Apps   │ Recent Activity:                         │
│ ...      │ - Emergency HVAC repair - Unit 12B       │
│          │ - New rental application - Sarah         │
└──────────┴──────────────────────────────────────────┘
```

### Tenant View (for comparison - this works)
```
┌─────────────────────────────────────────────────────┐
│ Top Nav: [Search] [Alerts] [Inbox] [Avatar]        │
├──────────┬──────────────────────────────────────────┤
│ Sidebar  │ Dashboard                                │
│          │ Welcome back!                            │
│ • Dash   │                                          │
│ • Maint  │ [Next Rent: $1,500] [Maintenance: 5]    │
│ • Pay    │ [Lease: Suite 2A]                        │
│ ...      │                                          │
│          │ Recent Activity:                         │
│          │ - HVAC repair completed                  │
└──────────┴──────────────────────────────────────────┘
```

## Checklist

- [ ] Tenant login works (john_tenant) ✅ CONFIRMED
- [ ] Property Manager login accepted
- [ ] Console shows AppShell rendering
- [ ] Console shows DashboardRouter rendering
- [ ] Console shows PropertyManagerDashboard rendering
- [ ] Page content visible (not just white screen)
- [ ] Sidebar visible and functional
- [ ] Topbar visible
- [ ] Dashboard metrics cards visible

## Common Issues & Solutions

### Issue: White screen, no console logs
**Solution**: Check AuthContext - user might not have role set

### Issue: Sidebar shows but content area blank
**Solution**: Check CSS - `.content` class might have `display: none`

### Issue: "Cannot read property 'role' of undefined"
**Solution**: User object not properly stored after login

### Issue: Redirects to unauthorized page
**Solution**: Role case mismatch - ensure role is 'PROPERTY_MANAGER' not 'property_manager'

### Issue: Console logs appear but no UI
**Solution**: 
1. Check browser zoom level (should be 100%)
2. Inspect element - check if elements exist in DOM
3. Check CSS `visibility` or `opacity` properties
4. Check for z-index issues with overlays

## Next Steps If Still Broken

1. **Take screenshot** of browser console
2. **Take screenshot** of page (even if blank)
3. **Right-click page → Inspect** 
   - Look at Elements tab
   - Find `<div class="layout">` element
   - Check if it has child elements
   - Check computed CSS styles
4. **Share findings** so we can diagnose further
