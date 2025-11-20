/**
 * Design Tokens: Transitions & Animations
 */

export const transitions = {
  // Duration
  duration: {
    fast: '150ms',
    normal: '250ms',
    slow: '350ms',
  },
  
  // Easing functions
  easing: {
    default: 'cubic-bezier(0.4, 0, 0.2, 1)',
    linear: 'linear',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
} as const;

/**
 * Common transition combinations
 */
export const transition = {
  default: `all ${transitions.duration.normal} ${transitions.easing.default}`,
  fast: `all ${transitions.duration.fast} ${transitions.easing.default}`,
  slow: `all ${transitions.duration.slow} ${transitions.easing.default}`,
  
  // Property-specific
  colors: `color ${transitions.duration.normal} ${transitions.easing.default}, background-color ${transitions.duration.normal} ${transitions.easing.default}, border-color ${transitions.duration.normal} ${transitions.easing.default}`,
  transform: `transform ${transitions.duration.normal} ${transitions.easing.default}`,
  opacity: `opacity ${transitions.duration.normal} ${transitions.easing.default}`,
  shadow: `box-shadow ${transitions.duration.normal} ${transitions.easing.default}`,
} as const;

export type Transitions = typeof transitions;
export type Transition = typeof transition;
