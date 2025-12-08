
import { config } from 'dotenv';
import { resolve } from 'path';
import * as docusign from 'docusign-esign';

// Load .env file
config({ path: resolve(__dirname, '../.env') });

console.log('🔐 DocuSign JWT Authentication Test');
console.log('==================================\n');

async function testJwtAuth() {
    const clientId = process.env.ESIGN_PROVIDER_CLIENT_ID;
    const userId = process.env.ESIGN_PROVIDER_USER_ID;
    const privateKeyRaw = process.env.ESIGN_PROVIDER_PRIVATE_KEY;
    const basePath = process.env.ESIGN_PROVIDER_BASE_URL;

    if (!clientId || !userId || !privateKeyRaw) {
        console.log('❌ Missing JWT Configuration:');
        if (!clientId) console.log('   - ESIGN_PROVIDER_CLIENT_ID');
        if (!userId) console.log('   - ESIGN_PROVIDER_USER_ID');
        if (!privateKeyRaw) console.log('   - ESIGN_PROVIDER_PRIVATE_KEY');
        return;
    }

    // Format private key
    let privateKey = privateKeyRaw;
    if (privateKey.includes('\\n')) {
        privateKey = privateKey.replace(/\\n/g, '\n');
    }

    console.log(`Client ID: ${clientId}`);
    console.log(`User ID: ${userId}`);
    console.log(`Base URL: ${basePath}`);

    console.log('\n--- Private Key Debug ---');
    console.log(`Length: ${privateKey.length}`);
    console.log(`First line: ${privateKey.split('\n')[0]}`);
    console.log(`Last line: ${privateKey.split('\n').pop()}`);
    console.log(`Contains newlines: ${privateKey.includes('\n')}`);
    console.log('-------------------------\n');

    const dsApiClient = new docusign.ApiClient();

    // Set OAuth Base Path
    const isDemo = basePath?.includes('demo') || true;
    const oAuthBasePath = isDemo ? 'account-d.docusign.com' : 'account.docusign.com';
    dsApiClient.setOAuthBasePath(oAuthBasePath);
    console.log(`OAuth Base Path: ${oAuthBasePath}`);

    const scopes = ['signature', 'impersonation'];
    const expiresIn = 3600;

    try {
        console.log('Attempting to request JWT User Token...');
        const results = await dsApiClient.requestJWTUserToken(
            clientId,
            userId,
            scopes,
            Buffer.from(privateKey, 'utf-8'),
            expiresIn
        );

        if (results.body?.access_token) {
            console.log('\n✅ JWT Authentication Successful!');
            console.log(`Access Token: ${results.body.access_token.substring(0, 10)}...`);
            console.log(`Expires In: ${results.body.expires_in} seconds`);

            // Verify token works by calling UserInfo
            console.log('\nVerifying token with UserInfo endpoint...');
            dsApiClient.addDefaultHeader('Authorization', `Bearer ${results.body.access_token}`);
            const userInfo = await dsApiClient.getUserInfo(results.body.access_token);
            console.log(`✅ User Info Retrieved: ${userInfo.name} (${userInfo.email})`);
            console.log('Available Accounts:');
            userInfo.accounts?.forEach((acc: any) => {
                console.log(` - ${acc.accountName} (ID: ${acc.accountId}) [Default: ${acc.isDefault}]`);
                console.log(`   Base URI: ${acc.baseUri}`);
            });

        } else {
            console.log('❌ Failed to get access token (Empty response)');
        }

    } catch (error: any) {
        console.log('\n❌ JWT Authentication Failed!');
        console.log(`Error: ${error.message}`);
        if (error.response) {
            console.log(`Status: ${error.response.status}`);
            console.log(`Data: ${JSON.stringify(error.response.data)}`);
            console.log(`Body: ${JSON.stringify(error.response.body)}`);
        }

        if (error.message && error.message.includes('consent_required')) {
            console.log('\n⚠️  Consent Required');
            console.log('You need to grant consent for this application to impersonate the user.');
            console.log(`Please visit this URL to grant consent:`);
            console.log(`https://${oAuthBasePath}/oauth/auth?response_type=code&scope=signature%20impersonation&client_id=${clientId}&redirect_uri=${process.env.FRONTEND_URL || 'http://localhost:3000'}/my-lease`);
        }
    }
}

testJwtAuth().catch(err => {
    console.log(`Unhandled error: ${err.message}`);
});
