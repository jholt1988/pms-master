/**
 * Tenant Domain Theme
 * Extends base design tokens with NextUI configuration for tenant experience
 */

import { baseColors, radius, shadows } from '../../../design-tokens';

export const tenantTheme = {
  extend: {
    colors: {
      // Map design tokens to NextUI theme colors
      primary: {
        50: baseColors.primary[50],
        100: baseColors.primary[100],
        200: baseColors.primary[200],
        300: baseColors.primary[300],
        400: baseColors.primary[400],
        500: baseColors.primary[500],
        600: baseColors.primary[600],
        700: baseColors.primary[700],
        800: baseColors.primary[800],
        900: baseColors.primary[900],
        DEFAULT: baseColors.primary[600],
        foreground: '#ffffff',
      },
      success: {
        50: baseColors.success[50],
        100: baseColors.success[100],
        200: baseColors.success[200],
        300: baseColors.success[300],
        400: baseColors.success[400],
        500: baseColors.success[500],
        600: baseColors.success[600],
        700: baseColors.success[700],
        800: baseColors.success[800],
        900: baseColors.success[900],
        DEFAULT: baseColors.success[600],
        foreground: '#ffffff',
      },
      warning: {
        50: baseColors.warning[50],
        100: baseColors.warning[100],
        200: baseColors.warning[200],
        300: baseColors.warning[300],
        400: baseColors.warning[400],
        500: baseColors.warning[500],
        600: baseColors.warning[600],
        700: baseColors.warning[700],
        800: baseColors.warning[800],
        900: baseColors.warning[900],
        DEFAULT: baseColors.warning[600],
        foreground: '#ffffff',
      },
      danger: {
        50: baseColors.danger[50],
        100: baseColors.danger[100],
        200: baseColors.danger[200],
        300: baseColors.danger[300],
        400: baseColors.danger[400],
        500: baseColors.danger[500],
        600: baseColors.danger[600],
        700: baseColors.danger[700],
        800: baseColors.danger[800],
        900: baseColors.danger[900],
        DEFAULT: baseColors.danger[600],
        foreground: '#ffffff',
      },
    },
    borderRadius: {
      small: radius.button,
      medium: radius.card,
      large: radius.modal,
    },
    boxShadow: {
      small: shadows.sm,
      medium: shadows.md,
      large: shadows.lg,
    },
  },
};

export type TenantTheme = typeof tenantTheme;
