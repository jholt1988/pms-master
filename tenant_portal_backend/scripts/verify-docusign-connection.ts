
import { config } from 'dotenv';
import { resolve } from 'path';
import * as fs from 'fs';
import axios from 'axios';

// Load .env file
config({ path: resolve(__dirname, '../.env') });

const logFile = resolve(__dirname, '../connection-test.txt');
fs.writeFileSync(logFile, 'DocuSign Connection Test\n======================\n');

function log(message: string) {
    fs.appendFileSync(logFile, message + '\n');
    console.log(message);
}

async function testConnection() {
    const accessToken = process.env.ESIGN_PROVIDER_API_KEY;

    if (!accessToken) {
        log('❌ Missing ESIGN_PROVIDER_API_KEY');
        return;
    }

    log('Testing User Info endpoint to verify token and accounts...');

    // Try Demo first
    const demoUserInfoUrl = 'https://account-d.docusign.com/oauth/userinfo';

    try {
        log(`Calling ${demoUserInfoUrl}...`);
        const response = await axios.get(demoUserInfoUrl, {
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        log('✅ User Info (Demo) success!');
        log(`Name: ${response.data.name}`);
        log(`Email: ${response.data.email}`);
        log('Accounts:');

        let foundConfigured = false;
        const configuredId = process.env.ESIGN_PROVIDER_ACCOUNT_ID;

        if (Array.isArray(response.data.accounts)) {
            response.data.accounts.forEach((acc: any) => {
                log(` - ${acc.account_name} (ID: ${acc.account_id})`);
                log(`   Base URI: ${acc.base_uri}`);
                log(`   Is Default: ${acc.is_default}`);

                if (acc.account_id === configuredId) {
                    foundConfigured = true;
                }
            });
        }

        if (foundConfigured) {
            log(`\n✅ Configured Account ID ${configuredId} found!`);

            // Find the account object again to get base_uri
            const match = response.data.accounts.find((acc: any) => acc.account_id === configuredId);
            if (match) {
                log(`   Correct Base URL should be: ${match.base_uri}/restapi/v2.1`);

                const configuredBase = process.env.ESIGN_PROVIDER_BASE_URL;
                if (!configuredBase?.includes(match.base_uri)) {
                    log(`   ⚠️  WARNING: Configured Base URL (${configuredBase}) does not match account Base URI!`);
                    log(`   This is likely the cause of the 404 error.`);
                } else {
                    log(`   Configured Base URL matches account Base URI.`);
                }
            }
        } else {
            log(`\n❌ Configured Account ID ${configuredId} NOT found in this user's accounts!`);
            log(`   Please update ESIGN_PROVIDER_ACCOUNT_ID with one of the IDs listed above.`);
        }

    } catch (error: any) {
        log('❌ User Info (Demo) failed!');
        log(`Error: ${error.message}`);
        if (error.response) {
            log(`Status: ${error.response.status}`);
            log(`Body: ${JSON.stringify(error.response.data)}`);
        }

        // If 401, token is invalid
        if (error.response?.status === 401) {
            log('⚠️  Token is invalid or expired.');
        }
    }
}

testConnection().catch(err => {
    log(`Unhandled error: ${err.message}`);
});
