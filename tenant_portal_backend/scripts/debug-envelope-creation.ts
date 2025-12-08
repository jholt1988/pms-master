
import { config } from 'dotenv';
import { resolve } from 'path';
import * as docusign from 'docusign-esign';
import axios from 'axios';

// Load .env file
config({ path: resolve(__dirname, '../.env') });

console.log('✉️  DocuSign Envelope Creation Debug (Axios)');
console.log('=========================================\n');

async function debugEnvelopeCreation() {
    const clientId = process.env.ESIGN_PROVIDER_CLIENT_ID;
    const userId = process.env.ESIGN_PROVIDER_USER_ID;
    const privateKeyRaw = process.env.ESIGN_PROVIDER_PRIVATE_KEY;

    // Hardcoded values
    const accountId = '75833c3a-c3d7-45b5-a518-7c9568d5966c';
    const basePath = 'https://demo.docusign.net/restapi/v2.1';

    if (!clientId || !userId || !privateKeyRaw) {
        console.log('❌ Missing Configuration (Client/User/Key)');
        return;
    }

    console.log(`Using Hardcoded Account ID: "${accountId}"`);
    console.log(`Using Hardcoded Base URL: "${basePath}"`);

    // Format private key
    let privateKey = privateKeyRaw;
    if (privateKey.includes('\\n')) {
        privateKey = privateKey.replace(/\\n/g, '\n');
    }

    const dsApiClient = new docusign.ApiClient();
    const isDemo = basePath?.includes('demo') || true;
    const oAuthBasePath = isDemo ? 'account-d.docusign.com' : 'account.docusign.com';
    dsApiClient.setOAuthBasePath(oAuthBasePath);

    try {
        // 1. Authenticate
        console.log('1. Authenticating...');
        const results = await dsApiClient.requestJWTUserToken(
            clientId,
            userId,
            ['signature', 'impersonation'],
            Buffer.from(privateKey, 'utf-8'),
            3600
        );
        const accessToken = results.body.access_token;
        console.log('✅ Authenticated');

        // 2. Send Envelope using Axios directly
        console.log('2. Sending Envelope (via Axios)...');

        const url = `${basePath}/accounts/${accountId}/envelopes`;
        console.log(`Target URL: ${url}`);

        const payload = {
            emailSubject: 'Debug Envelope',
            status: 'sent',
            documents: [{
                documentBase64: Buffer.from('<html><body><h1>Hello World</h1></body></html>').toString('base64'),
                name: 'Debug.html',
                fileExtension: 'html',
                documentId: '1'
            }],
            recipients: {
                signers: [{
                    email: 'test@example.com',
                    name: 'Test User',
                    recipientId: '1',
                    routingOrder: '1',
                    tabs: {
                        signHereTabs: [{
                            anchorString: 'Hello World',
                            anchorYOffset: '20',
                            anchorUnits: 'pixels'
                        }]
                    }
                }]
            }
        };

        const response = await axios.post(url, payload, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('\n✅ Envelope Created Successfully!');
        console.log(`Envelope ID: ${response.data.envelopeId}`);
        console.log(`Status: ${response.data.status}`);

    } catch (error: any) {
        console.log('\n❌ Envelope Creation Failed!');
        console.log(`Error: ${error.message}`);
        if (error.response) {
            console.log(`Status: ${error.response.status}`);
            console.log(`Data: ${JSON.stringify(error.response.data, null, 2)}`);
        }
    }
}

debugEnvelopeCreation();
