# Rent Payment Notifications Guide

**Implementation Date:** November 9, 2025  
**Status:** ✅ Complete - Ready for Integration

---

## 📧 Overview

Automated email notifications for rent payments keep tenants informed and reduce late payments. The system sends timely reminders, alerts, confirmations, and important notices throughout the payment lifecycle.

---

## 🎯 Email Notification Types

### 1. **Rent Due Reminder** 💰
**Trigger:** 5 days before rent due date  
**Sent To:** Tenant  
**Purpose:** Friendly reminder to pay rent on time

**Contains:**
- Days until payment is due
- Amount due with prominent display
- Due date with full formatting (e.g., "Monday, December 1st, 2025")
- Property and unit information
- Multiple payment options (online, ACH, check, in-person)
- Direct "Pay Now" button linking to payment portal
- Warning about late fees
- Contact information

**Visual Design:**
- Blue color scheme (#2563eb) - friendly and professional
- Payment amount prominently displayed in large font
- Clear call-to-action button
- Payment options in organized list

---

### 2. **Late Rent Notification** 🚨
**Trigger:** Day after rent due date (if unpaid)  
**Sent To:** Tenant  
**Purpose:** Urgent alert that rent is overdue with consequences

**Contains:**
- Days overdue (calculated automatically)
- Original rent amount
- Late fee amount (default $50, configurable)
- Total amount now due (rent + late fee)
- Original due date
- Serious consequences:
  - Additional late fees may accrue
  - Eviction proceedings warning
  - Credit score impact
- Prominent "Pay Now" button
- Hardship assistance information
- Payment plan options
- Contact information for help

**Visual Design:**
- Red color scheme (#dc2626) - urgent and attention-grabbing
- Multiple warning sections
- Large total due amount in red
- Serious but respectful tone
- Clear escalation path

**Business Logic:**
- Automatically calculates days late
- Adds late fee to total
- Provides escape routes (payment plans, hardship programs)
- Maintains professional relationship

---

### 3. **Rent Payment Confirmation** ✅
**Trigger:** Immediately after successful payment  
**Sent To:** Tenant  
**Purpose:** Receipt and confirmation of payment received

**Contains:**
- Payment amount with checkmark
- Payment date (full format)
- Payment method used
- Transaction ID for reference
- Property and unit information
- Receipt language ("save for your records")
- Link to view payment history
- Next payment due date (if available)
- Auto-pay promotion
- Appreciation message

**Visual Design:**
- Green color scheme (#10b981) - success and positive
- Clean receipt-style layout
- Professional documentation format
- Friendly thank you message

**Special Cases:**
- **Partial Payment:** Yellow warning box shows remaining balance
  - "You paid $X of $Y. Remaining balance: $Z"

---

### 4. **Rent Payment Failed** ❌
**Trigger:** When automatic payment is declined  
**Sent To:** Tenant  
**Purpose:** Alert tenant that payment didn't go through and action is needed

**Contains:**
- Payment amount that failed
- Due date (still applicable)
- Payment method that was attempted
- Specific failure reason (insufficient funds, expired card, etc.)
- Common reasons for declined payments
- 3-day deadline to resolve (avoid late fees)
- "Retry Payment" button
- Troubleshooting steps:
  - Update payment method
  - Contact bank
  - Try alternative method
  - Contact management for help

**Visual Design:**
- Red alert color scheme
- Urgent but helpful tone
- Action-oriented layout
- Clear deadline warning

**Technical Integration:**
- Receives failure reason from payment processor
- Links to retry payment page with prefilled information
- Can trigger follow-up reminders if not resolved

---

### 5. **Rent Increase Notice** 📢
**Trigger:** 30 days before rent increase effective date  
**Sent To:** Tenant  
**Purpose:** Legal notice of upcoming rent change

**Contains:**
- Current rent amount
- New rent amount (prominently displayed)
- Increase amount in dollars and percentage
- Effective date (full format)
- Property and unit information
- Explanation of reason for increase:
  - Market conditions
  - Property taxes
  - Insurance costs
  - Maintenance and improvements
- Legal notice period confirmation (30 days)
- Tenant options:
  - Continue lease with new amount
  - Discuss concerns with management
  - Give notice to vacate
- Contact management button
- Professional, respectful tone

**Visual Design:**
- Blue professional color scheme
- Clear before/after comparison
- Increase amount highlighted
- Multiple informational sections
- Respectful and explanatory tone

**Legal Compliance:**
- Provides required 30-day notice
- Documents in writing
- Includes effective date
- Outlines tenant options
- Maintains professional relationship

---

## 🔧 Technical Implementation

### Email Service Methods

**File:** `tenant_portal_backend/src/email/email.service.ts`

```typescript
// 5 New Methods Added:

sendRentDueReminder(tenant, lease, payment)
  // Sends 5 days before due date
  // Calculates days until due
  // Multiple payment options

sendLateRentNotification(tenant, lease, payment)
  // Sends after due date if unpaid
  // Calculates days late
  // Adds late fee to total
  // Urgent tone and warnings

sendRentPaymentConfirmation(tenant, lease, payment)
  // Sends immediately after payment
  // Serves as receipt
  // Shows transaction details
  // Promotes auto-pay

sendRentPaymentFailedNotification(tenant, lease, payment, reason)
  // Sends when auto-payment fails
  // Includes specific failure reason
  // Provides resolution steps
  // Links to retry page

sendRentIncreaseNotification(tenant, lease, oldRent, newRent, effectiveDate)
  // Sends 30 days before increase
  // Calculates increase amount and percentage
  // Legal compliance notice
  // Tenant options explained
```

### Data Requirements

#### Tenant Object
```typescript
{
  email: string;          // Required
  firstName?: string;     // Optional (fallback: "there")
  id: number;
}
```

#### Lease Object
```typescript
{
  id: number;
  unit?: {
    unitNumber: string;
    property: {
      address: string;
    }
  }
}
```

#### Payment Object
```typescript
{
  id: string;
  amount: number;                // Total rent amount
  dueDate: Date;                 // When payment is due
  amountPaid?: number;           // Actual amount paid (for confirmation)
  paidDate?: Date;               // When payment was made
  paymentMethod?: string;        // "Credit Card", "ACH", "Check", etc.
  transactionId?: string;        // Payment processor transaction ID
  lateFee?: number;              // Late fee amount (default: 50)
  nextDueDate?: Date;            // Next month's due date
  nextAmount?: number;           // Next month's amount
}
```

---

## 📅 Automated Scheduling with Cron Jobs

### Required Cron Jobs

#### 1. Rent Due Reminders (5 Days Before)
**Schedule:** Daily at 9:00 AM  
**Query:** Find all payments due in 5 days with status != 'PAID'

```typescript
// payments.service.ts
import { Cron, CronExpression } from '@nestjs/schedule';

@Cron(CronExpression.EVERY_DAY_AT_9AM)
async sendRentDueReminders() {
  const fiveDaysFromNow = new Date();
  fiveDaysFromNow.setDate(fiveDaysFromNow.getDate() + 5);
  
  const upcomingPayments = await this.prisma.rentPayment.findMany({
    where: {
      dueDate: {
        gte: new Date(fiveDaysFromNow.setHours(0, 0, 0, 0)),
        lt: new Date(fiveDaysFromNow.setHours(23, 59, 59, 999)),
      },
      status: { not: 'PAID' },
    },
    include: {
      lease: {
        include: {
          tenant: true,
          unit: {
            include: { property: true }
          }
        }
      }
    }
  });
  
  for (const payment of upcomingPayments) {
    if (payment.lease.tenant.email) {
      await this.emailService.sendRentDueReminder(
        payment.lease.tenant,
        payment.lease,
        payment
      );
    }
  }
  
  this.logger.log(`Sent ${upcomingPayments.length} rent due reminders`);
}
```

#### 2. Late Rent Notifications (Day After Due Date)
**Schedule:** Daily at 10:00 AM  
**Query:** Find all payments overdue with status != 'PAID'

```typescript
@Cron(CronExpression.EVERY_DAY_AT_10AM)
async sendLateRentNotifications() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  
  const overduePayments = await this.prisma.rentPayment.findMany({
    where: {
      dueDate: {
        lt: new Date(yesterday.setHours(23, 59, 59, 999)),
      },
      status: { not: 'PAID' },
    },
    include: {
      lease: {
        include: {
          tenant: true,
          unit: {
            include: { property: true }
          }
        }
      }
    }
  });
  
  for (const payment of overduePayments) {
    if (payment.lease.tenant.email) {
      await this.emailService.sendLateRentNotification(
        payment.lease.tenant,
        payment.lease,
        payment
      );
    }
  }
  
  this.logger.log(`Sent ${overduePayments.length} late rent notifications`);
}
```

### Setup Instructions

**1. Install NestJS Schedule Module:**
```bash
npm install @nestjs/schedule
```

**2. Import in App Module:**
```typescript
// app.module.ts
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    // ... other modules
  ],
})
```

**3. Add Cron Methods to Service:**
- Add to `payments.service.ts` or create dedicated `payment-notifications.service.ts`
- Import `@Cron` and `CronExpression` decorators
- Implement cron methods as shown above

---

## 💳 Payment Integration Triggers

### When Payments Are Processed

#### Success Flow
```typescript
// payments.controller.ts
@Post('process')
async processPayment(@Body() dto: ProcessPaymentDto) {
  try {
    // 1. Process payment with payment gateway
    const result = await this.paymentGateway.charge(dto);
    
    // 2. Update payment record
    const payment = await this.prisma.rentPayment.update({
      where: { id: dto.paymentId },
      data: {
        status: 'PAID',
        amountPaid: result.amount,
        paidDate: new Date(),
        paymentMethod: result.paymentMethod,
        transactionId: result.transactionId,
      },
      include: {
        lease: {
          include: {
            tenant: true,
            unit: { include: { property: true } }
          }
        }
      }
    });
    
    // 3. Send confirmation email
    if (payment.lease.tenant.email) {
      await this.emailService.sendRentPaymentConfirmation(
        payment.lease.tenant,
        payment.lease,
        payment
      );
    }
    
    return { success: true, payment };
  } catch (error) {
    // Handle payment failure (see failure flow)
  }
}
```

#### Failure Flow
```typescript
catch (error) {
  // 1. Log the failure
  this.logger.error(`Payment failed: ${error.message}`);
  
  // 2. Update payment record
  const payment = await this.prisma.rentPayment.update({
    where: { id: dto.paymentId },
    data: {
      status: 'FAILED',
      failureReason: error.message,
    },
    include: {
      lease: {
        include: {
          tenant: true,
          unit: { include: { property: true } }
        }
      }
    }
  });
  
  // 3. Send failure notification
  if (payment.lease.tenant.email) {
    await this.emailService.sendRentPaymentFailedNotification(
      payment.lease.tenant,
      payment.lease,
      payment,
      error.message
    );
  }
  
  return { success: false, error: 'Payment failed. Check your email for details.' };
}
```

#### Auto-Payment Flow
```typescript
// Run daily for tenants with auto-pay enabled
@Cron(CronExpression.EVERY_DAY_AT_1AM)
async processAutomaticPayments() {
  const today = new Date();
  
  // Find payments due today with auto-pay enabled
  const autoPayments = await this.prisma.rentPayment.findMany({
    where: {
      dueDate: {
        gte: new Date(today.setHours(0, 0, 0, 0)),
        lt: new Date(today.setHours(23, 59, 59, 999)),
      },
      status: 'PENDING',
      lease: {
        autoPayEnabled: true,
      }
    },
    include: {
      lease: {
        include: {
          tenant: true,
          unit: { include: { property: true } }
        }
      }
    }
  });
  
  for (const payment of autoPayments) {
    try {
      // Attempt automatic charge
      const result = await this.paymentGateway.chargeStoredPaymentMethod(
        payment.lease.tenant.id,
        payment.amount
      );
      
      // Update and send confirmation
      await this.prisma.rentPayment.update({
        where: { id: payment.id },
        data: {
          status: 'PAID',
          amountPaid: result.amount,
          paidDate: new Date(),
          paymentMethod: 'Auto-Pay',
          transactionId: result.transactionId,
        }
      });
      
      await this.emailService.sendRentPaymentConfirmation(
        payment.lease.tenant,
        payment.lease,
        payment
      );
      
    } catch (error) {
      // Send failure notification
      await this.emailService.sendRentPaymentFailedNotification(
        payment.lease.tenant,
        payment.lease,
        payment,
        error.message
      );
    }
  }
}
```

---

## 🧪 Testing Rent Notifications

### Test 1: Rent Due Reminder

**Manual Trigger (Development):**
```typescript
// Create test endpoint in payments.controller.ts
@Get('test/rent-reminder/:paymentId')
async testRentReminder(@Param('paymentId') paymentId: string) {
  const payment = await this.prisma.rentPayment.findUnique({
    where: { id: paymentId },
    include: {
      lease: {
        include: {
          tenant: true,
          unit: { include: { property: true } }
        }
      }
    }
  });
  
  await this.emailService.sendRentDueReminder(
    payment.lease.tenant,
    payment.lease,
    payment
  );
  
  return { message: 'Reminder sent!' };
}
```

**Test in Browser/Postman:**
```
GET http://localhost:3001/api/payments/test/rent-reminder/payment-id-123
```

**Expected Email:**
- Subject: "💰 Rent Payment Reminder - Due [Date]"
- Shows amount due prominently
- Lists payment options
- Includes "Pay Now" button
- Warning about late fees

---

### Test 2: Late Rent Notification

**Create test endpoint:**
```typescript
@Get('test/late-rent/:paymentId')
async testLateRent(@Param('paymentId') paymentId: string) {
  const payment = await this.prisma.rentPayment.findUnique({
    where: { id: paymentId },
    include: {
      lease: {
        include: {
          tenant: true,
          unit: { include: { property: true } }
        }
      }
    }
  });
  
  await this.emailService.sendLateRentNotification(
    payment.lease.tenant,
    payment.lease,
    payment
  );
  
  return { message: 'Late notice sent!' };
}
```

**Expected Email:**
- Subject: "🚨 URGENT: Rent Payment Overdue - Action Required"
- Red urgent styling
- Shows days overdue
- Late fee added to total
- Serious consequences listed
- Payment plan options

---

### Test 3: Payment Confirmation

**Trigger:** Complete a payment through the tenant portal or API

```bash
curl -X POST http://localhost:3001/api/payments/process \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "paymentId": "payment-123",
    "amount": 1500,
    "paymentMethod": "Credit Card"
  }'
```

**Expected Email:**
- Subject: "✅ Rent Payment Received - Thank You!"
- Green success styling
- Payment receipt with all details
- Transaction ID
- Link to payment history
- Auto-pay promotion

---

### Test 4: Payment Failed

**Simulate by using invalid payment info:**
```bash
curl -X POST http://localhost:3001/api/payments/process \
  -H "Content-Type: application/json" \
  -d '{
    "paymentId": "payment-123",
    "cardNumber": "0000000000000000",
    "amount": 1500
  }'
```

**Expected Email:**
- Subject: "❌ Rent Payment Failed - Action Required"
- Red alert styling
- Failure reason displayed
- Common causes listed
- "Retry Payment" button
- 3-day warning

---

### Test 5: Rent Increase Notice

**Create test endpoint:**
```typescript
@Get('test/rent-increase/:leaseId')
async testRentIncrease(
  @Param('leaseId') leaseId: number,
  @Query('oldRent') oldRent: number,
  @Query('newRent') newRent: number
) {
  const lease = await this.prisma.lease.findUnique({
    where: { id: leaseId },
    include: {
      tenant: true,
      unit: { include: { property: true } }
    }
  });
  
  const effectiveDate = new Date();
  effectiveDate.setDate(effectiveDate.getDate() + 30);
  
  await this.emailService.sendRentIncreaseNotification(
    lease.tenant,
    lease,
    parseFloat(oldRent as any),
    parseFloat(newRent as any),
    effectiveDate
  );
  
  return { message: 'Rent increase notice sent!' };
}
```

**Test:**
```
GET http://localhost:3001/api/payments/test/rent-increase/1?oldRent=1500&newRent=1600
```

**Expected Email:**
- Subject: "📢 Notice: Rent Increase Effective [Date]"
- Shows old vs new rent
- Calculates increase ($100, 6.7%)
- Explains reasons
- 30-day notice confirmation
- Tenant options listed

---

## 📊 Email Analytics & Tracking

### Metrics to Monitor

**Delivery Metrics:**
- Total emails sent per type
- Delivery success rate
- Bounce rate
- Open rate (if tracking pixels enabled)

**Business Metrics:**
- Reminder emails sent vs on-time payments
- Late notices sent vs total late payments
- Payment confirmation rate
- Failed payment retry success rate

**Implementation:**
```typescript
// Add to email.service.ts after sending
private async logEmailEvent(type: string, recipientId: number, success: boolean) {
  await this.prisma.emailLog.create({
    data: {
      type,
      recipientId,
      sentAt: new Date(),
      success,
    }
  });
}

// Create dashboard query
async getEmailStats(startDate: Date, endDate: Date) {
  const stats = await this.prisma.emailLog.groupBy({
    by: ['type'],
    where: {
      sentAt: { gte: startDate, lte: endDate }
    },
    _count: true,
    _sum: {
      success: true
    }
  });
  
  return stats;
}
```

---

## 🎨 Customization Guide

### Changing Late Fee Amount

**Default:** $50  
**Location:** `sendLateRentNotification()` method

```typescript
// Option 1: Hardcode different default
const lateFee = payment.lateFee || 75; // Changed to $75

// Option 2: Calculate percentage
const lateFee = payment.lateFee || (payment.amount * 0.05); // 5% of rent

// Option 3: Store in configuration
const lateFee = payment.lateFee || this.configService.get<number>('LATE_FEE_AMOUNT', 50);
```

### Changing Reminder Timeline

**Default:** 5 days before due date

```typescript
// In cron job - change to 3 days
const threeDaysFromNow = new Date();
threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

// Or 7 days
const sevenDaysFromNow = new Date();
sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
```

### Customizing Email Content

**Company Branding:**
1. Update logo (add to email template):
```html
<img src="https://yourdomain.com/logo.png" alt="Company Logo" style="width: 200px; margin-bottom: 20px;">
```

2. Change colors:
- Blue (#2563eb) → Your brand color
- Green (#10b981) → Your success color
- Red (#dc2626) → Your alert color

3. Update contact information:
- Phone: (555) 123-4567
- Email: payments@propertymanagement.com
- Office hours

**Payment Methods:**
- Add or remove payment options in templates
- Update portal URLs
- Add bank account details for checks

---

## 🚀 Production Deployment Checklist

### Before Going Live:

- [ ] Set up cron jobs for automated reminders
- [ ] Configure late fee amount in system settings
- [ ] Test all 5 email types with real tenant data
- [ ] Verify SMTP settings (see EMAIL_NOTIFICATIONS_GUIDE.md)
- [ ] Set up payment gateway integration
- [ ] Create email logs table for tracking
- [ ] Configure APP_URL environment variable
- [ ] Update all contact information in templates
- [ ] Test auto-pay functionality
- [ ] Review legal compliance for rent increase notices
- [ ] Set up monitoring/alerts for failed emails
- [ ] Create admin dashboard for email statistics
- [ ] Train property managers on email system
- [ ] Document escalation procedures for late payments
- [ ] Test timezone handling for cron jobs

### Legal Compliance:

- [ ] Verify notice periods comply with local laws
- [ ] Ensure rent increase notices meet state requirements
- [ ] Include required disclosures in all notices
- [ ] Maintain email delivery logs for legal records
- [ ] Provide opt-out option if required by law
- [ ] Include physical mailing address in footers

### Performance Considerations:

- [ ] Batch email sending to avoid rate limits
- [ ] Implement retry logic for failed sends
- [ ] Queue emails for high-volume processing
- [ ] Monitor email delivery times
- [ ] Set up failover SMTP provider

---

## 🔧 Troubleshooting

### Emails Not Sending

**Check:**
1. SMTP configuration in `.env`
2. Cron jobs are running (`npm run start:dev` shows cron logs)
3. Tenant has valid email address
4. Payment records have correct due dates
5. Console logs for error messages

### Late Fees Not Calculating

**Check:**
1. `lateFee` field in payment record
2. Default value in `sendLateRentNotification()` method
3. Date comparison logic in late payment detection

### Duplicate Emails

**Cause:** Cron job running multiple times or payment status not updated

**Fix:**
1. Add status check to prevent duplicate sends
2. Update payment record after sending reminder
3. Check cron schedule for overlaps

### Wrong Amounts Showing

**Check:**
1. Payment record has correct `amount` field
2. Partial payments handled correctly
3. Currency formatting (toFixed(2))
4. Late fee calculation

---

## 📝 Summary

**5 Rent Email Types Implemented:**

1. ✅ **Rent Due Reminder** - 5 days before, friendly blue design
2. ✅ **Late Rent Notification** - Day after due date, urgent red design
3. ✅ **Payment Confirmation** - Immediate, green receipt design
4. ✅ **Payment Failed** - When auto-pay fails, red alert with retry
5. ✅ **Rent Increase Notice** - 30 days before, professional blue design

**All Emails Include:**
- Professional HTML + plain text versions
- Mobile-responsive design
- Clear call-to-action buttons
- Contact information
- Property and unit details
- Transaction/payment details
- Legal compliance language (where required)

**Ready for Integration:**
- Add cron jobs for automated sending
- Integrate with payment processing
- Connect to tenant portal
- Set up monitoring and analytics

**Next Steps:**
1. Install @nestjs/schedule module
2. Create cron methods in payments service
3. Test each email type
4. Configure production SMTP
5. Deploy and monitor

---

**Questions?** Refer to EMAIL_NOTIFICATIONS_GUIDE.md for SMTP setup and general email configuration.
