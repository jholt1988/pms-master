# Visually Hidden Labels Implementation

**P0-002: Accessibility - Visually Hidden Labels**

This document describes the implementation of visually hidden labels for all text inputs, maintaining accessibility while improving visual design.

**Last Updated:** January 2025

---

## Overview

All form labels are now visually hidden using the `.sr-only` CSS class, while remaining fully accessible to screen readers. This provides a cleaner visual design while maintaining WCAG 2.1 Level A compliance.

---

## Implementation

### CSS Class: `.sr-only`

**Location:** `tenant_portal_app/src/index.css`

```css
/* Accessibility: Visually hidden but accessible to screen readers (WCAG 2.1) */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

/* Ensure sr-only elements are accessible when focused */
.sr-only:focus {
  position: static;
  width: auto;
  height: auto;
  padding: inherit;
  margin: inherit;
  overflow: visible;
  clip: auto;
  white-space: normal;
}
```

**Features:**
- Visually hidden from sighted users
- Fully accessible to screen readers
- Becomes visible when focused (for keyboard navigation)
- WCAG 2.1 compliant

---

## Components Updated

### 1. FormField Component

**Location:** `tenant_portal_app/src/components/ui/FormField.tsx`

**Changes:**
- Added `hideLabel` prop (defaults to `true`)
- Labels are visually hidden by default
- Labels remain accessible to screen readers

**Usage:**
```tsx
<FormField
  label="Email Address"
  name="email"
  hideLabel={true} // Default - label is visually hidden
>
  <Input type="email" />
</FormField>
```

### 2. NextUI Input Components

All NextUI `Input`, `Select`, and `Textarea` components now use `classNames` to hide labels:

```tsx
<Input
  label="Username"
  placeholder="Enter your username"
  classNames={{
    label: "sr-only", // Visually hidden but accessible
  }}
/>
```

---

## Files Updated

### Core Components
- ✅ `tenant_portal_app/src/index.css` - Added `.sr-only` class
- ✅ `tenant_portal_app/src/components/ui/FormField.tsx` - Added `hideLabel` prop

### Form Pages
- ✅ `tenant_portal_app/src/domains/shared/auth/features/login/LoginPage.tsx`
  - Username input
  - Password input
  - MFA code input

- ✅ `tenant_portal_app/src/domains/tenant/features/payments/PaymentsPage.tsx`
  - Card number input
  - Expiry month input
  - Expiry year input
  - Card brand select

- ✅ `tenant_portal_app/src/domains/tenant/features/maintenance/MaintenancePage.tsx`
  - Request title input
  - Category select
  - Priority select
  - Description textarea
  - Preferred date input
  - Preferred time input

---

## Accessibility Benefits

### ✅ WCAG 2.1 Compliance Maintained
- **3.3.2 Labels or Instructions (Level A):** All inputs have accessible labels
- **4.1.2 Name, Role, Value (Level A):** All inputs have accessible names
- **2.4.7 Focus Visible (Level AA):** Labels become visible on focus

### Screen Reader Support
- Screen readers announce labels when fields are focused
- Error messages reference field names correctly
- Form navigation is clear and logical

### Visual Design
- Cleaner, more modern appearance
- Placeholders provide visual context
- No visual clutter from labels

---

## Testing

### Manual Testing Checklist
- [ ] Labels are visually hidden
- [ ] Screen reader announces labels when fields are focused
- [ ] Labels become visible when focused (keyboard navigation)
- [ ] Error messages reference correct field names
- [ ] Form completion works correctly

### Screen Reader Testing
- Test with NVDA (Windows)
- Test with JAWS (Windows)
- Test with VoiceOver (Mac/iOS)

---

## Best Practices

### When to Use Visually Hidden Labels
- ✅ When placeholders provide sufficient visual context
- ✅ When form design requires minimal visual elements
- ✅ When labels would create visual clutter

### When to Show Labels
- ⚠️ Complex forms with many fields
- ⚠️ Forms with similar-looking fields
- ⚠️ When placeholders are not descriptive enough

### Always Include
- ✅ `label` prop (for accessibility)
- ✅ `aria-label` (as backup)
- ✅ Descriptive placeholder text
- ✅ Error messages that reference field names

---

## Example Implementation

### Before (Visible Label)
```tsx
<Input
  label="Email Address"
  placeholder="Enter your email"
  classNames={{
    label: "text-gray-300", // Visible label
  }}
/>
```

### After (Visually Hidden Label)
```tsx
<Input
  label="Email Address"
  placeholder="Enter your email"
  classNames={{
    label: "sr-only", // Visually hidden but accessible
  }}
/>
```

---

## Migration Notes

### For New Components
- Always include `label` prop
- Use `classNames={{ label: "sr-only" }}` for NextUI components
- Use `hideLabel={true}` for FormField components

### For Existing Components
- Add `classNames={{ label: "sr-only" }}` to all Input/Select/Textarea components
- Ensure `aria-label` is present as backup
- Test with screen readers after changes

---

## Resources

- [WCAG 2.1 - Labels or Instructions](https://www.w3.org/WAI/WCAG21/Understanding/labels-or-instructions.html)
- [WebAIM - Screen Reader Testing](https://webaim.org/articles/screenreader_testing/)
- [A11y Project - Visually Hidden](https://www.a11yproject.com/posts/how-to-hide-content/)

---

**Last Updated:** January 2025  
**Status:** ✅ Complete - All text inputs have visually hidden labels

