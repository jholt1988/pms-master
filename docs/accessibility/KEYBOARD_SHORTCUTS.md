# Keyboard Shortcuts and Navigation Guide

**P0-002/P0-003: Keyboard Navigation Documentation**

This document outlines all keyboard shortcuts and navigation patterns available in the application.

**Last Updated:** January 2025

---

## Global Navigation

### Basic Navigation
- **Tab** - Move forward through interactive elements
- **Shift + Tab** - Move backward through interactive elements
- **Enter / Space** - Activate buttons and links
- **Escape** - Close modals, dialogs, and dropdowns
- **Arrow Keys** - Navigate within components (lists, tables, menus)

### Skip Links
- **Tab** (on page load) - Access "Skip to main content" link
- Press **Enter** to jump directly to main content, bypassing navigation

---

## Page-Specific Shortcuts

### Dashboard
- **Tab** - Navigate through cards and widgets
- **Enter** - Open/view card details
- **Arrow Keys** - Navigate between dashboard cards (when focused)

### Data Tables
- **Tab** - Move between table cells and controls
- **Arrow Keys** - Navigate between cells (when table is focused)
- **Enter** - Activate cell action or edit mode
- **Space** - Select row (if selection enabled)
- **Home/End** - Jump to first/last cell in row
- **Page Up/Page Down** - Scroll table viewport

### Forms
- **Tab** - Move between form fields
- **Shift + Tab** - Move backward through form fields
- **Enter** - Submit form (if on submit button)
- **Escape** - Cancel form or close form modal
- **Arrow Keys** - Navigate within select dropdowns and radio groups

### Modals and Dialogs
- **Tab** - Navigate within modal (focus is trapped)
- **Shift + Tab** - Navigate backward within modal
- **Escape** - Close modal
- **Enter** - Activate primary action button

### Navigation Menu
- **Tab** - Navigate through menu items
- **Enter / Space** - Activate menu item
- **Arrow Keys** - Navigate between menu items (when menu is focused)
- **Escape** - Close menu/dropdown

---

## Component-Specific Navigation

### Dock Navigation (Bottom Navigation)
- **Tab** - Navigate between dock items
- **Arrow Left/Right** - Navigate between dock items
- **Enter / Space** - Activate dock item
- **Home** - Jump to first dock item
- **End** - Jump to last dock item

### Search Input
- **Tab** - Focus search input
- **Enter** - Submit search
- **Escape** - Clear search and remove focus
- **Arrow Down** - Open search suggestions (if available)
- **Arrow Up/Down** - Navigate suggestions
- **Enter** - Select suggestion

### Dropdown Menus
- **Tab** - Open dropdown (when on trigger)
- **Arrow Down** - Open dropdown and move to first item
- **Arrow Up/Down** - Navigate menu items
- **Enter / Space** - Select menu item
- **Escape** - Close dropdown
- **Home** - Jump to first menu item
- **End** - Jump to last menu item

### Tabs
- **Tab** - Focus tab panel
- **Arrow Left/Right** - Navigate between tabs
- **Enter / Space** - Activate tab
- **Home** - Jump to first tab
- **End** - Jump to last tab

---

## Accessibility Features

### Focus Indicators
All interactive elements have visible focus indicators:
- **2px solid blue outline** on focus
- **2px offset** from element edge
- **4px border radius** for rounded corners

### Focus Management
- **Modals:** Focus is trapped within modal when open
- **Dropdowns:** Focus returns to trigger when closed
- **Navigation:** Focus moves logically through page structure
- **Skip Links:** Allow bypassing repetitive navigation

### ARIA Support
- All interactive elements have appropriate ARIA labels
- Screen readers announce element roles and states
- Form fields are properly labeled
- Error messages are announced via aria-live regions

---

## Browser-Specific Notes

### Chrome/Edge
- Full keyboard navigation support
- Screen reader: NVDA (Windows), VoiceOver (macOS)

### Firefox
- Full keyboard navigation support
- Screen reader: NVDA (Windows), VoiceOver (macOS)

### Safari
- Full keyboard navigation support
- Screen reader: VoiceOver (macOS/iOS)

---

## Testing Keyboard Navigation

### Manual Testing Checklist
- [ ] All interactive elements are reachable via Tab
- [ ] Focus order is logical and intuitive
- [ ] Focus indicators are visible on all elements
- [ ] Modals trap focus correctly
- [ ] Escape key closes modals and dropdowns
- [ ] Enter/Space activate buttons and links
- [ ] Arrow keys work in appropriate components
- [ ] Skip link is accessible and functional
- [ ] No keyboard traps (can navigate away from all areas)

### Automated Testing
- Use axe DevTools to check keyboard accessibility
- Test with keyboard-only navigation (no mouse)
- Verify focus management in modals
- Check tab order matches visual order

---

## Best Practices

### For Developers
1. **Always use semantic HTML** - buttons for actions, links for navigation
2. **Ensure tab order is logical** - matches visual flow
3. **Provide visible focus indicators** - don't remove outline without replacement
4. **Test with keyboard only** - disable mouse during testing
5. **Use ARIA labels** - for icon-only buttons and complex components
6. **Implement focus trapping** - in modals and dropdowns
7. **Return focus** - to trigger element when closing modals

### For Users
1. **Use Tab to navigate** - through all interactive elements
2. **Use Skip Links** - to bypass repetitive navigation
3. **Use Escape** - to close modals and cancel actions
4. **Use Arrow Keys** - within lists, tables, and menus
5. **Report issues** - if keyboard navigation doesn't work as expected

---

## Common Issues and Solutions

### Issue: Can't navigate to element
**Solution:** Check if element has `tabindex` attribute. Ensure it's not set to `-1` unless element should be skipped.

### Issue: Focus jumps unexpectedly
**Solution:** Check for focus management code that might be interfering. Verify tab order matches visual order.

### Issue: Modal doesn't trap focus
**Solution:** Ensure modal uses focus trap utility or NextUI Modal component (which handles this automatically).

### Issue: Skip link not visible
**Solution:** Skip link is hidden by default, appears on focus. Press Tab on page load to see it.

---

## Resources

- [WCAG 2.1 Keyboard Accessible](https://www.w3.org/WAI/WCAG21/Understanding/keyboard.html)
- [ARIA Authoring Practices - Keyboard Navigation](https://www.w3.org/WAI/ARIA/apg/patterns/)
- [WebAIM Keyboard Accessibility](https://webaim.org/techniques/keyboard/)

---

**Last Updated:** January 2025  
**Status:** Complete

