/**
 * E-Signature Configuration Diagnostic Script
 * 
 * Run this to see exactly what values are being read and why validation might be failing:
 * npx ts-node scripts/diagnose-esignature-config.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env file
config({ path: resolve(__dirname, '../.env') });

function normalizeUrl(urlString: string | undefined | null): string | null {
  if (!urlString) {
    return null;
  }
  
  // Convert to string and trim
  let normalized = String(urlString).trim();
  
  // Remove surrounding quotes (single or double) - handle both at start and end
  normalized = normalized.replace(/^['"]+|['"]+$/g, '');
  
  // Trim again after removing quotes
  normalized = normalized.trim();
  
  // Return null if empty string
  return normalized.length > 0 ? normalized : null;
}

function isValidUrl(urlString: string | null | undefined): boolean {
  if (!urlString) {
    return false;
  }
  
  try {
    const url = new URL(urlString);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (error) {
    return false;
  }
}

console.log('\n🔍 E-Signature Configuration Diagnostic\n');
console.log('='.repeat(60));

// Check process.env directly
const envValue = process.env.ESIGN_PROVIDER_BASE_URL;
console.log('\n📋 Raw Environment Variable:');
console.log(`   process.env.ESIGN_PROVIDER_BASE_URL: "${envValue}"`);
console.log(`   Type: ${typeof envValue}`);
console.log(`   Length: ${envValue?.length ?? 0}`);
if (envValue) {
  console.log(`   First char code: ${envValue.charCodeAt(0)}`);
  console.log(`   Last char code: ${envValue.charCodeAt(envValue.length - 1)}`);
  console.log(`   Has quotes at start: ${envValue.startsWith("'") || envValue.startsWith('"')}`);
  console.log(`   Has quotes at end: ${envValue.endsWith("'") || envValue.endsWith('"')}`);
}

// Normalize
const normalized = normalizeUrl(envValue);
console.log('\n🔧 After Normalization:');
console.log(`   Normalized value: "${normalized}"`);
console.log(`   Is null: ${normalized === null}`);
console.log(`   Is empty: ${normalized === ''}`);

// Validate
const isValid = isValidUrl(normalized);
console.log('\n✅ Validation:');
console.log(`   Is valid URL: ${isValid}`);

if (normalized && !isValid) {
  try {
    const url = new URL(normalized);
    console.log(`   Protocol: ${url.protocol}`);
    console.log(`   Host: ${url.host}`);
    console.log(`   Path: ${url.pathname}`);
  } catch (error) {
    console.log(`   Error creating URL: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Expected format
console.log('\n📝 Expected Format:');
console.log('   ✅ https://demo.docusign.net/restapi/v2.1 (Demo)');
console.log('   ✅ https://www.docusign.net/restapi/v2.1 (Production)');
console.log('   ✅ https://account-d.docusign.com/restapi/v2.1 (Account-specific)');

// Check for correct API path
const hasCorrectPath = normalized?.includes('/restapi/v2.1') ?? false;
const isDocuSign = normalized?.includes('docusign') ?? false;
const isHelloSign = normalized?.includes('hellosign') ?? false;

// Recommendations
console.log('\n💡 Recommendations:');
if (!envValue) {
  console.log('   ❌ ESIGN_PROVIDER_BASE_URL is not set in .env file');
  console.log('   → Add: ESIGN_PROVIDER_BASE_URL=https://demo.docusign.net/restapi/v2.1');
} else if (!normalized) {
  console.log('   ❌ ESIGN_PROVIDER_BASE_URL is empty after normalization');
  console.log('   → Check for hidden characters or encoding issues');
} else if (!isValid) {
  console.log('   ❌ ESIGN_PROVIDER_BASE_URL is invalid');
  if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
    console.log('   → Missing protocol! Add https:// at the beginning');
  }
  if (!normalized.includes('/restapi/v2.1')) {
    console.log('   → Missing API path! Should end with /restapi/v2.1');
  }
  console.log(`   → Current value: "${normalized}"`);
  console.log(`   → Should be: "https://demo.docusign.net/restapi/v2.1"`);
} else {
  // URL is valid, but check if it has the correct path
  if (isDocuSign && !hasCorrectPath) {
    console.log('   ⚠️  URL is valid but missing API version path!');
    console.log(`   → Current: "${normalized}"`);
    console.log(`   → Should be: "${normalized}/v2.1"`);
    console.log('   → DocuSign API requires /restapi/v2.1 at the end');
  } else if (isHelloSign && !normalized.includes('/v3')) {
    console.log('   ⚠️  URL is valid but missing API version path!');
    console.log(`   → Current: "${normalized}"`);
    console.log(`   → Should be: "${normalized}/v3"`);
    console.log('   → HelloSign API requires /v3 at the end');
  } else {
    console.log('   ✅ Configuration looks correct!');
    console.log(`   → Using: ${normalized}`);
  }
}

console.log('\n' + '='.repeat(60) + '\n');

