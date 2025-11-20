/**
 * Design Tokens: Colors
 * Base color system shared across all domains
 * Each domain can create semantic mappings from these base colors
 */

export const baseColors = {
  // Primary palette
  primary: {
    50: '#EFF6FF',
    100: '#DBEAFE',
    200: '#BFDBFE',
    300: '#93C5FD',
    400: '#60A5FA',
    500: '#3B82F6', // Main primary
    600: '#2563EB',
    700: '#1D4ED8',
    800: '#1E40AF',
    900: '#1E3A8A',
  },
  
  // Success palette
  success: {
    50: '#F0FDF4',
    100: '#DCFCE7',
    200: '#BBF7D0',
    300: '#86EFAC',
    400: '#4ADE80',
    500: '#22C55E', // Main success
    600: '#16A34A',
    700: '#15803D',
    800: '#166534',
    900: '#14532D',
  },
  
  // Warning palette
  warning: {
    50: '#FFFBEB',
    100: '#FEF3C7',
    200: '#FDE68A',
    300: '#FCD34D',
    400: '#FBBF24',
    500: '#F59E0B', // Main warning
    600: '#D97706',
    700: '#B45309',
    800: '#92400E',
    900: '#78350F',
  },
  
  // Danger/Error palette
  danger: {
    50: '#FEF2F2',
    100: '#FEE2E2',
    200: '#FECACA',
    300: '#FCA5A5',
    400: '#F87171',
    500: '#EF4444', // Main danger
    600: '#DC2626',
    700: '#B91C1C',
    800: '#991B1B',
    900: '#7F1D1D',
  },
  
  // Neutral palette
  neutral: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
    950: '#030712',
  },
  
  // Semantic colors
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
} as const;

/**
 * Semantic color mappings
 * Use these for specific UI purposes
 */
export const semanticColors = {
  background: {
    primary: baseColors.white,
    secondary: baseColors.neutral[50],
    tertiary: baseColors.neutral[100],
  },
  
  foreground: {
    primary: baseColors.neutral[900],
    secondary: baseColors.neutral[700],
    tertiary: baseColors.neutral[500],
  },
  
  border: {
    default: baseColors.neutral[200],
    light: baseColors.neutral[100],
    medium: baseColors.neutral[300],
  },
  
  status: {
    pending: baseColors.warning[500],
    inProgress: baseColors.primary[500],
    completed: baseColors.success[500],
    cancelled: baseColors.neutral[400],
  },
} as const;

export type BaseColor = typeof baseColors;
export type SemanticColor = typeof semanticColors;
