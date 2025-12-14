
import { PrismaClient } from '@prisma/client';
import * as docusign from 'docusign-esign';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
const envPath = path.resolve(__dirname, '..', '.env');
dotenv.config({ path: envPath });

async function verifyConfig() {
    console.log('--- Verifying DocuSign Configuration ---');

    const clientId = process.env.ESIGN_PROVIDER_CLIENT_ID; // Integration Key
    const userId = process.env.ESIGN_PROVIDER_USER_ID;     // Impersonated User GUID
    const accountId = process.env.ESIGN_PROVIDER_ACCOUNT_ID;
    const basePath = process.env.ESIGN_PROVIDER_BASE_URL || 'https://demo.docusign.net/restapi';
    const oAuthBasePath = process.env.ESIGN_PROVIDER_OAUTH_BASE_URL || 'account-d.docusign.com';

    // Clean up private key
    let privateKey = process.env.ESIGN_PROVIDER_PRIVATE_KEY || '';
    // logic to handle \n escape sequences if they exist in the env string
    privateKey = privateKey.replace(/\\n/g, '\n');

    // Checks
    let missing = [];
    if (!clientId) missing.push('ESIGN_PROVIDER_CLIENT_ID');
    if (!userId) missing.push('ESIGN_PROVIDER_USER_ID');
    if (!accountId) missing.push('ESIGN_PROVIDER_ACCOUNT_ID');
    if (!privateKey) missing.push('ESIGN_PROVIDER_PRIVATE_KEY');

    if (missing.length > 0) {
        console.error('❌ Missing Required Environment Variables:');
        missing.forEach(m => console.error(`   - ${m}`));
        process.exit(1);
    } else {
        console.log('✅ All environment variables present.');
    }

    // Attempt JWT Authentication
    console.log('\n--- Attempting JWT Authentication ---');
    const apiClient = new docusign.ApiClient();
    apiClient.setOAuthBasePath(oAuthBasePath);

    const scopes = ['signature', 'impersonation'];

    try {
        const results = await apiClient.requestJWTUserToken(
            clientId,
            userId,
            scopes,
            Buffer.from(privateKey, 'utf-8'),
            3600
        );

        const accessToken = results.body.access_token;
        console.log('✅ JWT Authentication Successful!');

        // Verify User Info / Connection
        apiClient.addDefaultHeader('Authorization', 'Bearer ' + accessToken);
        apiClient.setBasePath(basePath);

        const envelopesApi = new docusign.EnvelopesApi(apiClient);
        console.log(`\n--- Testing API Connectivity [${basePath}] ---`);

        // Just try to list envelopes (limit 1) to verify access
        try {
            // Using listStatusChanges as a lightweight check
            const options = { count: '1', fromDate: '2024-01-01' };
            // Note: listStatusChanges might fail if no envelopes exist, but that's a valid API response vs auth error
            // Better to use getUserInfo? 
            // Actually, let's just create a dummy envelope draft if possible, or check account info.
            // Docusign eSignature REST API v2.1 -> getAccountInformation

            const accountsApi = new docusign.AccountsApi(apiClient);
            const accountInfo = await accountsApi.getAccountInformation(accountId);

            console.log('✅ API Connection Successful!');
            console.log(`   Account Name: ${accountInfo.accountName}`);
            console.log(`   Account ID: ${accountInfo.accountIdGuid}`);

        } catch (apiError) {
            console.error('❌ API Verification Failed:', apiError.response?.body || apiError.message);
            if (apiError.response?.status === 404) {
                console.error('   Hint: Check if ESIGN_PROVIDER_BASE_URL is correct for your account (demo vs prod).');
            }
            process.exit(1);
        }

    } catch (error) {
        console.error('❌ JWT Authentication Failed:');
        if (error.response) {
            console.error('   Status:', error.response.status);
            console.error('   Body:', error.response.body);
            if (error.response.body?.error === 'consent_required') {
                console.error('\n⚠️  CONSENT REQUIRED');
                console.error(`   You must grant consent for this Integration Key to impersonate user ${userId}.`);
                console.error(`   Click this link to grant consent:`);
                console.error(`   https://${oAuthBasePath}/oauth/auth?response_type=code&scope=signature%20impersonation&client_id=${clientId}&redirect_uri=http://localhost:3000/callback`);
            }
        } else {
            console.error('   Error:', error.message);
        }
        process.exit(1);
    }
}

verifyConfig();
