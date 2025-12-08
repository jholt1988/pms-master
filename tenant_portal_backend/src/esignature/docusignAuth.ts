const docusign = require('docusign-esign');
const fs = require('fs');
const path = require('path');


// --- CONFIGURATION ---
const INTEGRATION_KEY = 'YOUR_INTEGRATION_KEY';
const USER_ID = 'YOUR_USER_ID_GUID';
// Use 'account-d.docusign.com' for Dev/Sandbox, 'account.docusign.com' for Production
const OAUTH_BASE_PATH = 'account-d.docusign.com'; 
const PRIVATE_KEY_FILENAME = 'private.key'; // Make sure this file is in the root

// Scopes required
const SCOPES = ['signature', 'impersonation'];

async function getDocuSignClient() {
  const apiClient = new docusign.ApiClient();
  apiClient.setOAuthBasePath(OAUTH_BASE_PATH);

  try {
    // 1. Read the RSA Key
    const privateKeyFile = fs.readFileSync(path.resolve(__dirname, PRIVATE_KEY_FILENAME));

    // 2. Request the JWT Token
    // Token valid for 1 hour (3600 seconds)
    const results = await apiClient.requestJWTUserToken(
      INTEGRATION_KEY,
      USER_ID,
      SCOPES,
      privateKeyFile,
      3600
    );

    const accessToken = results.body.access_token;
    
    // 3. Get User Info to find the correct Base URI (Account API Endpoint)
    // We must attach the token to the client temporarily to make this call
    apiClient.addDefaultHeader('Authorization', 'Bearer ' + accessToken);
    
    const userInfo = await apiClient.getUserInfo(accessToken);
    const accountInfo = userInfo.accounts.find(account => account.isDefault === "true") || userInfo.accounts[0];
    
    const baseUri = accountInfo.baseUri;
    const accountId = accountInfo.accountId;

    // 4. Update the ApiClient with the specific Account Base URI
    // The SDK requires the full path including "/restapi"
    apiClient.setBasePath(baseUri + '/restapi');

    console.log('Successfully Authenticated.');
    console.log(`Account ID: ${accountId}`);
    console.log(`Base URI: ${baseUri}/restapi`);

    return { apiClient, accountId };

  } catch (error) {
    // Handle Consent Required Error
    const errorBody = error.response && error.response.body;
    
    if (errorBody && errorBody.error === 'consent_required') {
      console.log('\n!!! CONSENT REQUIRED !!!');
      console.log('Please open this URL in your browser to grant consent:');
      const consentUrl = `https://${OAUTH_BASE_PATH}/oauth/auth?response_type=code&scope=${SCOPES.join('%20')}&client_id=${INTEGRATION_KEY}&redirect_uri=https://www.docusign.com`;
      console.log(consentUrl);
    } else {
      console.error('DocuSign Exception:', errorBody || error);
    }
    return null;
  }
}

// --- USAGE ---
(async () => {
  const result = await getDocuSignClient();
  
  if (result) {
    const { apiClient, accountId } = result;
    // You can now use apiClient to make API calls
    console.log('Ready to send envelopes.');
  }
})();