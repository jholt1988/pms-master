/**
 * Design Tokens: Border Radius
 */

export const borderRadius = {
  none: '0px',
  sm: '6px',
  md: '12px',
  lg: '16px',
  xl: '24px',
  '2xl': '32px',
  full: '9999px',
} as const;

/**
 * Semantic radius mappings
 */
export const radius = {
  button: borderRadius.md,
  card: borderRadius.lg,
  input: borderRadius.md,
  badge: borderRadius.full,
  modal: borderRadius.xl,
  avatar: borderRadius.full,
} as const;

export type BorderRadius = typeof borderRadius;
export type Radius = typeof radius;
