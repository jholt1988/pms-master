/**
 * Design Tokens: Breakpoints
 * Responsive design breakpoints
 */

export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

/**
 * Breakpoint values as numbers (for programmatic use)
 */
export const breakpointValues = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

/**
 * Media query helpers
 */
export const mediaQueries = {
  sm: `@media (min-width: ${breakpoints.sm})`,
  md: `@media (min-width: ${breakpoints.md})`,
  lg: `@media (min-width: ${breakpoints.lg})`,
  xl: `@media (min-width: ${breakpoints.xl})`,
  '2xl': `@media (min-width: ${breakpoints['2xl']})`,
  
  // Max-width queries
  maxSm: `@media (max-width: ${breakpointValues.sm - 1}px)`,
  maxMd: `@media (max-width: ${breakpointValues.md - 1}px)`,
  maxLg: `@media (max-width: ${breakpointValues.lg - 1}px)`,
  maxXl: `@media (max-width: ${breakpointValues.xl - 1}px)`,
  max2xl: `@media (max-width: ${breakpointValues['2xl'] - 1}px)`,
} as const;

export type Breakpoints = typeof breakpoints;
export type BreakpointValues = typeof breakpointValues;
export type MediaQueries = typeof mediaQueries;
