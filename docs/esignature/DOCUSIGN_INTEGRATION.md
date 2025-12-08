# DocuSign Integration Guide

This guide provides comprehensive documentation for integrating and troubleshooting the DocuSign eSignature service.

## Overview

The eSignature service integrates with DocuSign's Envelope API to enable digital document signing for lease agreements. The service uses the DocuSign Node.js SDK for direct API integration.

## Prerequisites

1. **DocuSign Developer Account**
   - Sign up at [DocuSign Developer Center](https://developers.docusign.com/)
   - Create an Integration Key (API Key)
   - Get your Account ID from your DocuSign account settings

2. **OAuth 2.0 Setup**
   - Configure OAuth 2.0 application in DocuSign
   - Obtain Client ID and Client Secret
   - Set up redirect URIs for your application

## Environment Variables

### Required Variables

```env
# Provider Configuration
ESIGN_PROVIDER=DOCUSIGN
ESIGN_PROVIDER_BASE_URL=https://demo.docusign.net/restapi/v2.1  # Demo environment
# OR
ESIGN_PROVIDER_BASE_URL=https://www.docusign.net/restapi/v2.1     # Production

# OAuth Configuration
ESIGN_PROVIDER_API_KEY=<OAuth Access Token>
ESIGN_PROVIDER_ACCOUNT_ID=<Your DocuSign Account ID>

# Optional: For token refresh
ESIGN_PROVIDER_CLIENT_ID=<OAuth Client ID>
ESIGN_PROVIDER_CLIENT_SECRET=<OAuth Client Secret>

# Frontend URL (for return URLs after signing)
FRONTEND_URL=http://localhost:3000
```

### Environment-Specific URLs

- **Demo/Sandbox**: `https://demo.docusign.net/restapi/v2.1`
- **Production**: `https://www.docusign.net/restapi/v2.1`

**Important**: The base URL must include `/restapi/v2.1` at the end.

## OAuth 2.0 Authentication Setup

This section provides step-by-step instructions for setting up OAuth 2.0 authentication with DocuSign.

### Step 1: Create DocuSign Developer Account

1. Go to [DocuSign Developer Center](https://developers.docusign.com/)
2. Click **"Get Started"** or **"Sign Up"**
3. Create a free developer account (or sign in if you already have one)
4. You'll be redirected to the DocuSign Admin console

### Step 2: Create an Integration Key (OAuth App)

1. In the DocuSign Admin console, go to **Settings** → **Apps and Keys**
2. Click **"Add App and Secret"** or **"+ Add"**
3. Fill in the form:
   - **Name**: `Property Management System` (or your app name)
   - **Description**: `OAuth integration for e-signature service`
   - **Redirect URIs**: 
     - For development: `http://localhost:3001/api/esignature/oauth/callback`
     - For production: `https://your-domain.com/api/esignature/oauth/callback`
   - **Scopes**: Select `signature` (required for e-signatures)
4. Click **"Create"**
5. **Important**: Copy and save:
   - **Integration Key** (this is your Client ID)
   - **Secret Key** (this is your Client Secret)
   - ⚠️ The Secret Key is only shown once! Save it immediately.

### Step 3: Get Your Account ID

1. In DocuSign Admin, go to **Settings** → **Account**
2. Find your **Account ID** (also called "API Account ID")
3. Copy and save this value

### Step 4: Choose Your Environment

**Demo/Sandbox Environment** (Recommended for testing):
- Base URL: `https://demo.docusign.net/restapi/v2.1`
- OAuth URL: `https://account-d.docusign.com`

**Production Environment**:
- Base URL: `https://www.docusign.net/restapi/v2.1`
- OAuth URL: `https://account.docusign.com`

### Step 5: Get an Access Token

You have three options for getting an access token:

#### Option A: Authorization Code Grant (Recommended for Production)

This is the standard OAuth flow for web applications.

**Step 5a: Get Authorization Code**

1. Build the authorization URL:
   
   **Important**: The `redirect_uri` must be URL-encoded and match EXACTLY what you configured in DocuSign.
   
   **For PowerShell:**
   ```powershell
   $redirectUri = "http://localhost:3001/api/esignature/oauth/callback"
   $encodedUri = [System.Web.HttpUtility]::UrlEncode($redirectUri)
   $clientId = "your-integration-key-here"
   
   $authUrl = "https://account-d.docusign.com/oauth/auth?response_type=code&scope=signature&client_id=$clientId&redirect_uri=$encodedUri"
   
   Write-Host $authUrl
   # Copy the URL and open it in your browser
   ```
   
   **For Bash/Manual:**
   ```
   https://account-d.docusign.com/oauth/auth?
     response_type=code&
     scope=signature&
     client_id={YOUR_INTEGRATION_KEY}&
     redirect_uri=http%3A%2F%2Flocalhost%3A3001%2Fapi%2Fesignature%2Foauth%2Fcallback
   ```
   
   **URL-encoded redirect_uri examples:**
   - `http://localhost:3001/api/esignature/oauth/callback` → `http%3A%2F%2Flocalhost%3A3001%2Fapi%2Fesignature%2Foauth%2Fcallback`
   - `https://your-domain.com/api/esignature/oauth/callback` → `https%3A%2F%2Fyour-domain.com%2Fapi%2Fesignature%2Foauth%2Fcallback`

2. Replace placeholders:
   - `{YOUR_INTEGRATION_KEY}`: Your Integration Key from Step 2
   - `redirect_uri`: Must be URL-encoded and match EXACTLY what you configured in DocuSign
     - Development: `http://localhost:3001/api/esignature/oauth/callback`
     - Production: `https://your-domain.com/api/esignature/oauth/callback`

3. Open the URL in your browser
4. Sign in with your DocuSign account
5. Grant permissions
6. You'll be redirected to your redirect URI with a `code` parameter:
   ```
   http://localhost:3001/api/esignature/oauth/callback?code=abc123...
   ```

**Step 5b: Exchange Code for Access Token**

Use the authorization code to get an access token:

**For Bash/Linux/macOS:**
```bash
curl -X POST https://account-d.docusign.com/oauth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code" \
  -d "code={AUTHORIZATION_CODE}" \
  -d "client_id={YOUR_INTEGRATION_KEY}" \
  -d "client_secret={YOUR_SECRET_KEY}"
```

**For PowerShell (Windows):**

Option 1: Using `Invoke-RestMethod` (Recommended):
```powershell
$body = @{
    grant_type = "authorization_code"
    code = "{AUTHORIZATION_CODE}"
    client_id = "{YOUR_INTEGRATION_KEY}"
    client_secret = "{YOUR_SECRET_KEY}"
}

$response = Invoke-RestMethod -Uri "https://account-d.docusign.com/oauth/token" `
    -Method Post `
    -ContentType "application/x-www-form-urlencoded" `
    -Body $body

$response | ConvertTo-Json
```

Option 2: Using `curl.exe` (if available):
```powershell
curl.exe -X POST https://account-d.docusign.com/oauth/token `
  -H "Content-Type: application/x-www-form-urlencoded" `
  -d "grant_type=authorization_code" `
  -d "code={AUTHORIZATION_CODE}" `
  -d "client_id={YOUR_INTEGRATION_KEY}" `
  -d "client_secret={YOUR_SECRET_KEY}"
```

**Note**: In PowerShell, use backticks (`` ` ``) for line continuation, not backslashes (`\`).

Response:
```json
{
  "access_token": "eyJ0eXAiOiJNVCIsImFsZyI6IlJTMjU2I...",
  "token_type": "Bearer",
  "expires_in": 28800,
  "refresh_token": "abc123..."
}
```

**Save the `access_token`** - this is what you'll use for `ESIGN_PROVIDER_API_KEY`.

#### Option B: JWT Grant (Server-to-Server, No User Interaction)

Best for automated services that don't require user interaction.

**Step 5a: Generate RSA Key Pair**

1. Generate a private key:
   ```bash
   openssl genrsa -out docusign_private_key.pem 2048
   ```

2. Generate a public key:
   ```bash
   openssl rsa -in docusign_private_key.pem -pubout -out docusign_public_key.pem
   ```

**Step 5b: Add Public Key to DocuSign**

1. In DocuSign Admin → **Apps and Keys**
2. Find your Integration Key
3. Click **"Actions"** → **"Edit"**
4. Scroll to **"RSA Keypair"** section
5. Click **"Add Public Key"**
6. Paste the contents of `docusign_public_key.pem`
7. Save

**Step 5c: Request JWT Token**

```bash
curl -X POST https://account-d.docusign.com/oauth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer" \
  -d "assertion={JWT_ASSERTION}" \
  -d "client_id={YOUR_INTEGRATION_KEY}"
```

The JWT assertion is a signed JWT token. You'll need to create this programmatically. See [DocuSign JWT Grant documentation](https://developers.docusign.com/docs/esign-rest-api/esign101/concepts/oauth/jwt/) for details.

#### Option C: Quick Test Token (Using DocuSign OAuth Tool)

For quick testing, you can use DocuSign's OAuth tool:

1. Go to [DocuSign OAuth Tool](https://developers.docusign.com/oauth-tool)
2. Select your Integration Key
3. Click **"Generate Token"**
4. Sign in and grant permissions
5. Copy the generated access token

⚠️ **Note**: Tokens from the OAuth tool expire quickly and are for testing only.

### Step 6: Configure Environment Variables

Add these to your `.env` file:

```env
# Provider Configuration
ESIGN_PROVIDER=DOCUSIGN

# Environment (use demo for testing, production for live)
ESIGN_PROVIDER_BASE_URL=https://demo.docusign.net/restapi/v2.1
# OR for production:
# ESIGN_PROVIDER_BASE_URL=https://www.docusign.net/restapi/v2.1

# OAuth Access Token (from Step 5)
ESIGN_PROVIDER_API_KEY=eyJ0eXAiOiJNVCIsImFsZyI6IlJTMjU2I...

# Your DocuSign Account ID (from Step 3)
ESIGN_PROVIDER_ACCOUNT_ID=12345678-1234-1234-1234-123456789012

# OAuth Client Credentials (for automatic token refresh)
ESIGN_PROVIDER_CLIENT_ID=your-integration-key-here
ESIGN_PROVIDER_CLIENT_SECRET=your-secret-key-here

# Frontend URL (for return URLs after signing)
FRONTEND_URL=http://localhost:3000
```

### Step 7: Test Your Configuration

1. Restart your backend server
2. Check the logs for:
   ```
   ✅ E-signature provider configured successfully: https://demo.docusign.net/restapi/v2.1
   ✅ DocuSign configuration validated successfully
   ```

3. If you see warnings, check:
   - Base URL includes `/restapi/v2.1`
   - Access token is valid (not expired)
   - Account ID is correct

### Token Refresh (Automatic)

If you've configured `ESIGN_PROVIDER_CLIENT_ID` and `ESIGN_PROVIDER_CLIENT_SECRET`, the service will automatically refresh tokens when they expire.

**How it works:**
- Tokens typically expire after 8 hours
- Before each API call, the service checks if the token is expired or expiring soon (within 5 minutes)
- If needed, it automatically calls the refresh endpoint
- No manual intervention required!

**Token Refresh Endpoint:**
```
POST https://account-d.docusign.com/oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=refresh_token&
refresh_token={REFRESH_TOKEN}&
client_id={CLIENT_ID}&
client_secret={CLIENT_SECRET}
```

### Troubleshooting OAuth Setup

**Error: "Invalid client_id"**
- Verify your Integration Key is correct
- Check you're using the right environment (demo vs production)

**Error: "Invalid redirect_uri" or "redirect_uri_mismatch"**

This is one of the most common OAuth errors. The redirect URI in your authorization URL must match **EXACTLY** what you configured in DocuSign.

**Common causes and fixes:**

1. **URI doesn't match exactly**
   - Check the redirect URI in your authorization URL matches character-for-character
   - Common mistakes:
     - `http://` vs `https://`
     - `localhost` vs `127.0.0.1`
     - Trailing slash: `/callback` vs `/callback/`
     - Port number: `:3001` vs `:3000`
     - Path case: `/api/esignature/oauth/callback` vs `/api/Esignature/OAuth/Callback`

2. **URI not configured in DocuSign**
   - Go to DocuSign Admin → **Settings** → **Apps and Keys**
   - Find your Integration Key
   - Click **"Edit"** or **"Actions"** → **"Edit"**
   - Check **"Redirect URIs"** section
   - Add your redirect URI if it's missing:
     - Development: `http://localhost:3001/api/esignature/oauth/callback`
     - Production: `https://your-domain.com/api/esignature/oauth/callback`
   - **Important**: You can add multiple redirect URIs (one per line)

3. **URL encoding issues**
   - The redirect_uri parameter must be URL-encoded in the authorization URL
   - Example:
     ```
     # Correct (URL-encoded):
     redirect_uri=http%3A%2F%2Flocalhost%3A3001%2Fapi%2Fesignature%2Foauth%2Fcallback
     
     # Incorrect (not encoded):
     redirect_uri=http://localhost:3001/api/esignature/oauth/callback
     ```

4. **How to fix:**
   
   **Step 1**: Verify your redirect URI in DocuSign:
   - Go to DocuSign Admin → **Settings** → **Apps and Keys**
   - Find your Integration Key → Click **"Edit"**
   - Copy the exact redirect URI(s) listed
   
   **Step 2**: Use that exact URI in your authorization URL:
   ```powershell
   # Example authorization URL (replace with your values)
   $redirectUri = "http://localhost:3001/api/esignature/oauth/callback"
   $encodedUri = [System.Web.HttpUtility]::UrlEncode($redirectUri)
   $clientId = "your-integration-key-here"
   
   $authUrl = "https://account-d.docusign.com/oauth/auth?response_type=code&scope=signature&client_id=$clientId&redirect_uri=$encodedUri"
   
   Write-Host "Authorization URL:"
   Write-Host $authUrl
   ```
   
   Or manually encode it:
   ```
   http://localhost:3001/api/esignature/oauth/callback
   becomes:
   http%3A%2F%2Flocalhost%3A3001%2Fapi%2Fesignature%2Foauth%2Fcallback
   ```

5. **Quick test:**
   - Use DocuSign's OAuth tool: https://developers.docusign.com/oauth-tool
   - Select your Integration Key
   - It will show you the correct redirect URI format
   - Copy that format for your manual requests

**Error: "Token expired"**
- Access tokens expire after 8 hours
- Get a new token or configure automatic refresh with client credentials

**Error: "Invalid access token"**
- Verify the token hasn't expired
- Check you're using the token for the correct environment (demo vs production)

**Token refresh not working:**
- Verify `ESIGN_PROVIDER_CLIENT_ID` and `ESIGN_PROVIDER_CLIENT_SECRET` are set
- Check the base URL is correct (needed to construct the token endpoint)
- Review server logs for refresh errors

### Security Best Practices

1. **Never commit tokens to version control**
   - Use `.env` files (already in `.gitignore`)
   - Use environment variables in production

2. **Rotate secrets regularly**
   - Generate new Integration Keys periodically
   - Update environment variables when rotating

3. **Use different credentials for dev/prod**
   - Create separate Integration Keys for each environment
   - Use demo environment for testing

4. **Enable token refresh**
   - Always configure `ESIGN_PROVIDER_CLIENT_ID` and `ESIGN_PROVIDER_CLIENT_SECRET`
   - This prevents service interruptions when tokens expire

### Quick Reference

| Item | Demo Environment | Production Environment |
|------|-----------------|----------------------|
| Base URL | `https://demo.docusign.net/restapi/v2.1` | `https://www.docusign.net/restapi/v2.1` |
| OAuth URL | `https://account-d.docusign.com` | `https://account.docusign.com` |
| Admin Console | `https://admin-d.docusign.com` | `https://admin.docusign.com` |
| Use Case | Testing, Development | Live Production |

## API Endpoints

### Create Envelope

**Endpoint**: `POST /api/esignature/leases/{leaseId}/envelopes`

**Request Body**:
```json
{
  "templateId": "template-123",
  "message": "Please sign your lease agreement",
  "recipients": [
    {
      "name": "John Doe",
      "email": "john@example.com",
      "role": "TENANT",
      "userId": 1
    }
  ],
  "provider": "DOCUSIGN"
}
```

**Response**:
```json
{
  "id": 1,
  "providerEnvelopeId": "abc-123-def",
  "status": "SENT",
  "participants": [...]
}
```

### Get Recipient View (Signing URL)

**Endpoint**: `POST /api/esignature/envelopes/{envelopeId}/recipient-view`

**Request Body**:
```json
{
  "returnUrl": "http://localhost:3000/my-lease"
}
```

**Response**:
```json
{
  "url": "https://demo.docusign.net/Member/PowerFormSigning.aspx?PowerFormId=..."
}
```

### Refresh Envelope Status

**Endpoint**: `POST /api/esignature/envelopes/{envelopeId}/refresh`

Manually polls DocuSign API to get the latest envelope status.

### Void Envelope

**Endpoint**: `PATCH /api/esignature/envelopes/{envelopeId}/void`

**Request Body**:
```json
{
  "reason": "Lease terms changed"
}
```

## Recipient ID Handling

**Important**: DocuSign uses two different ID types:

1. **recipientId** (String): The primary identifier used in API calls (e.g., "1", "2", "3")
2. **recipientIdGuid** (UUID): Internal DocuSign identifier, NOT used for API calls

The service stores `recipientId` (string) in the database and uses it for all API operations, including `RecipientViewRequest`.

## Document Handling

### Supported File Types

- PDF (`.pdf`)
- Microsoft Word (`.doc`, `.docx`)
- Microsoft Excel (`.xls`, `.xlsx`)
- Microsoft PowerPoint (`.ppt`, `.pptx`)
- Text files (`.txt`)
- HTML (`.html`, `.htm`)
- RTF (`.rtf`)
- XML (`.xml`)

### Document Size Limits

- Maximum per document: 25MB
- Maximum per envelope: 1GB total

The service validates document sizes before uploading.

### Document Processing

1. Documents are retrieved from the lease's `generalDocuments`
2. Converted to base64 encoding
3. Added to envelope with proper file extension detection
4. If no document is available, a generated HTML document is used

## Error Handling

### Common Error Codes

| Error Code | Description | Solution |
|------------|-------------|----------|
| `INVALID_RECIPIENT` | Recipient ID not found | Verify recipient exists and hasn't already signed |
| `TOKEN_EXPIRED` | Access token expired | Token will auto-refresh if client credentials are configured |
| `INVALID_TOKEN` | Invalid access token | Check `ESIGN_PROVIDER_API_KEY` is correct |
| `ENVELOPE_NOT_FOUND` | Envelope doesn't exist | Verify envelope ID is correct |
| `INVALID_DOCUMENT` | Document format/size issue | Check document is valid and under 25MB |
| `ACCOUNT_NOT_FOUND` | Account ID incorrect | Verify `ESIGN_PROVIDER_ACCOUNT_ID` |

### Error Response Format

```json
{
  "code": "INVALID_RECIPIENT",
  "message": "Invalid recipient ID. The recipient may not exist or may have already signed. (Recipient not found)",
  "details": { ... }
}
```

## Webhook Configuration

> **📘 Quick Start**: See [QUICK_START_WEBHOOK.md](./QUICK_START_WEBHOOK.md) for fastest setup instructions.

> **📖 Detailed Guide**: See [WEBHOOK_SSL_SETUP.md](./WEBHOOK_SSL_SETUP.md) for complete step-by-step instructions.

### SSL/HTTPS Requirements

**YES, SSL/HTTPS is REQUIRED for DocuSign webhooks.**

DocuSign mandates that webhook endpoints use HTTPS connections with a valid SSL/TLS certificate from a recognized Certificate Authority (CA). Self-signed certificates are **NOT** accepted.

**Requirements:**
- ✅ Valid SSL certificate from a recognized CA (Let's Encrypt, DigiCert, etc.)
- ✅ HTTPS endpoint (not HTTP)
- ✅ TLS 1.2 or higher (TLS 1.3 supported)
- ✅ Certificate must be in Microsoft Trusted Root Certificate program
- ❌ Self-signed certificates will NOT work
- ❌ HTTP endpoints will NOT work in production

**For Development/Testing:**
- Local development (`localhost`) may work with HTTP, but DocuSign Connect requires a publicly accessible HTTPS endpoint
- Use a tunneling service like ngrok, localtunnel, or Cloudflare Tunnel for local testing:
  ```bash
  # Example with ngrok
  ngrok http 3001
  # Use the HTTPS URL provided by ngrok in DocuSign webhook configuration
  ```

### Setting Up Webhooks in DocuSign

1. Log into DocuSign Admin
2. Navigate to Connect → Event Notifications
3. Create new configuration
4. Set endpoint URL: `https://your-domain.com/webhooks/esignature` (must be HTTPS)
5. Select events:
   - Envelope Sent
   - Envelope Delivered
   - Envelope Completed
   - Envelope Declined
   - Envelope Voided
   - Recipient Signed

### Webhook Security

**TODO**: Implement webhook signature validation using `X-DocuSign-Signature` header.

Current implementation logs webhook events but does not validate signatures. For production, add signature validation.

**Recommended Security Measures:**
1. **SSL Certificate**: Use a valid CA-signed certificate
2. **Signature Validation**: Validate `X-DocuSign-Signature` header (see DocuSign Connect documentation)
3. **IP Whitelisting**: Optionally whitelist DocuSign IP ranges (if available)
4. **Rate Limiting**: Already implemented via NestJS Throttler
5. **HTTPS Only**: Ensure webhook endpoint only accepts HTTPS connections

## Troubleshooting

### Issue: "ESIGN_PROVIDER_BASE_URL not configured or invalid"

**Solution**:
1. Check `.env` file has `ESIGN_PROVIDER_BASE_URL` set
2. Ensure URL includes `/restapi/v2.1`
3. Remove any quotes around the URL
4. Check for line breaks in the URL

### Issue: "Failed to create DocuSign envelope: Invalid token"

**Solution**:
1. Verify `ESIGN_PROVIDER_API_KEY` contains a valid OAuth access token
2. Check token hasn't expired (tokens expire after 8 hours)
3. If using refresh tokens, ensure `ESIGN_PROVIDER_CLIENT_ID` and `ESIGN_PROVIDER_CLIENT_SECRET` are set

### Issue: "Invalid recipient ID" when getting signing URL

**Solution**:
1. Verify participant exists in database with correct `recipientId`
2. Check `recipientId` is a string (e.g., "1"), not a GUID
3. Ensure participant email matches DocuSign recipient email

### Issue: "404 Not Found" when calling DocuSign API

**Solution**:
1. Verify `ESIGN_PROVIDER_ACCOUNT_ID` is correct
2. Check base URL includes account ID in path for DocuSign
3. Ensure envelope exists in DocuSign (check `providerEnvelopeId`)

### Issue: Documents not appearing in envelope

**Solution**:
1. Check document exists in lease's `generalDocuments`
2. Verify document file size is under 25MB
3. Check document file extension is supported
4. Review logs for document loading errors

### Issue: Recipient view URL returns "about:blank"

**Solution**:
1. Check backend logs for DocuSign API errors
2. Verify participant email and name are set
3. Ensure `recipientId` matches DocuSign's recipient ID
4. Check return URL is valid and accessible

## Testing

### Unit Tests

Run unit tests:
```bash
npm test -- esignature.service.spec.ts
```

### Manual Testing Checklist

- [ ] Create envelope with single recipient
- [ ] Create envelope with multiple recipients
- [ ] Generate recipient view URL successfully
- [ ] Sign document through embedded signing
- [ ] Handle token expiration gracefully
- [ ] Handle invalid recipient ID errors
- [ ] Handle document upload failures
- [ ] Process webhook events correctly
- [ ] Void envelope successfully
- [ ] Refresh envelope status

## Best Practices

1. **Token Management**
   - Always configure `ESIGN_PROVIDER_CLIENT_ID` and `ESIGN_PROVIDER_CLIENT_SECRET` for automatic token refresh
   - Monitor token expiration in logs
   - Use long-lived tokens or refresh tokens in production

2. **Error Handling**
   - Always check error codes from `parseDocuSignError()`
   - Log detailed error information for debugging
   - Provide user-friendly error messages

3. **Recipient IDs**
   - Always use string `recipientId` (e.g., "1"), never GUID
   - Store `recipientId` in database when envelope is created
   - Use stored `recipientId` for all API calls

4. **Document Handling**
   - Validate document size before uploading
   - Use proper file extensions
   - Handle document access errors gracefully

5. **Webhooks**
   - Implement signature validation for security
   - Handle webhook errors gracefully
   - Log all webhook events for debugging

## API Reference

### DocuSign Envelope API

- [Official DocuSign API Documentation](https://developers.docusign.com/docs/esign-rest-api/)
- [Node.js SDK Documentation](https://github.com/docusign/docusign-esign-node-client)

### Key API Methods Used

1. **createEnvelope**: Creates and sends envelope
2. **listRecipients**: Gets recipient information
3. **createRecipientView**: Generates embedded signing URL
4. **getEnvelope**: Gets envelope status
5. **update**: Updates envelope (for voiding)

## Support

For issues or questions:
1. Check logs for detailed error messages
2. Review this troubleshooting guide
3. Consult [DocuSign Developer Support](https://developers.docusign.com/support/)
4. Review service code comments for implementation details

