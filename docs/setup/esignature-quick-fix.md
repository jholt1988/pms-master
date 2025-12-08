# Quick Fix: E-Signature Configuration Issue

## Problem
Your `ESIGN_PROVIDER_BASE_URL` is set to `account-d.docusign.com` which is missing:
- The protocol (`https://`)
- The full API path (`/restapi/v2.1`)

## Solution

Update your `.env` file in `tenant_portal_backend`:

### For DocuSign Demo/Sandbox:
```env
ESIGN_PROVIDER_BASE_URL=https://demo.docusign.net/restapi/v2.1
```

### For DocuSign Production:
```env
ESIGN_PROVIDER_BASE_URL=https://www.docusign.net/restapi/v2.1
```

### If you're using a specific account base (like account-d):
```env
ESIGN_PROVIDER_BASE_URL=https://account-d.docusign.com/restapi/v2.1
```

## Complete Configuration Example

```env
# E-Signature Provider
ESIGN_PROVIDER=DOCUSIGN
ESIGN_PROVIDER_BASE_URL=https://demo.docusign.net/restapi/v2.1
ESIGN_PROVIDER_API_KEY=your_integration_key_here
ESIGN_PROVIDER_ACCOUNT_ID=5e2504c5-0bcf-44d0-93e9-a902831f99d7

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

## After Updating

1. **Restart your backend server**
2. **Test the configuration:**
   ```bash
   npm run check:esignature
   ```
3. **Try signing a lease again**

## Verify It's Working

Check backend logs for:
- ✅ No warnings about "ESIGN_PROVIDER_BASE_URL not configured"
- ✅ Successful API calls to DocuSign
- ✅ Signing URLs that point to DocuSign (not your frontend)

## Still Having Issues?

1. Verify your API key is valid
2. Check your Account ID is correct
3. Ensure you're using the right environment (demo vs production)
4. Check backend logs for specific error messages

