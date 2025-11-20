/**
 * Design Tokens: Shadows
 * Elevation system for depth and hierarchy
 */

export const shadows = {
  none: 'none',
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
} as const;

/**
 * Semantic shadow mappings for components
 */
export const elevation = {
  card: shadows.md,
  cardHover: shadows.lg,
  modal: shadows.xl,
  dropdown: shadows.lg,
  navbar: shadows.sm,
  button: shadows.sm,
  buttonHover: shadows.md,
  input: shadows.sm,
  inputFocus: shadows.md,
} as const;

export type Shadows = typeof shadows;
export type Elevation = typeof elevation;
