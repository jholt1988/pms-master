/**
 * Design Tokens: Spacing
 * Based on 4px base unit
 */

export const spacing = {
  // Literal values (for rare direct use)
  0: '0px',
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  8: '32px',
  10: '40px',
  12: '48px',
  16: '64px',
  20: '80px',
  24: '96px',
  32: '128px',
  
  // Semantic spacing (preferred)
  none: '0px',
  xxs: '4px',
  xs: '8px',
  sm: '12px',
  md: '16px',
  lg: '24px',
  xl: '32px',
  '2xl': '48px',
  '3xl': '64px',
  '4xl': '96px',
  
  // Layout spacing
  pageGutter: '24px',
  sectionGap: '32px',
  cardPadding: '16px',
  componentGap: '12px',
} as const;

/**
 * Responsive spacing multipliers
 * Apply to base spacing for different breakpoints
 */
export const spacingScale = {
  mobile: 0.75,  // 75% of base
  tablet: 1,     // 100% of base
  desktop: 1.25, // 125% of base
} as const;

export type Spacing = typeof spacing;
