/**
 * P0-002: Color Contrast Validation Utility
 * Validates color contrast ratios for WCAG 2.1 compliance
 * Target: 4.5:1 for normal text, 3:1 for large text
 */

/**
 * Convert hex color to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * Calculate relative luminance
 * Based on WCAG 2.1 formula: https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html
 */
function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((val) => {
    val = val / 255;
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculate contrast ratio between two colors
 */
export function getContrastRatio(color1: string, color2: string): number | null {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);

  if (!rgb1 || !rgb2) return null;

  const lum1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
  const lum2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);

  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if contrast ratio meets WCAG requirements
 */
export function meetsWCAGAA(
  foreground: string,
  background: string,
  isLargeText = false
): boolean {
  const ratio = getContrastRatio(foreground, background);
  if (!ratio) return false;

  // WCAG 2.1 Level AA:
  // - Normal text: 4.5:1
  // - Large text (18pt+ or 14pt+ bold): 3:1
  const requiredRatio = isLargeText ? 3 : 4.5;
  return ratio >= requiredRatio;
}

/**
 * Check if contrast ratio meets WCAG AAA requirements
 */
export function meetsWCAGAAA(
  foreground: string,
  background: string,
  isLargeText = false
): boolean {
  const ratio = getContrastRatio(foreground, background);
  if (!ratio) return false;

  // WCAG 2.1 Level AAA:
  // - Normal text: 7:1
  // - Large text: 4.5:1
  const requiredRatio = isLargeText ? 4.5 : 7;
  return ratio >= requiredRatio;
}

/**
 * Get contrast ratio rating
 */
export function getContrastRating(
  foreground: string,
  background: string
): 'pass-aaa' | 'pass-aa' | 'fail' | 'error' {
  const ratio = getContrastRatio(foreground, background);
  if (!ratio) return 'error';

  if (ratio >= 7) return 'pass-aaa';
  if (ratio >= 4.5) return 'pass-aa';
  return 'fail';
}

/**
 * Validate color pair and return detailed result
 */
export interface ContrastResult {
  ratio: number | null;
  passesAA: boolean;
  passesAAA: boolean;
  passesAALarge: boolean;
  passesAAALarge: boolean;
  rating: 'pass-aaa' | 'pass-aa' | 'fail' | 'error';
  recommendation?: string;
}

export function validateContrast(
  foreground: string,
  background: string
): ContrastResult {
  const ratio = getContrastRatio(foreground, background);
  const passesAA = meetsWCAGAA(foreground, background, false);
  const passesAAA = meetsWCAGAAA(foreground, background, false);
  const passesAALarge = meetsWCAGAA(foreground, background, true);
  const passesAAALarge = meetsWCAGAAA(foreground, background, true);
  const rating = getContrastRating(foreground, background);

  let recommendation: string | undefined;
  if (!passesAA) {
    recommendation = `Contrast ratio ${ratio?.toFixed(2)}:1 is below WCAG AA standard (4.5:1). Consider using a darker foreground or lighter background.`;
  } else if (!passesAAA) {
    recommendation = `Contrast ratio ${ratio?.toFixed(2)}:1 meets AA but not AAA (7:1). Consider improving for better accessibility.`;
  }

  return {
    ratio,
    passesAA,
    passesAAA,
    passesAALarge,
    passesAAALarge,
    rating,
    recommendation,
  };
}

/**
 * Common color pairs to validate (from design tokens)
 */
export const COMMON_COLOR_PAIRS = [
  { foreground: '#ffffff', background: '#0a0a0a', name: 'White on Deep Black' },
  { foreground: '#00f0ff', background: '#0a0a0a', name: 'Neon Blue on Deep Black' },
  { foreground: '#ffffff', background: '#1a1a1a', name: 'White on Dark Gray' },
  { foreground: '#9ca3af', background: '#0a0a0a', name: 'Gray on Deep Black' },
];

/**
 * Validate all common color pairs
 */
export function validateCommonColors(): Array<ContrastResult & { name: string }> {
  return COMMON_COLOR_PAIRS.map((pair) => ({
    ...validateContrast(pair.foreground, pair.background),
    name: pair.name,
  }));
}

