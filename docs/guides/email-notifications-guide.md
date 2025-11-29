# Email Notifications Guide - AI Leasing Agent

**Implementation Date:** November 9, 2025  
**Status:** ✅ Complete - Ready for Testing

## 📧 Overview

The AI Leasing Agent now sends automated email notifications to both prospects (leads) and property managers throughout the leasing workflow.

---

## 🎯 Email Types Implemented

### 1. **Lead Welcome Email** 🎉
**Trigger:** When a new lead provides their email address  
**Sent To:** Lead (prospect)  
**Purpose:** Acknowledge their inquiry and set expectations

**Contains:**
- Welcome message with lead's name
- What happens next (property search, tour scheduling, follow-up timeline)
- Contact information for direct reach-out
- Professional, friendly tone

### 2. **New Lead Notification to PM** 🚨
**Trigger:** When a new QUALIFIED lead is created with complete information  
**Sent To:** All Property Managers  
**Purpose:** Alert staff of new qualified prospects requiring follow-up

**Contains:**
- Lead information (name, email, phone, status)
- Requirements (bedrooms, budget, move-in date, pets)
- Preferences (amenities requested)
- Direct link to Lead Management Dashboard
- Timestamp of lead creation

### 3. **Tour Confirmation Email** ✅
**Trigger:** When a property tour is scheduled  
**Sent To:** Lead (prospect)  
**Purpose:** Confirm tour details and provide preparation guidance

**Contains:**
- Property address
- Date, time, and duration
- What to bring (ID, questions, measuring tape)
- Special notes (if any)
- Contact info for rescheduling

### 4. **Tour Reminder Email** ⏰
**Trigger:** 24 hours before scheduled tour (requires cron job - see below)  
**Sent To:** Lead (prospect)  
**Purpose:** Reduce no-shows with friendly reminder

**Contains:**
- Reminder it's tomorrow
- Property address
- Time confirmation
- Contact info for last-minute changes

### 5. **Application Received Email** 📝
**Trigger:** When a rental application is submitted  
**Sent To:** Lead (prospect)  
**Purpose:** Confirm receipt and outline next steps

**Contains:**
- Property address
- Submission timestamp
- Application ID for reference
- Processing timeline (2-3 business days)
- Next steps in the process
- Application fee status
- Contact info for questions

### 6. **Application Status Email** 📧
**Trigger:** When application status changes to APPROVED, CONDITIONALLY_APPROVED, or DENIED  
**Sent To:** Lead (prospect)  
**Purpose:** Notify applicant of decision

**Contains:**

#### Approved ✅
- Congratulations message
- Next steps (lease signing, deposits, move-in scheduling)
- 24-hour follow-up promise

#### Conditionally Approved 📋
- Good news message
- Additional requirements needed
- Timeline to complete conditions

#### Denied ❌
- Professional, empathetic message
- Optional review notes
- Thank you for interest

---

## 🔧 Technical Implementation

### Email Service Structure

**File:** `tenant_portal_backend/src/email/email.service.ts`

```typescript
// 6 New Methods Added:
sendLeadWelcomeEmail(lead)              // Welcome to new leads
sendNewLeadNotificationToPM(pmEmail, lead)  // Alert PMs
sendTourConfirmationEmail(tour, lead, property)  // Tour scheduled
sendTourReminderEmail(tour, lead, property)  // 24hr before tour
sendApplicationReceivedEmail(app, lead, property)  // App submitted
sendApplicationStatusEmail(app, lead, property, status)  // Decision made
```

### Email Templates

