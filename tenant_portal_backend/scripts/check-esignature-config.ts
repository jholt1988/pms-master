/**
 * E-Signature Configuration Checker
 * 
 * Run this script to verify your e-signature configuration:
 * npx ts-node scripts/check-esignature-config.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env file
config({ path: resolve(__dirname, '../.env') });

const requiredVars = [
  'ESIGN_PROVIDER',
  'ESIGN_PROVIDER_BASE_URL',
  'ESIGN_PROVIDER_API_KEY',
  'ESIGN_PROVIDER_ACCOUNT_ID',
  'FRONTEND_URL',
];

const optionalVars = [
  'ESIGN_PROVIDER',
];

console.log('\n🔍 E-Signature Configuration Check\n');
console.log('='.repeat(50));

let allConfigured = true;
let hasWarnings = false;

// Check required variables
console.log('\n📋 Required Configuration:');
requiredVars.forEach((varName) => {
  const value = process.env[varName];
  const isOptional = optionalVars.includes(varName);

  if (!value) {
    if (isOptional) {
      console.log(`  ⚠️  ${varName}: NOT SET (optional, defaults to DOCUSIGN)`);
      hasWarnings = true;
    } else {
      console.log(`  ❌ ${varName}: NOT SET`);
      allConfigured = false;
    }
  } else {
    // Mask sensitive values
    if (varName.includes('API_KEY') || varName.includes('SECRET')) {
      const masked = value.length > 8
        ? `${value.substring(0, 4)}...${value.substring(value.length - 4)}`
        : '***';
      console.log(`  ✅ ${varName}: ${masked}`);
    } else {
      console.log(`  ✅ ${varName}: ${value}`);
    }
  }
});

// Validate URLs
console.log('\n🔗 URL Validation:');
const baseUrl = process.env.ESIGN_PROVIDER_BASE_URL;
if (baseUrl) {
  try {
    const url = new URL(baseUrl);
    if (url.protocol === 'http:' || url.protocol === 'https:') {
      console.log(`  ✅ ESIGN_PROVIDER_BASE_URL: Valid URL (${url.protocol})`);
    } else {
      console.log(`  ❌ ESIGN_PROVIDER_BASE_URL: Invalid protocol (${url.protocol})`);
      allConfigured = false;
    }
  } catch (e) {
    console.log(`  ❌ ESIGN_PROVIDER_BASE_URL: Invalid URL format`);
    allConfigured = false;
  }
}

const frontendUrl = process.env.FRONTEND_URL;
if (frontendUrl) {
  try {
    const url = new URL(frontendUrl);
    console.log(`  ✅ FRONTEND_URL: Valid URL`);
  } catch (e) {
    console.log(`  ❌ FRONTEND_URL: Invalid URL format`);
    allConfigured = false;
  }
}

// Provider-specific checks
console.log('\n🔧 Provider Configuration:');
const provider = process.env.ESIGN_PROVIDER || 'DOCUSIGN';
console.log(`  Provider: ${provider}`);

if (provider === 'DOCUSIGN') {
  if (baseUrl && !baseUrl.includes('docusign')) {
    console.log(`  ⚠️  Warning: Base URL doesn't appear to be DocuSign`);
    hasWarnings = true;
  }
  console.log(`  Expected Base URL format: https://demo.docusign.net/restapi/v2.1 (demo)`);
  console.log(`  OR: https://www.docusign.net/restapi/v2.1 (production)`);

  // Check for JWT credentials
  const userId = process.env.ESIGN_PROVIDER_USER_ID;
  const privateKey = process.env.ESIGN_PROVIDER_PRIVATE_KEY;

  if (!userId) {
    console.log(`  ⚠️  ESIGN_PROVIDER_USER_ID: NOT SET (Required for JWT Auth)`);
    hasWarnings = true;
  } else {
    console.log(`  ✅ ESIGN_PROVIDER_USER_ID: ${userId}`);
  }

  if (!privateKey) {
    console.log(`  ⚠️  ESIGN_PROVIDER_PRIVATE_KEY: NOT SET (Required for JWT Auth)`);
    hasWarnings = true;
  } else {
    console.log(`  ✅ ESIGN_PROVIDER_PRIVATE_KEY: SET (masked)`);
    if (!privateKey.includes('BEGIN RSA PRIVATE KEY')) {
      console.log(`     ⚠️  Warning: Private key format looks incorrect. Should start with "-----BEGIN RSA PRIVATE KEY-----"`);
    }
  }
} else if (provider === 'HELLOSIGN') {
  if (baseUrl && !baseUrl.includes('hellosign')) {
    console.log(`  ⚠️  Warning: Base URL doesn't appear to be HelloSign`);
    hasWarnings = true;
  }
  console.log(`  Expected Base URL format: https://api.hellosign.com/v3`);
}

// Summary
console.log('\n' + '='.repeat(50));
if (allConfigured) {
  console.log('✅ Configuration looks good!');
  if (hasWarnings) {
    console.log('⚠️  Some optional settings are missing, but core configuration is complete.');
  }
  console.log('\n💡 Next steps:');
  console.log('  1. Restart your backend server');
  console.log('  2. Test creating an envelope');
  console.log('  3. Check backend logs for any API errors');
} else {
  console.log('❌ Configuration incomplete!');
  console.log('\n📝 Please set the missing environment variables in your .env file.');
  console.log('   See docs/setup/esignature-configuration.md for details.');
}
console.log('='.repeat(50) + '\n');

process.exit(allConfigured ? 0 : 1);

