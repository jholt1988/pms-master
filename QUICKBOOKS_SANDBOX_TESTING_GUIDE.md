# QuickBooks Integration Testing Guide

## Setup QuickBooks Sandbox Environment

### Step 1: Create Intuit Developer Account
1. Go to https://developer.intuit.com/
2. Sign up or sign in with existing account
3. Navigate to "My Apps" in the dashboard

### Step 2: Create QuickBooks API App
1. Click "Create an app"
2. Select "QuickBooks Online Accounting"
3. Choose appropriate scopes:
   - Accounting (required)
   - Payments (optional for future payment features)

### Step 3: Configure App Settings
**Development Settings:**
- App Name: "Property Management Suite (Dev)"
- Redirect URI: `http://localhost:3001/api/quickbooks/callback`
- Environment: Sandbox

**Production Settings (when ready):**
- Redirect URI: `https://your-domain.com/api/quickbooks/callback`  
- Environment: Production

### Step 4: Get API Credentials
After creating the app, you'll receive:
- **Client ID** (public)
- **Client Secret** (secret)
- **Base URL:** https://sandbox-quickbooks.api.intuit.com (sandbox)

### Step 5: Update Environment Variables
Create/update `.env` file in `tenant_portal_backend/`:

```bash
# QuickBooks Integration
QUICKBOOKS_CLIENT_ID=your_client_id_here
QUICKBOOKS_CLIENT_SECRET=your_client_secret_here
QUICKBOOKS_REDIRECT_URI=http://localhost:3001/api/quickbooks/callback
QUICKBOOKS_BASE_URL=https://sandbox-quickbooks.api.intuit.com
NODE_ENV=development  # This sets sandbox mode
```

### Step 6: Test OAuth Flow

1. **Start the backend server**
   ```bash
   cd tenant_portal_backend
   npm start
   ```

2. **Get authorization URL**
   ```bash
   curl -X GET "http://localhost:3001/api/quickbooks/auth-url" \
        -H "Authorization: Bearer YOUR_JWT_TOKEN"
   ```

3. **Complete OAuth in browser**
   - Visit the returned authorization URL
   - Sign in with your Intuit developer account  
   - Create/select a sandbox company
   - Grant permissions
   - You'll be redirected to the callback URL

4. **Verify connection**
   ```bash
   curl -X GET "http://localhost:3001/api/quickbooks/status" \
        -H "Authorization: Bearer YOUR_JWT_TOKEN"
   ```

### Step 7: Test Data Synchronization

1. **Create test data in your Property Management System:**
   - Add a property
   - Add a tenant/lease
   - Create a maintenance request with costs
   - Generate a payment record

2. **Trigger sync**
   ```bash
   curl -X POST "http://localhost:3001/api/quickbooks/sync" \
        -H "Authorization: Bearer YOUR_JWT_TOKEN"
   ```

3. **Verify in QuickBooks Sandbox:**
   - Login to https://qbo.intuit.com/
   - Check for synced customers (tenants)
   - Check for service items (properties)
   - Check for invoices (rent charges)
   - Check for payments (rent payments)
   - Check for expenses (maintenance costs)

### Expected Results

**Customers (Tenants):**
```
Name: John Doe (Unit 101)
Address: Property address + unit number
```

**Service Items (Properties):**
```
Name: Property Name - Rent
Type: Service
Income Account: Rental Income
```

**Invoices (Rent Charges):**
```
Customer: John Doe (Unit 101)
Product/Service: Property Name - Rent
Amount: Monthly rent amount
```

**Payments (Rent Payments):**
```
Customer: John Doe (Unit 101)
Amount: Payment amount
Payment Method: Based on payment gateway
```

**Expenses (Maintenance):**
```
Vendor: Maintenance vendor or "Internal"
Account: Maintenance Expense
Amount: Maintenance cost
Description: Maintenance details
```

### Common Issues & Troubleshooting

1. **OAuth Callback Fails**
   - Check redirect URI matches exactly in app settings
   - Ensure server is running on correct port
   - Verify HTTPS in production

2. **Token Refresh Fails**
   - Check token expiration handling
   - Verify refresh token is stored correctly
   - Ensure client credentials are correct

3. **Data Sync Errors**
   - Check required fields are populated
   - Verify data format matches QB requirements
   - Review error logs for specific API errors

4. **Connection Shows Inactive**
   - Token might be expired
   - Re-authorize the connection
   - Check error logs for token issues

### Testing Checklist

- [ ] OAuth authorization URL generates correctly
- [ ] OAuth callback processes successfully  
- [ ] Access token stored in database
- [ ] Connection status returns active
- [ ] Manual sync completes without errors
- [ ] Data appears correctly in QuickBooks sandbox
- [ ] Token refresh works before expiration
- [ ] Error handling works for invalid data
- [ ] Multiple properties sync correctly
- [ ] Multiple tenants sync correctly

### Next Steps After Sandbox Testing

1. **Frontend Integration**
   - Add QuickBooks connection UI
   - Display connection status
   - Manual sync trigger button

2. **Production Deployment**
   - Update redirect URI to production domain
   - Switch to production QuickBooks environment
   - Add monitoring and alerting

3. **Advanced Features**
   - Automated sync scheduling
   - Conflict resolution
   - Advanced error recovery

---

**Status:** Ready for sandbox testing  
**Estimated Time:** 2-4 hours for complete setup and testing  
**Priority:** HIGH - Critical for property manager adoption