All emails include:
- **HTML version** - Beautifully formatted with inline CSS
- **Plain text version** - Automatically generated fallback
- **Responsive design** - Mobile-friendly
- **Brand colors** - Blue (#2563eb), Green (#10b981), Amber (#f59e0b)
- **Professional styling** - Clean, modern, accessible

### Service Integration

#### Leasing Service
```typescript
// File: leasing.service.ts
async upsertLead() {
  // Creates lead
  // → Sends welcome email if new lead with email
  // → Notifies all PMs if QUALIFIED status
}
```

#### Tours Service
```typescript
// File: tours.service.ts
async scheduleTour() {
  // Creates tour
  // → Sends tour confirmation to lead
}
```

#### Lead Applications Service
```typescript
// File: lead-applications.service.ts
async submitApplication() {
  // Creates application
  // → Sends application received confirmation
}

async updateApplicationStatus() {
  // Updates status
  // → Sends status email if APPROVED/CONDITIONALLY_APPROVED/DENIED
}
```

### Module Configuration

**File:** `leasing.module.ts`
```typescript
@Module({
  imports: [EmailModule],  // ← Added EmailModule import
  // ... controllers and providers
})
```

---

## ⚙️ Configuration

### Environment Variables

Add to `.env` file:

```bash
# Email Configuration
SMTP_HOST=smtp.gmail.com          # Or your SMTP provider
SMTP_PORT=587                     # 587 for TLS, 465 for SSL
SMTP_SECURE=false                 # true for 465, false for 587
SMTP_USER=your-email@gmail.com    # SMTP username
SMTP_PASS=your-app-password       # SMTP password (use app password for Gmail)
SMTP_FROM=noreply@propertymanagement.com  # From address

# Application URL (for links in emails)
APP_URL=http://localhost:3000     # Change to production URL
```

### Development Mode

**Automatic Console Logging:**
- Emails are NOT sent to real addresses in development
- Email content is logged to console instead
- Use `streamTransport` for testing

**Code Check:**
```typescript
// In email.service.ts constructor
if (process.env.NODE_ENV === 'development') {
  this.transporter = nodemailer.createTransport({
    streamTransport: true,
    newline: 'unix',
  });
}
```

### Production Mode

**Real SMTP Configuration:**
1. Set `NODE_ENV=production`
2. Configure SMTP credentials
3. Use real email provider (Gmail, SendGrid, AWS SES, etc.)

---

## 📧 SMTP Provider Setup

### Option 1: Gmail (Development/Testing)

1. **Enable 2-Factor Authentication** on your Google account
2. **Generate App Password:**
   - Go to: https://myaccount.google.com/apppasswords
   - Select "Mail" and "Other (Custom name)"
   - Copy the 16-character password
3. **Configure .env:**
   ```bash
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-16-char-app-password
   ```

**Gmail Limitations:**
- 500 emails/day for free accounts
- 2000 emails/day for Google Workspace
- Not recommended for production

### Option 2: SendGrid (Production Recommended)

1. **Sign up:** https://sendgrid.com
2. **Create API Key** with "Mail Send" permissions
3. **Configure .env:**
   ```bash
   SMTP_HOST=smtp.sendgrid.net
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=apikey
   SMTP_PASS=YOUR_SENDGRID_API_KEY
   ```

**SendGrid Benefits:**
- 100 emails/day free
- Reliable delivery
- Analytics dashboard
- Production-ready

### Option 3: AWS SES (High Volume)

1. **Create AWS Account**
2. **Set up SES** in AWS Console
3. **Verify domain** or email address
4. **Get SMTP credentials**
5. **Configure .env:**
   ```bash
   SMTP_HOST=email-smtp.us-east-1.amazonaws.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=YOUR_AWS_SMTP_USERNAME
   SMTP_PASS=YOUR_AWS_SMTP_PASSWORD
   ```

**AWS SES Benefits:**
- Very low cost ($0.10 per 1000 emails)
- Unlimited volume (after leaving sandbox)
- Enterprise-grade reliability

### Option 4: Ethereal Email (Testing Only)

**Perfect for development - fake SMTP service:**

1. **No signup needed** - auto-generated credentials
2. **View emails in browser** without sending to real addresses
3. **Code example:**
   ```typescript
   const testAccount = await nodemailer.createTestAccount();
   // Use testAccount.user and testAccount.pass
   ```

**Visit:** https://ethereal.email

---

## 🧪 Testing Email Notifications

### Test 1: Lead Welcome Email

**Steps:**
1. Open AI Leasing Agent chatbot at `/lease`
2. Chat with bot and provide email address:
   ```
   User: "Hi, I'm looking for an apartment"
   Bot: "Great! What's your name?"
   User: "My name is John Smith"
   Bot: "Do you have an email address?"
   User: "john.smith@example.com"
   ```
3. **Expected:** Welcome email sent to john.smith@example.com
4. **Check:** Console logs or email provider dashboard

**Expected Email:**
- Subject: "Welcome! Your Apartment Search Starts Here"
- Contains: Welcome message, next steps, contact info

### Test 2: Property Manager Notification

**Steps:**
1. Continue conversation from Test 1
2. Provide complete lead information:
   ```
   User: "I need a 2 bedroom apartment"
   User: "My budget is $1500 per month"
   User: "I want to move in December 1st"
   ```
3. Lead should transition to QUALIFIED status
4. **Expected:** Email sent to all Property Managers

**Expected Email:**
- Subject: "🎯 New Qualified Lead: John Smith"
- Contains: Full lead info, requirements, link to dashboard

### Test 3: Tour Confirmation

**Steps:**
1. Use API or PM dashboard to schedule a tour
2. **API Example:**
   ```bash
   curl -X POST http://localhost:3001/api/tours \
     -H "Content-Type: application/json" \
     -d '{
       "leadId": "abc123",
       "propertyId": 1,
       "scheduledDate": "2025-12-15",
       "scheduledTime": "2:00 PM",
       "notes": "Please bring ID"
     }'
   ```
3. **Expected:** Tour confirmation sent to lead's email

**Expected Email:**
- Subject: "✅ Tour Confirmed: [Property Address]"
- Contains: Date, time, duration, what to bring, property address

### Test 4: Application Received

**Steps:**
1. Submit rental application via API
2. **Expected:** Confirmation email sent immediately

**Expected Email:**
- Subject: "Application Received: [Property Address]"
- Contains: Application ID, next steps, timeline, fee status

### Test 5: Application Status Change

**Steps:**
1. Update application status using API:
   ```bash
   curl -X PATCH http://localhost:3001/api/applications/app123/status \
     -H "Content-Type: application/json" \
     -d '{
       "status": "APPROVED",
       "reviewNotes": "Excellent credit score and references"
     }'
   ```
2. **Expected:** Status update email sent

**Expected Emails:**
- **APPROVED:** "🎉 Application Approved!" with next steps
- **CONDITIONALLY_APPROVED:** "📋 Application Conditionally Approved"
- **DENIED:** "📧 Application Update" with professional message

---

## 🔍 Debugging Email Issues

### Check 1: Console Logs

Look for these log messages:
```
[EmailService] Lead welcome email sent to john@example.com: <messageId>
[EmailService] New lead notification sent to PM pm@company.com: <messageId>
[EmailService] Tour confirmation sent to john@example.com: <messageId>
[EmailService] Application received email sent to john@example.com: <messageId>
[EmailService] Application status email sent to john@example.com: <messageId>
```

### Check 2: Email Service Initialization

```bash
# Look for this on server startup:
[EmailService] Email service initialized with host: smtp.gmail.com
```

### Check 3: Environment Variables

```typescript
// Add this to email.service.ts constructor temporarily
console.log('SMTP Config:', {
  host: this.configService.get('SMTP_HOST'),
  port: this.configService.get('SMTP_PORT'),
  user: this.configService.get('SMTP_USER'),
  hasPass: !!this.configService.get('SMTP_PASS'),
});
```

### Common Issues & Solutions

#### Issue: Emails not sending
**Solutions:**
- Check SMTP credentials in .env
- Verify SMTP_PORT (587 for TLS, 465 for SSL)
- Check SMTP_SECURE matches port (false for 587, true for 465)
- Test with Ethereal Email first
- Check console for error messages

#### Issue: Gmail authentication error
**Solutions:**
- Enable 2-Factor Authentication
- Generate App Password (not your regular password)
- Use 16-character app password without spaces
- Check "Less secure app access" is OFF (use app password instead)

#### Issue: Emails in spam folder
**Solutions:**
- Use reputable SMTP provider (SendGrid, AWS SES)
- Set up SPF, DKIM, DMARC records for your domain
- Use verified from address
- Don't send from noreply@ in development

#### Issue: HTML formatting not working
**Solutions:**
- Check email client supports HTML
- Test in multiple email clients
- Plain text version should always work as fallback

---

## 📋 Email Trigger Summary

| Event | Email Sent | Recipient | Trigger Location |
|-------|-----------|-----------|------------------|
| New lead with email | Lead Welcome | Lead | `leasing.service.ts` - `upsertLead()` |
| Lead becomes QUALIFIED | New Lead Notification | All PMs | `leasing.service.ts` - `upsertLead()` |
| Tour scheduled | Tour Confirmation | Lead | `tours.service.ts` - `scheduleTour()` |
| 24hrs before tour | Tour Reminder | Lead | **REQUIRES CRON JOB** (see below) |
| Application submitted | Application Received | Lead | `lead-applications.service.ts` - `submitApplication()` |
| Status → APPROVED/CONDITIONALLY_APPROVED/DENIED | Application Status | Lead | `lead-applications.service.ts` - `updateApplicationStatus()` |

---

## ⏰ Tour Reminder Cron Job (TODO)

The tour reminder email requires a scheduled job to run daily and check for tours happening tomorrow.

### Implementation Plan:

**Option 1: NestJS Schedule Module**

1. **Install dependency:**
   ```bash
   npm install @nestjs/schedule
   ```

2. **Add to app.module.ts:**
   ```typescript
   import { ScheduleModule } from '@nestjs/schedule';
   
   @Module({
     imports: [ScheduleModule.forRoot()],
     // ...
   })
   ```

3. **Create scheduled task:**
   ```typescript
   // tours.service.ts
   import { Cron, CronExpression } from '@nestjs/schedule';
   
   @Cron(CronExpression.EVERY_DAY_AT_9AM)
   async sendTourReminders() {
     const tomorrow = new Date();
     tomorrow.setDate(tomorrow.getDate() + 1);
     
     const tours = await this.prisma.tour.findMany({
       where: {
         scheduledDate: {
           gte: new Date(tomorrow.setHours(0,0,0,0)),
           lt: new Date(tomorrow.setHours(23,59,59,999)),
         },
         status: 'SCHEDULED',
       },
       include: { lead: true, property: true },
     });
     
     for (const tour of tours) {
       if (tour.lead.email) {
         await this.emailService.sendTourReminderEmail(
           tour, tour.lead, tour.property
         );
       }
     }
   }
   ```

**Option 2: External Cron (Linux/Unix)**

```bash
# Add to crontab
0 9 * * * curl -X POST http://localhost:3001/api/tours/send-reminders
```

**Option 3: Cloud Services**
- AWS EventBridge
- Google Cloud Scheduler
- Azure Logic Apps

---

## 📊 Email Analytics (Future Enhancement)

**Recommendations:**
- Track email open rates (SendGrid, AWS SES provide this)
- Monitor delivery failures
- A/B test email subject lines
- Track click-through rates on dashboard links

**Implementation Ideas:**
- Add tracking pixels for opens
- Use UTM parameters on links
- Log email events in database
- Create admin dashboard for email metrics

---

## 🚀 Production Deployment Checklist

### Before Going Live:

- [ ] Set `NODE_ENV=production`
- [ ] Configure production SMTP provider (SendGrid/AWS SES)
- [ ] Update SMTP_FROM to company domain email
- [ ] Update APP_URL to production domain
- [ ] Set up SPF/DKIM/DMARC records
- [ ] Test all 6 email types in production
- [ ] Monitor email delivery rates
- [ ] Set up email failure alerts
- [ ] Document email templates for marketing review
- [ ] Add unsubscribe links if required by regulations
- [ ] Review CAN-SPAM Act compliance
- [ ] Test emails in multiple email clients (Gmail, Outlook, Apple Mail)
- [ ] Set up email rate limiting if needed
- [ ] Configure retry logic for failed sends
- [ ] Create email delivery monitoring dashboard

### Performance Considerations:

- **Async Operations:** All emails sent with `.catch()` to avoid blocking
- **Non-Critical:** Email failures don't break main workflow
- **Graceful Degradation:** System works without emails
- **Rate Limiting:** Consider implementing for high-volume scenarios
- **Queue System:** For large-scale deployments, use RabbitMQ or BullMQ

---

## 📝 Customization Guide

### Changing Email Content

**Location:** `tenant_portal_backend/src/email/email.service.ts`

**HTML Styling:**
- Modify inline CSS styles in `<div style="...">`
- Change colors, fonts, spacing
- Keep inline styles for email client compatibility

**Plain Text:**
- Edit text version for each email method
- Ensure it includes all critical information
- Test with email clients that disable HTML

### Adding New Email Types

1. **Add method to EmailService:**
   ```typescript
   async sendCustomEmail(data: any): Promise<void> {
     const mailOptions = {
       from: this.configService.get<string>('SMTP_FROM'),
       to: data.email,
       subject: 'Your Subject',
       html: `<div>Your HTML content</div>`,
       text: 'Your plain text version',
     };
     
     try {
       const info = await this.transporter.sendMail(mailOptions);
       this.logger.log(`Custom email sent: ${info.messageId}`);
     } catch (error) {
       this.logger.error('Failed to send custom email:', error);
     }
   }
   ```

2. **Call from service:**
   ```typescript
   await this.emailService.sendCustomEmail(data)
     .catch(err => console.error('Email failed:', err));
   ```

### Branding

**Update company information:**
- Company name
- Contact phone/email
- Logo (add as base64 or hosted image)
- Brand colors
- Footer text

---

## 🎉 Summary

**Email notifications are now fully integrated into the AI Leasing Agent!**

✅ **6 email types** covering entire leasing workflow  
✅ **Professional HTML templates** with plain text fallbacks  
✅ **Non-blocking async** - won't slow down the app  
✅ **Graceful error handling** - failures logged but don't break flow  
✅ **Development mode** - console logging for testing  
✅ **Production ready** - SMTP provider integration  
✅ **Customizable** - easy to modify templates and triggers  
✅ **Scalable** - supports high volume with proper SMTP provider

**Next Steps:**
1. Configure SMTP provider
2. Test all email types
3. Implement tour reminder cron job
4. Deploy to production
5. Monitor email delivery rates

---

**Questions or issues?** Check the debugging section or consult the email service code directly in `tenant_portal_backend/src/email/email.service.ts`.
