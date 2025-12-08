# E-Signature Backend Configuration Guide

This guide will help you configure the e-signature backend to work with DocuSign or HelloSign.

## Required Environment Variables

Add these environment variables to your `.env` file in the `tenant_portal_backend` directory:

### Basic Configuration

```env
# E-Signature Provider Configuration
ESIGN_PROVIDER=DOCUSIGN                    # or HELLOSIGN
ESIGN_PROVIDER_BASE_URL=https://api.docusign.com/restapi/v2.1
ESIGN_PROVIDER_API_KEY=your_api_key_here
ESIGN_PROVIDER_ACCOUNT_ID=your_account_id_here

# Frontend URL (for return URLs after signing)
FRONTEND_URL=http://localhost:3000         # Change to your production URL
```

## Provider-Specific Configuration

### DocuSign Configuration

1. **Get your DocuSign credentials:**
   - Sign up at [DocuSign Developer Center](https://developers.docusign.com/)
   - Create an Integration Key (API Key)
   - Get your Account ID from your DocuSign account

2. **Set environment variables:**
   ```env
   ESIGN_PROVIDER=DOCUSIGN
   ESIGN_PROVIDER_BASE_URL=https://demo.docusign.net/restapi/v2.1  # Demo environment
   # OR
   ESIGN_PROVIDER_BASE_URL=https://www.docusign.net/restapi/v2.1   # Production
   
   ESIGN_PROVIDER_API_KEY=your_integration_key
   ESIGN_PROVIDER_ACCOUNT_ID=your_account_id
   ```

3. **DocuSign Base URLs:**
   - **Demo/Sandbox:** `https://demo.docusign.net/restapi/v2.1`
   - **Production:** `https://www.docusign.net/restapi/v2.1`

### HelloSign Configuration

1. **Get your HelloSign credentials:**
   - Sign up at [HelloSign Developer Portal](https://app.hellosign.com/api)
   - Create an API key
   - Get your Account ID

2. **Set environment variables:**
   ```env
   ESIGN_PROVIDER=HELLOSIGN
   ESIGN_PROVIDER_BASE_URL=https://api.hellosign.com/v3
   ESIGN_PROVIDER_API_KEY=your_api_key
   ESIGN_PROVIDER_ACCOUNT_ID=your_account_id
   ```

## Configuration Steps

### Step 1: Create/Update `.env` File

Navigate to `tenant_portal_backend` directory and create or update your `.env` file:

```bash
cd tenant_portal_backend
```

Add the required environment variables (see above).

### Step 2: Verify Configuration

The backend will log warnings if configuration is missing:

```
ESIGN_PROVIDER_BASE_URL not configured or invalid. Using mock mode for provider requests.
```

If you see this message, check your `.env` file.

### Step 3: Test Configuration

1. **Start the backend:**
   ```bash
   npm run start:dev
   ```

2. **Check logs for configuration status:**
   - Look for: `ESIGN_PROVIDER_BASE_URL not configured` (means not configured)
   - Look for: No warnings (means configured correctly)

3. **Test creating an envelope:**
   - Use the frontend to create a lease signature request
   - Check backend logs for API calls to the provider
   - If configured correctly, you should see successful API calls

## Environment Variable Details

### `ESIGN_PROVIDER`
- **Type:** String
- **Values:** `DOCUSIGN` or `HELLOSIGN`
- **Default:** `DOCUSIGN`
- **Description:** Which e-signature provider to use

### `ESIGN_PROVIDER_BASE_URL`
- **Type:** String (URL)
- **Required:** Yes (for production use)
- **Description:** Base URL for the e-signature provider API
- **Examples:**
  - DocuSign Demo: `https://demo.docusign.net/restapi/v2.1`
  - DocuSign Production: `https://www.docusign.net/restapi/v2.1`
  - HelloSign: `https://api.hellosign.com/v3`

### `ESIGN_PROVIDER_API_KEY`
- **Type:** String
- **Required:** Yes (for production use)
- **Description:** API key/Integration key for authenticating with the provider
- **Security:** Keep this secret! Never commit to version control

### `ESIGN_PROVIDER_ACCOUNT_ID`
- **Type:** String
- **Required:** Yes (for production use)
- **Description:** Account ID for your provider account
- **DocuSign:** Found in your DocuSign account settings
- **HelloSign:** Found in your HelloSign account settings

### `FRONTEND_URL`
- **Type:** String (URL)
- **Required:** Yes
- **Description:** Base URL of your frontend application
- **Used for:** Return URLs after signing documents
- **Examples:**
  - Development: `http://localhost:3000`
  - Production: `https://yourdomain.com`

## Fallback Behavior

If the e-signature provider is not configured:

1. **Envelope Creation:** Will still create envelope records in the database
2. **Recipient View:** Will return a fallback URL pointing back to your frontend
3. **Status Updates:** Will work locally but won't sync with provider

**Note:** For production use, you **must** configure the provider properly.

## Troubleshooting

### Issue: "about:blank" when trying to sign

**Cause:** E-signature provider not configured or invalid credentials.

**Solution:**
1. Check your `.env` file has all required variables
2. Verify `ESIGN_PROVIDER_BASE_URL` is correct
3. Verify `ESIGN_PROVIDER_API_KEY` is valid
4. Check backend logs for API errors
5. Restart the backend after updating `.env`

### Issue: "E-signature provider is not properly configured"

**Cause:** Backend is returning fallback URLs instead of real signing URLs.

**Solution:**
1. Check backend logs for configuration warnings
2. Verify all environment variables are set
3. Test API connectivity to the provider
4. Check provider account status

### Issue: API calls failing

**Possible causes:**
1. Invalid API key
2. Wrong base URL
3. Network/firewall blocking requests
4. Provider account issues

**Solution:**
1. Verify credentials in provider dashboard
2. Test API key with provider's test tools
3. Check network connectivity
4. Review backend error logs

## Testing Your Configuration

### Quick Test Script

Create a test file `test-esignature-config.ts`:

```typescript
import { ConfigService } from '@nestjs/config';

const config = new ConfigService();

console.log('E-Signature Configuration Check:');
console.log('ESIGN_PROVIDER:', config.get('ESIGN_PROVIDER') || 'NOT SET');
console.log('ESIGN_PROVIDER_BASE_URL:', config.get('ESIGN_PROVIDER_BASE_URL') || 'NOT SET');
console.log('ESIGN_PROVIDER_API_KEY:', config.get('ESIGN_PROVIDER_API_KEY') ? 'SET' : 'NOT SET');
console.log('ESIGN_PROVIDER_ACCOUNT_ID:', config.get('ESIGN_PROVIDER_ACCOUNT_ID') || 'NOT SET');
console.log('FRONTEND_URL:', config.get('FRONTEND_URL') || 'NOT SET');
```

### Manual Testing

1. **Create an envelope:**
   - Go to lease management
   - Create a new signature request
   - Check backend logs for API calls

2. **Test signing:**
   - Click "Launch Signing Session"
   - Should open provider's signing page (not "about:blank")
   - Complete signing flow

3. **Check status:**
   - After signing, envelope status should update
   - Check backend logs for webhook/status updates

## Security Best Practices

1. **Never commit `.env` files** to version control
2. **Use environment-specific configurations:**
   - Development: Use demo/sandbox credentials
   - Production: Use production credentials
3. **Rotate API keys regularly**
4. **Use least-privilege API keys**
5. **Monitor API usage** in provider dashboard

## Next Steps

After configuring:

1. ✅ Test envelope creation
2. ✅ Test signing flow
3. ✅ Test status updates
4. ✅ Configure webhooks (optional, for real-time updates)
5. ✅ Set up monitoring/alerts

## Additional Resources

- [DocuSign API Documentation](https://developers.docusign.com/docs/esign-rest-api/)
- [HelloSign API Documentation](https://developers.hellosign.com/api/reference)
- [Backend E-Signature Service Code](../../tenant_portal_backend/src/esignature/esignature.service.ts)

---

**Need Help?** Check backend logs for detailed error messages, or review the e-signature service implementation.

