#!/usr/bin/env node

/**
 * P0-002: Color Contrast Validation Script
 * Validates color contrast ratios for WCAG 2.1 compliance
 * 
 * Usage: node scripts/validate-color-contrast.js
 * 
 * Note: This script uses inline color contrast calculation
 * since it runs in Node.js without TypeScript compilation
 */

// Color contrast calculation functions (inline for Node.js)
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

function getLuminance(r, g, b) {
  const [rs, gs, bs] = [r, g, b].map((val) => {
    val = val / 255;
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function getContrastRatio(color1, color2) {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  if (!rgb1 || !rgb2) return null;
  const lum1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
  const lum2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
}

function meetsWCAGAA(foreground, background, isLargeText = false) {
  const ratio = getContrastRatio(foreground, background);
  if (!ratio) return false;
  const requiredRatio = isLargeText ? 3 : 4.5;
  return ratio >= requiredRatio;
}

function validateContrast(foreground, background) {
  const ratio = getContrastRatio(foreground, background);
  const passesAA = meetsWCAGAA(foreground, background, false);
  const passesAALarge = meetsWCAGAA(foreground, background, true);
  const rating = ratio >= 7 ? 'pass-aaa' : ratio >= 4.5 ? 'pass-aa' : 'fail';
  
  let recommendation;
  if (!passesAA) {
    recommendation = `Contrast ratio ${ratio?.toFixed(2)}:1 is below WCAG AA standard (4.5:1). Consider using a darker foreground or lighter background.`;
  }
  
  return {
    ratio,
    passesAA,
    passesAALarge,
    rating,
    recommendation,
  };
}

// Common color pairs used in the application
const colorPairs = [
  // Text on backgrounds
  { foreground: '#ffffff', background: '#030712', name: 'White text on body background', isLarge: false },
  { foreground: '#ffffff', background: '#0a0a0a', name: 'White text on deep black', isLarge: false },
  { foreground: '#9ca3af', background: '#030712', name: 'Gray text on body background', isLarge: false },
  { foreground: '#9ca3af', background: '#0a0a0a', name: 'Gray text on deep black', isLarge: false },
  
  // Neon colors
  { foreground: '#00f0ff', background: '#0a0a0a', name: 'Neon blue on deep black', isLarge: false },
  { foreground: '#00f0ff', background: '#030712', name: 'Neon blue on body background', isLarge: false },
  
  // Primary colors
  { foreground: '#3B82F6', background: '#030712', name: 'Primary blue on body background', isLarge: false },
  { foreground: '#3B82F6', background: '#ffffff', name: 'Primary blue on white', isLarge: false },
  
  // Focus indicators
  { foreground: '#3B82F6', background: '#030712', name: 'Focus indicator on body background', isLarge: false },
  
  // Large text variants
  { foreground: '#ffffff', background: '#030712', name: 'White text on body (large)', isLarge: true },
  { foreground: '#9ca3af', background: '#030712', name: 'Gray text on body (large)', isLarge: true },
  { foreground: '#00f0ff', background: '#0a0a0a', name: 'Neon blue on deep black (large)', isLarge: true },
];

console.log('🎨 Color Contrast Validation\n');
console.log('Validating color pairs for WCAG 2.1 compliance...\n');

let passCount = 0;
let failCount = 0;
const failures = [];

colorPairs.forEach((pair) => {
  const result = validateContrast(pair.foreground, pair.background);
  const passes = pair.isLarge ? result.passesAALarge : result.passesAA;
  const required = pair.isLarge ? '3:1 (Large Text)' : '4.5:1 (Normal Text)';
  
  if (passes) {
    passCount++;
    console.log(`✅ ${pair.name}`);
    console.log(`   Ratio: ${result.ratio?.toFixed(2)}:1 | Required: ${required} | Status: PASS\n`);
  } else {
    failCount++;
    failures.push({ ...pair, result });
    console.log(`❌ ${pair.name}`);
    console.log(`   Ratio: ${result.ratio?.toFixed(2)}:1 | Required: ${required} | Status: FAIL`);
    if (result.recommendation) {
      console.log(`   ${result.recommendation}\n`);
    }
  }
});

console.log('\n' + '='.repeat(60));
console.log(`Summary: ${passCount} passed, ${failCount} failed\n`);

if (failures.length > 0) {
  console.log('⚠️  Failures detected. Please update colors to meet WCAG 2.1 AA standards.\n');
  console.log('Failed color pairs:');
  failures.forEach((failure) => {
    console.log(`  - ${failure.name}: ${failure.result.ratio?.toFixed(2)}:1`);
  });
  console.log('');
  process.exit(1);
} else {
  console.log('✅ All color pairs meet WCAG 2.1 AA standards!\n');
  process.exit(0);
}

