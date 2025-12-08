#!/usr/bin/env node

/**
 * P0-002/P0-003: Accessibility Validation Script
 * Validates color contrast and checks for common accessibility issues
 */

const fs = require('fs');
const path = require('path');

// Color contrast utility (simplified version)
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

// Common color pairs to validate
const COLOR_PAIRS = [
  { foreground: '#ffffff', background: '#0a0a0a', name: 'White on Deep Black' },
  { foreground: '#00f0ff', background: '#0a0a0a', name: 'Neon Blue on Deep Black' },
  { foreground: '#ffffff', background: '#1a1a1a', name: 'White on Dark Gray' },
  { foreground: '#9ca3af', background: '#0a0a0a', name: 'Gray on Deep Black' },
  { foreground: '#ffffff', background: '#000000', name: 'White on Black' },
];

// Check for common accessibility issues in files
function checkFileAccessibility(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const issues = [];

  // Check for images without alt
  const imgWithoutAlt = /<img[^>]*(?!alt=)[^>]*>/gi;
  const matches = content.match(imgWithoutAlt);
  if (matches) {
    issues.push({
      type: 'missing-alt',
      count: matches.length,
      message: `Found ${matches.length} image(s) without alt attribute`,
    });
  }

  // Check for buttons without aria-label (when no visible text)
  const buttonWithoutLabel = /<button[^>]*(?!aria-label)[^>]*>\s*<\/button>/gi;
  const buttonMatches = content.match(buttonWithoutLabel);
  if (buttonMatches) {
    issues.push({
      type: 'button-without-label',
      count: buttonMatches.length,
      message: `Found ${buttonMatches.length} button(s) without aria-label`,
    });
  }

  // Check for inputs without labels
  const inputWithoutLabel = /<input[^>]*(?!aria-label)(?!aria-labelledby)[^>]*>/gi;
  const inputMatches = content.match(inputWithoutLabel);
  if (inputMatches && !content.includes('label') && !content.includes('Label')) {
    issues.push({
      type: 'input-without-label',
      count: inputMatches.length,
      message: `Found ${inputMatches.length} input(s) without label or aria-label`,
    });
  }

  return issues;
}

// Main validation
function main() {
  console.log('🔍 Running Accessibility Validation...\n');

  // Validate color contrast
  console.log('📊 Color Contrast Validation:');
  console.log('─'.repeat(50));
  let contrastIssues = 0;

  COLOR_PAIRS.forEach((pair) => {
    const ratio = getContrastRatio(pair.foreground, pair.background);
    if (!ratio) {
      console.log(`❌ ${pair.name}: Invalid color format`);
      contrastIssues++;
      return;
    }

    const passesAA = ratio >= 4.5;
    const passesAALarge = ratio >= 3;
    const status = passesAA ? '✅' : passesAALarge ? '⚠️' : '❌';
    const rating = passesAA ? 'PASS (AA)' : passesAALarge ? 'PASS (AA Large)' : 'FAIL';

    console.log(`${status} ${pair.name}: ${ratio.toFixed(2)}:1 - ${rating}`);
    if (!passesAA && !passesAALarge) {
      contrastIssues++;
    }
  });

  console.log('\n');

  // Check component files
  console.log('🔍 Component Accessibility Check:');
  console.log('─'.repeat(50));

  const componentDir = path.join(__dirname, '../tenant_portal_app/src/components');
  let totalIssues = 0;

  function checkDirectory(dir) {
    const files = fs.readdirSync(dir);
    files.forEach((file) => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        checkDirectory(filePath);
      } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        const issues = checkFileAccessibility(filePath);
        if (issues.length > 0) {
          const relativePath = path.relative(componentDir, filePath);
          console.log(`\n📄 ${relativePath}:`);
          issues.forEach((issue) => {
            console.log(`   ⚠️  ${issue.message}`);
            totalIssues += issue.count;
          });
        }
      }
    });
  }

  if (fs.existsSync(componentDir)) {
    checkDirectory(componentDir);
  } else {
    console.log('⚠️  Component directory not found');
  }

  // Summary
  console.log('\n' + '═'.repeat(50));
  console.log('📋 Summary:');
  console.log('─'.repeat(50));
  console.log(`Color Contrast Issues: ${contrastIssues}`);
  console.log(`Component Issues: ${totalIssues}`);
  console.log(`Total Issues: ${contrastIssues + totalIssues}`);

  if (contrastIssues === 0 && totalIssues === 0) {
    console.log('\n✅ All accessibility checks passed!');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some accessibility issues found. Please review and fix.');
    process.exit(1);
  }
}

main();

