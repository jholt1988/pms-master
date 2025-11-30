# Module Loading Errors - Troubleshooting Guide

## Issue: "Failed to fetch dynamically imported module"

This error occurs when Vite/React Router cannot load a lazy-loaded module.

### Common Causes

1. **Browser Cache** - Old broken module cached in browser
2. **Vite Dev Server Cache** - Module cached in Vite's internal cache
3. **Export Mismatch** - Module export doesn't match import expectation
4. **Syntax Errors** - Module has syntax errors preventing compilation

### Solutions

#### 1. Clear Browser Cache
- **Hard Refresh**: `Ctrl + Shift + R` (Windows/Linux) or `Cmd + Shift + R` (Mac)
- **Clear Cache**: Open DevTools → Application → Clear Storage → Clear site data
- **Incognito Mode**: Test in incognito/private window

#### 2. Restart Dev Server
```bash
# Stop the dev server (Ctrl+C)
# Then restart
npm run dev
```

#### 3. Clear Vite Cache
```bash
# Delete Vite cache
rm -rf node_modules/.vite
# Or on Windows PowerShell:
Remove-Item -Recurse -Force node_modules\.vite

# Restart dev server
npm run dev
```

#### 4. Verify Module Exports

**Correct Pattern:**
```tsx
// Component file (MaintenancePage.tsx)
const MaintenancePage: React.FC = () => {
  // ... component code
};

export default MaintenancePage;

// Index file (index.ts)
export { default as MaintenancePage } from './MaintenancePage';
```

**Incorrect Patterns:**
```tsx
// ❌ Wrong: Named export in component
export const MaintenancePage = () => { ... }

// ❌ Wrong: Re-exporting named export
export { MaintenancePage } from './MaintenancePage';
```

#### 5. Check Import Statement

**Correct:**
```tsx
const Component = lazy(() => 
  import('./path/to/module').then(m => ({ default: m.ComponentName }))
);
```

### Maintenance Module Specific Fix

If the maintenance module fails to load:

1. **Verify exports are correct:**
   - `MaintenancePage.tsx` should have `export default MaintenancePage`
   - `index.ts` should have `export { default as MaintenancePage } from './MaintenancePage'`

2. **Clear all caches:**
   ```bash
   # Clear Vite cache
   Remove-Item -Recurse -Force node_modules\.vite
   
   # Clear browser cache (or hard refresh)
   # Restart dev server
   npm run dev
   ```

3. **Check browser console** for specific error messages

### Network Refused Error

If "Go Home" button shows "network refused":

1. **Use React Router navigation** (already fixed in PageErrorBoundaryWithNav)
2. **Check route exists** - Ensure `/dashboard` route is defined
3. **Check authentication** - User must be authenticated to access dashboard

### Prevention

- Always use default exports for lazy-loaded components
- Use consistent export pattern across all modules
- Test module loading after any export changes
- Clear cache when module structure changes

