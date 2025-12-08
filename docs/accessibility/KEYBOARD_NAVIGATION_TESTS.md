# Keyboard Navigation Testing Guide

**P0-002/P0-003: Keyboard Navigation Test Suite**

This document describes the keyboard navigation test suite and how to run it.

**Last Updated:** January 2025

---

## Overview

Keyboard navigation tests verify that all interactive elements are accessible via keyboard and that navigation patterns work correctly.

---

## Test Suite Location

**File:** `tenant_portal_app/src/components/ui/__tests__/keyboard-navigation.test.tsx`

---

## Test Coverage

### 1. Skip Link Tests
- ✅ Skip link is accessible via Tab key
- ✅ Skip link jumps to main content when activated

### 2. Focus Indicators
- ✅ Focus indicators are visible on interactive elements
- ✅ Focus styles are applied correctly

### 3. Modal Focus Trapping
- ✅ Focus is trapped within modal when open
- ✅ Tab cycles through modal elements
- ✅ Escape key closes modal

### 4. Dropdown Menus
- ✅ Dropdown opens on Enter key
- ✅ Arrow keys navigate dropdown items
- ✅ Escape key closes dropdown

### 5. Form Navigation
- ✅ Tab navigates forward through form fields
- ✅ Shift+Tab navigates backward through form fields
- ✅ Logical tab order maintained

### 6. Navigation Menu
- ✅ Tab navigates through navigation items
- ✅ Enter activates navigation items
- ✅ Focus order is logical

### 7. Accessibility Requirements
- ✅ All interactive elements have visible focus indicators
- ✅ Icon-only buttons have ARIA labels
- ✅ Decorative elements are hidden from screen readers

---

## Running Tests

### Run All Keyboard Navigation Tests
```bash
cd tenant_portal_app
npm test -- keyboard-navigation
```

### Run with Coverage
```bash
npm test -- keyboard-navigation --coverage
```

### Run in Watch Mode
```bash
npm test -- keyboard-navigation --watch
```

---

## Manual Testing Checklist

While automated tests cover many scenarios, manual testing is also important:

### Basic Navigation
- [ ] Tab moves forward through all interactive elements
- [ ] Shift+Tab moves backward through all interactive elements
- [ ] Focus indicators are visible on all focused elements
- [ ] No keyboard traps (can always navigate away)

### Skip Links
- [ ] Skip link appears on Tab (first focusable element)
- [ ] Skip link jumps to main content
- [ ] Skip link is visually hidden until focused

### Modals and Dialogs
- [ ] Focus is trapped within modal
- [ ] Tab cycles through modal elements only
- [ ] Escape closes modal
- [ ] Focus returns to trigger after closing

### Dropdowns and Menus
- [ ] Enter/Space opens dropdown
- [ ] Arrow keys navigate menu items
- [ ] Enter activates menu item
- [ ] Escape closes dropdown
- [ ] Focus returns to trigger after closing

### Forms
- [ ] Tab order matches visual order
- [ ] All form fields are keyboard accessible
- [ ] Required fields are indicated
- [ ] Error messages are announced

### Tables
- [ ] Tab navigates through table cells
- [ ] Arrow keys navigate within table
- [ ] Enter activates cell actions
- [ ] Sortable columns are keyboard accessible

---

## Common Issues and Fixes

### Issue: Element not focusable
**Solution:** Add `tabIndex={0}` or use semantic HTML (`<button>`, `<a>`)

### Issue: Focus order is illogical
**Solution:** Review tab order, use `tabIndex` sparingly to fix order

### Issue: Focus indicator not visible
**Solution:** Check CSS for `:focus-visible` styles, ensure outline is not removed

### Issue: Modal doesn't trap focus
**Solution:** Use NextUI Modal (handles this) or implement focus trap utility

### Issue: Dropdown doesn't open with keyboard
**Solution:** Ensure trigger has `aria-haspopup="true"` and keyboard handlers

---

## Testing Tools

### Automated
- **@testing-library/user-event** - Simulates keyboard interactions
- **@testing-library/react** - Renders components and queries
- **Vitest** - Test runner

### Manual
- **Keyboard only** - Disable mouse, test with Tab, Arrow keys, Enter, Escape
- **Screen readers** - Test with NVDA, JAWS, or VoiceOver
- **Browser DevTools** - Check focus order and ARIA attributes

---

## Best Practices

1. **Test with keyboard only** - Disable mouse to ensure full keyboard accessibility
2. **Test with screen readers** - Verify announcements are clear
3. **Test focus order** - Ensure logical flow matches visual order
4. **Test all interactive elements** - Buttons, links, inputs, custom components
5. **Test edge cases** - Modals, dropdowns, dynamic content

---

## Integration with CI/CD

Add keyboard navigation tests to CI/CD pipeline:

```yaml
- name: Run keyboard navigation tests
  run: |
    cd tenant_portal_app
    npm test -- keyboard-navigation --coverage
```

---

**Last Updated:** January 2025  
**Status:** Test suite created, ready for execution

