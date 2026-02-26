# PMS Mobile Portals - Design System

## Color Palette

### Primary Theme (Professional Navy + Coral Accent)
```css
:root {
  /* Core colors */
  --primary: oklch(0.35 0.08 260);           /* Deep navy */
  --primary-foreground: oklch(0.985 0 0);    /* White */
  --accent: oklch(0.65 0.18 25);             /* Coral/salmon */
  --accent-foreground: oklch(0.985 0 0);
  
  /* Backgrounds */
  --background: oklch(0.98 0.01 260);        /* Subtle off-white blue tint */
  --surface: oklch(1 0 0);                    /* Pure white cards */
  --surface-elevated: oklch(0.99 0.005 260);
  
  /* Text */
  --foreground: oklch(0.15 0.02 260);        /* Near black */
  --muted-foreground: oklch(0.55 0.03 260);  /* Gray text */
  
  /* Semantic */
  --success: oklch(0.65 0.15 145);           /* Green */
  --warning: oklch(0.75 0.12 85);            /* Amber */
  --error: oklch(0.55 0.18 25);              /* Red */
  --info: oklch(0.65 0.1 240);               /* Blue */
  
  /* UI */
  --border: oklch(0.9 0.02 260);
  --separator: oklch(0.92 0.01 260);
  --radius: 1rem;
  --radius-sm: 0.75rem;
  --radius-xs: 0.5rem;
  
  /* Typography */
  --font-sans: Inter, system-ui, -apple-system, sans-serif;
  --font-medium: 500;
  --font-semibold: 600;
  --font-bold: 700;
}
```

## Layout Structure

### Mobile First (375px base)
```
┌─────────────────────────┐  ← Status Bar (safe area)
│  [Icon]  Title    🔔  │  ← Header (56px)
├─────────────────────────┤
│                         │
│     SCROLLABLE          │
│       CONTENT           │
│    (padding: 16px)      │
│                         │
├─────────────────────────┤
│  🏠  📋  💬  👤        │  ← Bottom Nav (64px)
└─────────────────────────┘  ← Home Indicator (safe area)
```

### Spacing Scale
- xs: 4px (0.25rem)
- sm: 8px (0.5rem)
- md: 16px (1rem)
- lg: 24px (1.5rem)
- xl: 32px (2rem)

## Component Patterns

### Cards
- Background: var(--surface)
- Border-radius: var(--radius) / 16px
- Padding: 16px
- Shadow: 0 1px 3px rgba(0,0,0,0.04)
- Border: 1px solid var(--border) / optional

### Buttons
**Primary:**
- Background: var(--primary)
- Text: var(--primary-foreground)
- Padding: 14px 24px
- Border-radius: 12px
- Font-weight: 600

**Secondary:**
- Background: transparent
- Border: 1.5px solid var(--border)
- Text: var(--foreground)

**Floating Action Button:**
- Size: 56px
- Background: var(--accent)
- Shadow: 0 4px 12px rgba(0,0,0,0.15)
- Icon: white, 24px

### Lists
- Row height: 56px minimum (touch target)
- Separator: 1px solid var(--separator)
- Left icon: 24px, muted color
- Chevron right for navigation

### Forms
- Input height: 52px
- Border-radius: 12px
- Border: 1.5px solid var(--border)
- Focus: var(--primary) border
- Label: 14px, var(--muted-foreground), above input

## Animations

### Micro-interactions
```
tap-highlight: 100ms [opacity 0.8→1]
card-press: 150ms [scale 1→0.98→1]
button-press: 100ms [scale 1→0.96→1]
row-slide: 300ms [X -20→0, opacity 0→1]
page-slide: 350ms [X 100%→0]
bottom-sheet: 400ms [Y 100%→0] spring
```

### Entry Animations
```
fade-up: 400ms ease-out [Y 20→0, opacity 0→1]
stagger: 50ms delay per item
```

## Icon System
- Library: Lucide Icons
- Size default: 24px
- Size small: 20px
- Size large: 28px
- Stroke width: 1.5px
