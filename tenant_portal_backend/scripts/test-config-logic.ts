/**
 * Test the exact logic used in the service to find the flaw
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { ConfigService } from '@nestjs/config';

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
    const isValid = url.protocol === 'http:' || url.protocol === 'https:';
    if (!isValid) {
      return false;
    }
    return true;
  } catch (error) {
    return false;
  }
}

console.log('\n🔍 Testing Service Logic\n');
console.log('='.repeat(60));

// Simulate what the service does
const configService = new ConfigService();
const rawBaseURL = configService.get<string>('ESIGN_PROVIDER_BASE_URL') || process.env.ESIGN_PROVIDER_BASE_URL;

console.log('\n1. Raw values:');
console.log(`   configService.get(): "${configService.get<string>('ESIGN_PROVIDER_BASE_URL')}"`);
console.log(`   process.env: "${process.env.ESIGN_PROVIDER_BASE_URL}"`);
console.log(`   Combined (configService || process.env): "${rawBaseURL}"`);
console.log(`   Type: ${typeof rawBaseURL}`);
console.log(`   Is truthy: ${!!rawBaseURL}`);

const baseURL = normalizeUrl(rawBaseURL);
console.log('\n2. After normalizeUrl():');
console.log(`   Normalized: "${baseURL}"`);
console.log(`   Is null: ${baseURL === null}`);
console.log(`   Is truthy: ${!!baseURL}`);

const isValid = isValidUrl(baseURL);
console.log('\n3. After isValidUrl():');
console.log(`   Is valid: ${isValid}`);

console.log('\n4. Final check (baseURL && isValidUrl(baseURL)):');
const finalCheck = baseURL && isValidUrl(baseURL);
console.log(`   Result: ${finalCheck}`);
console.log(`   Will create httpClient: ${finalCheck ? 'YES ✅' : 'NO ❌'}`);

if (!finalCheck) {
  console.log('\n❌ LOGIC FLAW DETECTED!');
  console.log('   The condition is failing even though:');
  console.log(`   - baseURL exists: ${!!baseURL}`);
  console.log(`   - isValidUrl returns: ${isValid}`);
  console.log(`   - Combined check: ${finalCheck}`);
  
  if (!baseURL) {
    console.log('\n   Problem: baseURL is null/empty after normalization');
  } else if (!isValid) {
    console.log('\n   Problem: isValidUrl() is returning false');
    console.log(`   URL: "${baseURL}"`);
  }
} else {
  console.log('\n✅ Logic check passes!');
}

console.log('\n' + '='.repeat(60) + '\n');

