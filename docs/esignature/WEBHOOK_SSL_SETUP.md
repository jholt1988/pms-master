# Step-by-Step Guide: Setting Up SSL/HTTPS for DocuSign Webhooks

This guide provides detailed step-by-step instructions for configuring SSL/HTTPS for DocuSign webhooks in both development and production environments.

## Table of Contents

1. [Development Setup (Using ngrok)](#development-setup-using-ngrok)
2. [Production Setup (Using Let's Encrypt)](#production-setup-using-lets-encrypt)
3. [Production Setup (Using Commercial SSL)](#production-setup-using-commercial-ssl)
4. [Configuring DocuSign Webhooks](#configuring-docusign-webhooks)
5. [Testing Webhook Connection](#testing-webhook-connection)
6. [Troubleshooting](#troubleshooting)

---

## Development Setup (Using ngrok)

### Prerequisites
- Node.js backend running on port 3001
- ngrok account (free tier works)

### Step 1: Install ngrok

**Windows (PowerShell):**
```powershell
# Using Chocolatey
choco install ngrok

# OR download from https://ngrok.com/download
# Extract and add to PATH
```

**macOS:**
```bash
brew install ngrok
```

**Linux:**
```bash
# Download from https://ngrok.com/download
# Or use package manager
sudo apt-get install ngrok  # Ubuntu/Debian
```

### Step 2: Sign Up for ngrok Account

1. Go to https://dashboard.ngrok.com/signup
2. Create a free account
3. Get your authtoken from the dashboard

### Step 3: Authenticate ngrok

```bash
ngrok config add-authtoken YOUR_AUTH_TOKEN
```

### Step 4: Start Your Backend Server

```bash
cd tenant_portal_backend
npm run start:dev
# Server should be running on http://localhost:3001
```

### Step 5: Start ngrok Tunnel

Open a new terminal window and run:

```bash
ngrok http 3001
```

You'll see output like:
```
Forwarding   https://abc123.ngrok-free.app -> http://localhost:3001
```

**Copy the HTTPS URL** (e.g., `https://abc123.ngrok-free.app`)

### Step 6: Configure DocuSign Webhook

1. Log into [DocuSign Admin](https://admin.docusign.com/)
2. Navigate to **Connect** → **Event Notifications**
3. Click **Add Configuration**
4. Enter configuration name: `Development Webhook`
5. Set **URL to Publish**: `https://abc123.ngrok-free.app/webhooks/esignature`
   - Replace `abc123.ngrok-free.app` with your ngrok URL
6. Select events:
   - ✅ Envelope Sent
   - ✅ Envelope Delivered
   - ✅ Envelope Completed
   - ✅ Envelope Declined
   - ✅ Envelope Voided
   - ✅ Recipient Signed
7. Click **Save**

### Step 7: Test Webhook Connection

1. Create a test envelope in your application
2. Check ngrok web interface: http://localhost:4040
3. You should see webhook requests from DocuSign
4. Check your backend logs for webhook processing

**Note**: Free ngrok URLs change each time you restart ngrok. For development, you can:
- Use ngrok's static domain (paid feature)
- Or update DocuSign webhook URL each time you restart ngrok

---

## Production Setup (Using Let's Encrypt)

### Prerequisites
- Domain name pointing to your server
- Server with public IP address
- Port 80 and 443 open in firewall
- Root or sudo access to server

### Step 1: Install Certbot

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install certbot
```

**CentOS/RHEL:**
```bash
sudo yum install certbot
```

**macOS:**
```bash
brew install certbot
```

### Step 2: Stop Your Backend Server (Temporarily)

```bash
# Stop your NestJS application
# This is needed for initial certificate generation
```

### Step 3: Generate SSL Certificate

```bash
sudo certbot certonly --standalone -d your-domain.com -d www.your-domain.com
```

Replace `your-domain.com` with your actual domain.

**Follow the prompts:**
- Enter your email address
- Agree to terms of service
- Choose whether to share email with EFF (optional)

### Step 4: Certificate Location

Certificates will be saved to:
- Certificate: `/etc/letsencrypt/live/your-domain.com/fullchain.pem`
- Private Key: `/etc/letsencrypt/live/your-domain.com/privkey.pem`

### Step 5: Configure NestJS for HTTPS

Update `tenant_portal_backend/src/index.ts` to support HTTPS:

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as fs from 'fs';
import * as https from 'https';
import { ExpressAdapter } from '@nestjs/platform-express';

async function bootstrap() {
  const httpsEnabled = process.env.HTTPS_ENABLED === 'true';
  const port = process.env.PORT || 3001;

  let app;
  
  if (httpsEnabled) {
    // Load SSL certificates for HTTPS
    const httpsOptions = {
      key: fs.readFileSync(process.env.SSL_KEY_PATH!),
      cert: fs.readFileSync(process.env.SSL_CERT_PATH!),
    };

    // Create HTTPS server
    const server = https.createServer(httpsOptions, (req, res) => {
      // This will be handled by NestJS
    });

    app = await NestFactory.create(AppModule, new ExpressAdapter(server));
    
    await app.listen(port, () => {
      console.log(`🚀 Backend running on https://localhost:${port}`);
    });
  } else {
    // Standard HTTP server
    app = await NestFactory.create(AppModule);
    
    await app.listen(port, () => {
      console.log(`🚀 Backend running on http://localhost:${port}`);
    });
  }

  // Rest of your bootstrap code (CORS, validation, etc.)
  // ... existing code ...
}
bootstrap();
```

**Alternative: Use Reverse Proxy (Recommended for Production)**

Instead of configuring HTTPS directly in NestJS, use a reverse proxy (nginx, Apache, or cloud load balancer):

1. **Nginx Configuration** (`/etc/nginx/sites-available/your-app`):
```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}
```

2. **Keep NestJS on HTTP** (port 3001)
3. **Nginx handles HTTPS** (port 443) and proxies to NestJS

This is the recommended approach for production.

### Step 6: Set Environment Variables

Add to `.env`:
```env
HTTPS_ENABLED=true
SSL_KEY_PATH=/etc/letsencrypt/live/your-domain.com/privkey.pem
SSL_CERT_PATH=/etc/letsencrypt/live/your-domain.com/fullchain.pem
PORT=443
```

### Step 7: Set Up Auto-Renewal

Let's Encrypt certificates expire after 90 days. Set up auto-renewal:

```bash
# Test renewal
sudo certbot renew --dry-run

# Add to crontab (runs twice daily)
sudo crontab -e

# Add this line:
0 0,12 * * * certbot renew --quiet --deploy-hook "systemctl restart your-backend-service"
```

### Step 8: Configure Firewall

```bash
# Allow HTTPS traffic
sudo ufw allow 443/tcp
sudo ufw allow 80/tcp  # Needed for certificate renewal
```

### Step 9: Configure DocuSign Webhook

1. Log into [DocuSign Admin](https://admin.docusign.com/)
2. Navigate to **Connect** → **Event Notifications**
3. Click **Add Configuration**
4. Enter configuration name: `Production Webhook`
5. Set **URL to Publish**: `https://your-domain.com/webhooks/esignature`
6. Select all required events
7. Click **Save**

---

## Production Setup (Using Commercial SSL)

### Step 1: Purchase SSL Certificate

Purchase from a trusted CA:
- DigiCert
- GlobalSign
- Sectigo
- GoDaddy SSL

### Step 2: Generate Certificate Signing Request (CSR)

```bash
openssl req -new -newkey rsa:2048 -nodes -keyout your-domain.key -out your-domain.csr
```

**Fill in the prompts:**
- Country: US
- State: Your State
- City: Your City
- Organization: Your Company
- Common Name: your-domain.com (must match your domain exactly)

### Step 3: Submit CSR to CA

1. Log into your CA account
2. Submit the CSR file content
3. Complete domain validation (email, DNS, or file upload)
4. Download certificate files from CA

### Step 4: Install Certificate

You'll receive:
- Certificate file (`.cem` or `.crt`)
- Intermediate certificate (`.ca-bundle`)
- Private key (`.key` - keep this secure!)

Combine certificates:
```bash
cat your-domain.crt intermediate.crt > fullchain.pem
```

### Step 5: Configure NestJS or Reverse Proxy

**Option A: Direct HTTPS in NestJS** (same as Let's Encrypt section)

**Option B: Reverse Proxy** (Recommended - see Let's Encrypt Step 5 Alternative)

Use your certificate paths:

```env
HTTPS_ENABLED=true
SSL_KEY_PATH=/path/to/your-domain.key
SSL_CERT_PATH=/path/to/fullchain.pem
PORT=443
```

---

## Configuring DocuSign Webhooks

### Step 1: Access DocuSign Admin

1. Go to https://admin.docusign.com/
2. Log in with your DocuSign account

### Step 2: Navigate to Connect

1. Click **Settings** in the left menu
2. Click **Connect** (under Integrations)
3. Click **Event Notifications**

### Step 3: Create Webhook Configuration

1. Click **Add Configuration** or **+ Add**
2. Fill in the form:

   **Configuration Name**: `Production Webhooks` (or `Development Webhooks`)

   **URL to Publish**: 
   - Development: `https://your-ngrok-url.ngrok-free.app/webhooks/esignature`
   - Production: `https://your-domain.com/webhooks/esignature`

   **Include Certificate of Completion**: ✅ (recommended)

   **Include Documents**: ✅ (to receive signed PDFs)

   **Include Envelope Void Reason**: ✅ (optional)

3. Click **Next**

### Step 4: Select Events

Select the following events:
- ✅ **Envelope Sent** - When envelope is sent to recipients
- ✅ **Envelope Delivered** - When envelope is delivered
- ✅ **Envelope Completed** - When all recipients have signed
- ✅ **Envelope Declined** - When recipient declines to sign
- ✅ **Envelope Voided** - When envelope is voided
- ✅ **Recipient Signed** - When a recipient signs (optional, for granular tracking)

Click **Save**

### Step 5: Test Webhook

1. Create a test envelope in your application
2. Check DocuSign Connect logs:
   - Go to **Connect** → **Event Notifications**
   - Click on your configuration
   - View **Logs** tab
   - Look for successful delivery (green checkmark)

3. Check your backend logs:
   ```bash
   # Should see webhook received messages
   [EsignatureService] Received webhook for envelope abc-123 with status: SENT
   ```

---

## Testing Webhook Connection

### Step 1: Verify Endpoint is Accessible

Test your webhook endpoint:

```bash
# Test HTTPS endpoint
curl -X POST https://your-domain.com/webhooks/esignature \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

You should get a response (even if it's an error about missing data).

### Step 2: Test from DocuSign

1. In DocuSign Admin, go to your webhook configuration
2. Click **Test** or **Send Test Event**
3. Check the **Logs** tab for delivery status
4. Check your backend logs for the test webhook

### Step 3: Monitor Webhook Logs

**DocuSign Side:**
- Go to **Connect** → **Event Notifications** → Your Configuration → **Logs**
- Look for:
  - ✅ Green checkmark = Success
  - ❌ Red X = Failed (check error message)

**Backend Side:**
- Check application logs for:
  ```
  [EsignatureService] Received webhook for envelope {envelopeId} with status: {status}
  [EsignatureService] Successfully processed webhook for envelope {envelopeId}
  ```

---

## Troubleshooting

### Issue: "Webhook delivery failed - SSL certificate error"

**Symptoms:**
- DocuSign logs show SSL/TLS errors
- Webhook never reaches your server

**Solutions:**
1. Verify certificate is valid:
   ```bash
   openssl s_client -connect your-domain.com:443 -servername your-domain.com
   ```
   Look for "Verify return code: 0 (ok)"

2. Check certificate chain is complete:
   ```bash
   openssl s_client -connect your-domain.com:443 -showcerts
   ```

3. Ensure certificate hasn't expired:
   ```bash
   openssl x509 -in fullchain.pem -noout -dates
   ```

4. Verify certificate matches domain:
   - Certificate Common Name (CN) must match your domain exactly
   - Check Subject Alternative Names (SANs) if using multiple domains

### Issue: "Webhook timeout"

**Symptoms:**
- DocuSign logs show timeout errors
- Webhook takes too long to respond

**Solutions:**
1. Ensure webhook handler responds quickly (< 5 seconds)
2. Process webhooks asynchronously if needed
3. Return 200 OK immediately, process in background
4. Check server resources (CPU, memory, network)

### Issue: "Webhook returns 404 Not Found"

**Symptoms:**
- DocuSign logs show 404 errors
- Endpoint not found

**Solutions:**
1. Verify webhook URL is correct:
   - Should be: `https://your-domain.com/webhooks/esignature`
   - Check for typos
   - Ensure no trailing slashes

2. Verify route is registered:
   ```typescript
   // Check esignature.module.ts includes EsignatureWebhookController
   ```

3. Test endpoint manually:
   ```bash
   curl -X POST https://your-domain.com/webhooks/esignature \
     -H "Content-Type: application/json" \
     -d '{}'
   ```

### Issue: "Certificate not trusted"

**Symptoms:**
- Browser shows "Not Secure" warning
- DocuSign rejects webhook

**Solutions:**
1. Ensure certificate is from a recognized CA
2. Check certificate chain is complete (include intermediate certificates)
3. Verify certificate is properly installed
4. Test with SSL Labs: https://www.ssllabs.com/ssltest/

### Issue: "ngrok URL changes on restart"

**Solutions:**
1. **Option 1**: Use ngrok static domain (paid feature)
   ```bash
   ngrok http 3001 --domain=your-static-domain.ngrok-free.app
   ```

2. **Option 2**: Update DocuSign webhook URL each time
   - Get new ngrok URL
   - Update in DocuSign Admin

3. **Option 3**: Use localtunnel (free static subdomain)
   ```bash
   npm install -g localtunnel
   lt --port 3001 --subdomain your-subdomain
   ```

---

## Security Best Practices

### 1. Webhook Signature Validation

**TODO**: Implement signature validation to verify webhooks are from DocuSign.

DocuSign sends webhook signatures in the `X-DocuSign-Signature` header. Validate this to prevent spoofing.

### 2. Rate Limiting

Already implemented via NestJS Throttler. Webhook endpoint should handle:
- Multiple rapid webhooks
- Retry attempts from DocuSign

### 3. HTTPS Only

Ensure webhook endpoint:
- Only accepts HTTPS connections
- Redirects HTTP to HTTPS
- Uses HSTS headers

### 4. Firewall Rules

- Only allow necessary ports (443 for HTTPS)
- Consider IP whitelisting if DocuSign provides IP ranges
- Use fail2ban or similar for brute force protection

---

## Quick Reference

### Development (ngrok)
```bash
# Terminal 1: Start backend
cd tenant_portal_backend
npm run start:dev

# Terminal 2: Start ngrok
ngrok http 3001

# Use HTTPS URL in DocuSign: https://abc123.ngrok-free.app/webhooks/esignature
```

### Production (Let's Encrypt)
```bash
# Generate certificate
sudo certbot certonly --standalone -d your-domain.com

# Configure NestJS with HTTPS
# Set environment variables:
HTTPS_ENABLED=true
SSL_KEY_PATH=/etc/letsencrypt/live/your-domain.com/privkey.pem
SSL_CERT_PATH=/etc/letsencrypt/live/your-domain.com/fullchain.pem

# Use in DocuSign: https://your-domain.com/webhooks/esignature
```

### Test Webhook
```bash
curl -X POST https://your-domain.com/webhooks/esignature \
  -H "Content-Type: application/json" \
  -d '{"envelopeId": "test", "status": "SENT"}'
```

---

## Next Steps

1. ✅ Set up SSL/HTTPS (this guide)
2. ⏭️ Implement webhook signature validation
3. ⏭️ Add webhook retry handling
4. ⏭️ Set up monitoring/alerting for webhook failures
5. ⏭️ Document webhook payload structure

---

## Additional Resources

- [DocuSign Connect Documentation](https://developers.docusign.com/docs/esign-rest-api/esign101/concepts/connect/)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [ngrok Documentation](https://ngrok.com/docs)
- [NestJS HTTPS Configuration](https://docs.nestjs.com/faq/http-adapter)

