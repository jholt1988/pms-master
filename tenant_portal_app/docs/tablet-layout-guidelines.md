# Tablet Layout Guidelines

This document outlines the design principles and guidelines for creating a consistent and user-friendly tablet experience for the admin/property manager portal.

## 1. Viewport Categories and Breakpoints

We will use Tailwind's default breakpoints to define our viewport categories:

- **Mobile:** `< 768px` (below `md`)
- **Tablet Portrait:** `768px` to `1024px` (`md` to `lg`)
- **Tablet Landscape:** `1024px` to `1280px` (`lg` to `xl`)
- **Desktop:** `>= 1280px` (`xl` and above)

## 2. Master-Detail Layouts

The master-detail pattern is central to our tablet strategy, especially for core workflows like property, lease, and inspection management.

- **Desktop (`>= lg`):**
  - A two-pane layout is standard. The master view (list/table) appears on the left, and the detail view appears on the right.
  - The master pane should occupy roughly 30-40% of the width, and the detail pane should occupy the remaining 60-70%.

- **Tablet Landscape (`lg` to `xl`):**
  - A two-pane layout is also used, similar to the desktop.
  - The master pane may be slightly narrower to give more space to the detail view.
  - Ensure no horizontal scrolling is introduced at this breakpoint.

- **Tablet Portrait (`md` to `lg`):**
  - The layout should stack to a single pane.
  - By default, only the master view (list) is visible.
  - When an item in the master list is selected, the view should transition to a full-screen detail view.
  - The detail view must include a clear and easily accessible "Back" button to return to the master list.

## 3. Touch-First Design

All interactive elements must be designed with touch as the primary input method.

- **Minimum Tap Target:** All buttons, links, and other interactive elements must have a minimum tap target size of **44x44 pixels**. This can be achieved through padding and sizing.
- **Spacing:** Ensure generous spacing between interactive elements to prevent accidental taps.
- **Hover States:** Do not rely on hover states to reveal critical information. All essential information should be visible by default. Hover can be used for supplementary visual feedback on devices that support it.

## 4. Data Tables

Data tables are a common source of poor tablet UX. Follow these guidelines to ensure they are usable:

- **Reduced Columns:** On tablet viewports, reduce the number of columns to the most essential information. Prioritize information that is critical for decision-making in the field.
- **Card-Based Layouts:** For very dense tables, consider switching to a card-based layout on tablet portrait. Each card can represent a row and display the information in a more readable format.
- **Horizontal Scrolling:** Avoid horizontal scrolling on the main page. If a table must have more columns than can fit, the table itself can be horizontally scrollable, but the rest of the page should remain fixed.

## 5. Forms

Forms must be easy to fill out on a tablet.

- **Single-Column Layout:** All forms should use a single-column layout on tablet viewports.
- **Generous Spacing:** Ensure ample spacing between form fields, labels, and buttons.
- **Large Input Fields:** Input fields should be large and easy to tap.
- **Full-Width Buttons:** Form submission buttons should be full-width or at least large enough to be easily tapped.
