# Quick Start: Webhook SSL Setup

## TL;DR - Fastest Way to Get Webhooks Working

### For Development (5 minutes)

1. **Install ngrok:**
   ```bash
   # Windows: choco install ngrok
   # macOS: brew install ngrok
   # Or download from https://ngrok.com/download
   ```

2. **Get ngrok authtoken:**
   - Sign up at https://dashboard.ngrok.com/signup
   - Copy your authtoken
   - Run: `ngrok config add-authtoken YOUR_TOKEN`

3. **Start your backend:**
   ```bash
   cd tenant_portal_backend
   npm run start:dev
   ```

4. **Start ngrok in new terminal:**
   ```bash
   ngrok http 3001
   ```

5. **Copy the HTTPS URL** (e.g., `https://abc123.ngrok-free.app`)

6. **Configure in DocuSign:**
   - Go to https://admin.docusign.com/
   - Connect → Event Notifications → Add Configuration
   - URL: `https://abc123.ngrok-free.app/webhooks/esignature`
   - Select events → Save

**Done!** Webhooks will now work in development.

---

### For Production (30 minutes)

#### Option 1: Let's Encrypt (Free, Recommended)

1. **Install certbot:**
   ```bash
   sudo apt-get install certbot  # Ubuntu/Debian
   ```

2. **Generate certificate:**
   ```bash
   sudo certbot certonly --standalone -d your-domain.com
   ```

3. **Set up nginx reverse proxy** (see full guide for nginx config)

4. **Configure DocuSign webhook:**
   - URL: `https://your-domain.com/webhooks/esignature`

#### Option 2: Use Your Hosting Provider's SSL

Most hosting providers (Heroku, AWS, Azure, DigitalOcean) provide free SSL:
- **Heroku**: Automatic HTTPS
- **AWS**: Use Application Load Balancer with ACM certificate
- **DigitalOcean**: Use Let's Encrypt via App Platform
- **Railway/Render**: Automatic HTTPS

Just point your domain and enable SSL in your hosting dashboard.

---

## Testing Your Webhook

```bash
# Test endpoint is accessible
curl -X POST https://your-domain.com/webhooks/esignature \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

If you get a response (even an error), your endpoint is accessible!

---

## Common Issues

**"Webhook not receiving events"**
- Check DocuSign Connect logs in Admin panel
- Verify URL is HTTPS (not HTTP)
- Check backend logs for incoming requests

**"SSL certificate error"**
- Ensure certificate is from trusted CA (not self-signed)
- Check certificate hasn't expired
- Verify domain matches certificate

**"ngrok URL keeps changing"**
- Use ngrok static domain (paid) OR
- Update DocuSign URL each time you restart ngrok

---

For detailed instructions, see [WEBHOOK_SSL_SETUP.md](./WEBHOOK_SSL_SETUP.md)

