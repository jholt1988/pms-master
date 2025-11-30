# eSignature Environment Variables

## Location

Add these environment variables to the `.env` file in the `tenant_portal_backend` directory:

```
tenant_portal_backend/.env
```

## Required Variables

### Basic Configuration

```env
# ============================================
# eSignature Provider Configuration
# ============================================

# Base URL for the eSignature provider API
# Default: https://mock-esign.local (for development/mock mode)
ESIGN_PROVIDER_BASE_URL=https://demo.docusign.net/restapi

# Provider type (DOCUSIGN, HELLOSIGN, etc.)
# Default: DOCUSIGN
ESIGN_PROVIDER=DOCUSIGN

# API Key for authentication with the eSignature provider
ESIGN_PROVIDER_API_KEY=your-api-key-here

# Account ID for the eSignature provider
ESIGN_PROVIDER_ACCOUNT_ID=your-account-id-here
```

## Example Configuration

### DocuSign (Production)

```env
ESIGN_PROVIDER_BASE_URL=https://demo.docusign.net/restapi
ESIGN_PROVIDER=DOCUSIGN
ESIGN_PROVIDER_API_KEY=your-docusign-integration-key
ESIGN_PROVIDER_ACCOUNT_ID=your-docusign-account-id
```

### DocuSign (Sandbox/Development)

```env
ESIGN_PROVIDER_BASE_URL=https://demo.docusign.net/restapi
ESIGN_PROVIDER=DOCUSIGN
ESIGN_PROVIDER_API_KEY=your-docusign-sandbox-integration-key
ESIGN_PROVIDER_ACCOUNT_ID=your-docusign-sandbox-account-id
```

### Mock Mode (Development/Testing)

```env
ESIGN_PROVIDER_BASE_URL=https://mock-esign.local
ESIGN_PROVIDER=DOCUSIGN
# API_KEY and ACCOUNT_ID not required for mock mode
```

## How It Works

1. **ESIGN_PROVIDER_BASE_URL**: The base URL for making API requests to the eSignature provider
   - Used in: `esignature.service.ts` line 39
   - Default: `https://mock-esign.local`

2. **ESIGN_PROVIDER**: The provider type (DOCUSIGN, HELLOSIGN, etc.)
   - Used in: `esignature.service.ts` line 57
   - Default: `DOCUSIGN`

3. **ESIGN_PROVIDER_API_KEY**: API key for authenticating requests
   - Used in: `esignature.service.ts` line 356 (`buildProviderHeaders` method)
   - Required for production use

4. **ESIGN_PROVIDER_ACCOUNT_ID**: Account identifier for the provider
   - Used in: `esignature.service.ts` line 357 (`buildProviderHeaders` method)
   - Required for production use

## Fallback Behavior

If the provider API request fails, the service will:
- Log a warning
- Return a mock envelope with a random UUID
- Continue processing without blocking the application

This allows the application to work even if the eSignature provider is unavailable.

## Security Notes

⚠️ **Important**: Never commit your `.env` file to version control. The `.env` file should be in `.gitignore`.

For production deployments:
- Use environment variables from your hosting platform (e.g., Heroku Config Vars, AWS Secrets Manager)
- Rotate API keys regularly
- Use different keys for development, staging, and production

## Testing

When testing without a real eSignature provider:
- Leave `ESIGN_PROVIDER_BASE_URL` as the default or set to `https://mock-esign.local`
- The service will automatically use mock responses if the API call fails

