
import { config } from 'dotenv';
import { resolve } from 'path';
import * as fs from 'fs';

// Load .env file
config({ path: resolve(__dirname, '../.env') });

const logFile = resolve(__dirname, '../diagnosis.txt');
fs.writeFileSync(logFile, 'Diagnostic Report\n================\n');

function log(message: string) {
    fs.appendFileSync(logFile, message + '\n');
}

function normalizeUrl(urlString: string | undefined | null): string | null {
    if (!urlString) return null;
    let normalized = String(urlString).trim();
    normalized = normalized.replace(/^['"]+|['"]+$/g, '');
    return normalized.trim().length > 0 ? normalized.trim() : null;
}

function isValidUrl(urlString: string | null | undefined): boolean {
    if (!urlString) return false;
    try {
        const url = new URL(urlString);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (error) {
        return false;
    }
}

log('\n🔍 E-Signature Configuration Diagnostic\n');

// Check process.env directly
const envValue = process.env.ESIGN_PROVIDER_BASE_URL;
log(`\n📋 Raw Environment Variable:`);
log(`   process.env.ESIGN_PROVIDER_BASE_URL: "${envValue}"`);

// Normalize
const normalized = normalizeUrl(envValue);
log(`\n🔧 After Normalization:`);
log(`   Normalized value: "${normalized}"`);

// Validate
const isValid = isValidUrl(normalized);
log(`\n✅ Validation:`);
log(`   Is valid URL: ${isValid}`);

if (normalized && !isValid) {
    try {
        const url = new URL(normalized);
        log(`   Protocol: ${url.protocol}`);
    } catch (error) {
        log(`   Error creating URL: ${error instanceof Error ? error.message : String(error)}`);
    }
}

// Check for correct API path
const hasCorrectPath = normalized?.includes('/restapi/v2.1') ?? false;
const isDocuSign = normalized?.includes('docusign') ?? false;

// Recommendations
log('\n💡 Recommendations:');
if (!envValue) {
    log('   ❌ ESIGN_PROVIDER_BASE_URL is not set in .env file');
} else if (!normalized) {
    log('   ❌ ESIGN_PROVIDER_BASE_URL is empty after normalization');
} else if (!isValid) {
    log('   ❌ ESIGN_PROVIDER_BASE_URL is invalid');
} else {
    if (isDocuSign && !hasCorrectPath) {
        log('   ⚠️  URL is valid but missing API version path!');
        log(`   → Current: "${normalized}"`);
        log(`   → Should be: "${normalized}/v2.1"`);
    } else {
        log('   ✅ Configuration looks correct!');
        log(`   → Using: ${normalized}`);
    }
}

// Check other vars
log('\n📋 Other Variables:');
log(`   ESIGN_PROVIDER: ${process.env.ESIGN_PROVIDER}`);
log(`   ESIGN_PROVIDER_API_KEY: ${process.env.ESIGN_PROVIDER_API_KEY ? 'SET (masked)' : 'NOT SET'}`);
log(`   ESIGN_PROVIDER_ACCOUNT_ID: ${process.env.ESIGN_PROVIDER_ACCOUNT_ID ? 'SET' : 'NOT SET'}`);
log(`   ESIGN_PROVIDER_CLIENT_ID: ${process.env.ESIGN_PROVIDER_CLIENT_ID ? 'SET' : 'NOT SET'}`);
log(`   ESIGN_PROVIDER_CLIENT_SECRET: ${process.env.ESIGN_PROVIDER_CLIENT_SECRET ? 'SET (masked)' : 'NOT SET'}`);

if (!process.env.ESIGN_PROVIDER_CLIENT_ID || !process.env.ESIGN_PROVIDER_CLIENT_SECRET) {
    log('\n⚠️  OAuth credentials missing! Token refresh will fail if the API key expires.');
}

