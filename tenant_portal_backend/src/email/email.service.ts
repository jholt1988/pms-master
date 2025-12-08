import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LeadApplicationStatus } from '@prisma/client';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;
  private readonly isDevelopment: boolean;
  private readonly isTest: boolean;
  private readonly smtpConfigured: boolean;

  constructor(private readonly configService: ConfigService) {
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.isTest = process.env.NODE_ENV === 'test';
    
    // Check if SMTP is configured
    const host = this.configService.get<string>('SMTP_HOST');
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');
    this.smtpConfigured = !!(host && user && pass);

    this.initializeTransporter();
  }

  async onModuleInit() {
    // Verify transporter connection in non-test environments
    if (!this.isTest && this.smtpConfigured) {
      try {
        await this.transporter.verify();
        this.logger.log('✅ Email transporter verified successfully');
      } catch (error) {
        this.logger.warn(`⚠️  Email transporter verification failed: ${error instanceof Error ? error.message : String(error)}`);
        this.logger.warn('Emails may not be sent. Please check your SMTP configuration.');
      }
    } else if (!this.smtpConfigured && !this.isTest) {
      this.logger.warn('⚠️  SMTP not configured. Emails will be logged to console in development mode.');
    }
  }

  private initializeTransporter() {
    if (this.isTest) {
      // In test mode, create a no-op transporter
      this.transporter = nodemailer.createTransport({
        jsonTransport: true,
      });
      return;
    }

    if (this.smtpConfigured) {
      // Use real SMTP configuration
      const host = this.configService.get<string>('SMTP_HOST')!;
      const port = this.configService.get<number>('SMTP_PORT', 587);
      const secure = this.configService.get<boolean>('SMTP_SECURE', false);
      const user = this.configService.get<string>('SMTP_USER')!;
      const pass = this.configService.get<string>('SMTP_PASS')!;

      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure, // true for 465, false for other ports
        auth: {
          user,
          pass,
        },
        // Connection pool options
        pool: true,
        maxConnections: 5,
        maxMessages: 100,
      });

      this.logger.log(`Email transporter initialized with SMTP: ${host}:${port}`);
    } else if (this.isDevelopment) {
      // Development mode: Use console transport to log emails
      this.transporter = nodemailer.createTransport({
        jsonTransport: true, // This will log the email as JSON
      });
      this.logger.log('Email transporter initialized in development mode (emails will be logged)');
    } else {
      // Production without SMTP: Use a no-op transporter
      this.logger.error('❌ SMTP not configured in production! Emails will not be sent.');
      this.transporter = nodemailer.createTransport({
        jsonTransport: true,
      });
    }
  }

  private validateEmail(email: string): boolean {
    if (!email || typeof email !== 'string') {
      return false;
    }
    // Basic email validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  }

  private async dispatchEmail(options: nodemailer.SendMailOptions): Promise<void> {
    // Validate recipient email
    let recipientEmail: string;
    if (Array.isArray(options.to)) {
      recipientEmail = typeof options.to[0] === 'string' ? options.to[0] : options.to[0]?.address || '';
    } else if (typeof options.to === 'string') {
      recipientEmail = options.to;
    } else {
      recipientEmail = options.to?.address || '';
    }

    if (!recipientEmail || !this.validateEmail(recipientEmail)) {
      const error = new Error(`Invalid email address: ${recipientEmail}`);
      this.logger.error(error.message);
      throw error;
    }

    if (this.isTest) {
      this.logger.debug(`[TEST] Email skipped: to=${recipientEmail} subject=${options.subject}`);
      return;
    }

      try {
      if (this.smtpConfigured) {
        // Send real email via SMTP
        const info = await this.transporter.sendMail(options);
        this.logger.log(`✅ Email sent to ${recipientEmail}: ${info.messageId || 'N/A'}`);
      } else if (this.isDevelopment) {
        // Log email in development mode
        const emailPreview = {
          from: options.from,
          to: options.to,
          subject: options.subject,
          html: options.html ? (options.html as string).substring(0, 200) + '...' : undefined,
          text: options.text ? (options.text as string).substring(0, 200) + '...' : undefined,
        };
        this.logger.log('📧 [DEV MODE] Email would be sent:');
        this.logger.log(JSON.stringify(emailPreview, null, 2));
        
        // Also send via jsonTransport to get a preview
        const info = await this.transporter.sendMail(options);
        if (info && typeof info === 'object' && 'message' in info) {
          this.logger.debug(`Email preview: ${JSON.stringify(info)}`);
        }
      } else {
        // Production without SMTP - log error
        this.logger.error(`❌ Cannot send email to ${recipientEmail}: SMTP not configured`);
        throw new Error('Email service not configured. Please configure SMTP settings.');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to send email to ${recipientEmail}: ${errorMessage}`);
      // In development, don't throw errors for logging
      if (!this.isDevelopment || this.smtpConfigured) {
        throw error;
      }
    }
  }

  async sendPasswordResetEmail(email: string, resetToken: string, resetUrl?: string): Promise<void> {
    if (!this.validateEmail(email)) {
      throw new Error(`Invalid email address: ${email}`);
    }

    const appUrl = this.configService.get<string>('APP_URL', 'http://localhost:3000');
    const fullResetUrl = resetUrl || `${appUrl}/reset-password?token=${resetToken}`;
    const fromEmail = this.configService.get<string>('SMTP_FROM', 'noreply@propertymanagement.com');

    const mailOptions: nodemailer.SendMailOptions = {
      from: fromEmail,
      to: email,
      subject: 'Password Reset Request',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .button { display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
              .footer { margin-top: 30px; font-size: 12px; color: #666; }
            </style>
          </head>
          <body>
            <div class="container">
              <h2>Password Reset Request</h2>
              <p>You requested to reset your password. Click the button below to reset it:</p>
              <a href="${fullResetUrl}" class="button">Reset Password</a>
              <p>Or copy and paste this link into your browser:</p>
              <p><a href="${fullResetUrl}">${fullResetUrl}</a></p>
              <p><strong>This link will expire in 24 hours.</strong></p>
              <p>If you did not request this password reset, please ignore this email.</p>
              <div class="footer">
                <p>This is an automated message. Please do not reply to this email.</p>
              </div>
            </div>
          </body>
        </html>
      `,
      text: `
Password Reset Request

You requested to reset your password. Click the link below to reset it:
${fullResetUrl}

This link will expire in 24 hours.

If you did not request this, please ignore this email.

This is an automated message. Please do not reply to this email.
      `.trim(),
    };

    await this.dispatchEmail(mailOptions);
  }

  async sendNotificationEmail(email: string, subject: string, message: string): Promise<void> {
    if (!this.validateEmail(email)) {
      throw new Error(`Invalid email address: ${email}`);
    }

    if (!subject || !message) {
      throw new Error('Subject and message are required');
    }

    const fromEmail = this.configService.get<string>('SMTP_FROM', 'noreply@propertymanagement.com');
    
    // Strip HTML tags for plain text version, but preserve line breaks
    const textVersion = message
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .trim();

    const mailOptions: nodemailer.SendMailOptions = {
      from: fromEmail,
      to: email,
      subject,
      html: message,
      text: textVersion,
    };

    await this.dispatchEmail(mailOptions);
  }

  async sendRentDueReminder(email: string, amount: number, dueDate: Date): Promise<void> {
    const formattedAmount = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);

    const subject = 'Rent Due Reminder';
    const message = `
      <p>Hi there,</p>
      <p>This is a friendly reminder that your rent payment of <strong>${formattedAmount}</strong> is due on <strong>${dueDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</strong>.</p>
      <p>Please ensure your payment is submitted on time to avoid late fees.</p>
      <p>Thank you for your prompt attention to this matter.</p>
    `;
    await this.sendNotificationEmail(email, subject, message);
  }

  async sendLateRentNotification(email: string, amount: number, dueDate: Date): Promise<void> {
    const formattedAmount = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);

    const daysLate = Math.floor((new Date().getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
    const subject = 'Late Rent Notification - Action Required';
    const message = `
      <p>Hi there,</p>
      <p><strong>Important:</strong> Your rent payment of <strong>${formattedAmount}</strong> was due on <strong>${dueDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</strong>.</p>
      ${daysLate > 0 ? `<p>Your payment is now <strong>${daysLate} day${daysLate > 1 ? 's' : ''} overdue</strong>.</p>` : ''}
      <p>Please submit your payment immediately to avoid additional late fees and potential consequences.</p>
      <p>If you have already submitted your payment, please disregard this notice.</p>
      <p>If you are experiencing financial difficulties, please contact us as soon as possible to discuss payment arrangements.</p>
    `;
    await this.sendNotificationEmail(email, subject, message);
  }

  async sendRentPaymentConfirmation(email: string, amount: number, paymentDate: Date): Promise<void> {
    const formattedAmount = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);

    const subject = 'Rent Payment Confirmation';
    const message = `
      <p>Hi there,</p>
      <p>This email confirms that we have received your rent payment of <strong>${formattedAmount}</strong> on <strong>${paymentDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</strong>.</p>
      <p>Thank you for your timely payment!</p>
      <p>If you have any questions about this payment, please contact us.</p>
    `;
    await this.sendNotificationEmail(email, subject, message);
  }

  async sendLeadWelcomeEmail(lead: { name?: string; email?: string }): Promise<void> {
    if (!lead.email) {
      return;
    }

    const subject = 'Welcome to the Leasing Concierge';
    const message = `
      <p>Hi ${lead.name ?? 'there'},</p>
      <p>Thanks for reaching out! A leasing specialist will contact you shortly.</p>
    `;

    await this.sendNotificationEmail(lead.email, subject, message);
  }

  async sendNewLeadNotificationToPM(
    pmEmail: string,
    lead: { name?: string; email?: string; phone?: string },
  ): Promise<void> {
    if (!pmEmail) {
      return;
    }

    const subject = 'New qualified lead';
    const message = `
      <p>A new lead requires follow-up:</p>
      <ul>
        <li>Name: ${lead.name ?? 'Unknown'}</li>
        <li>Email: ${lead.email ?? 'N/A'}</li>
        <li>Phone: ${lead.phone ?? 'N/A'}</li>
      </ul>
    `;

    await this.sendNotificationEmail(pmEmail, subject, message);
  }

  async sendTourConfirmationEmail(
    tour: { scheduledDate?: Date; scheduledTime?: string; notes?: string },
    lead: { name?: string; email?: string },
    property: { name?: string; address?: string },
  ): Promise<void> {
    if (!lead?.email) {
      return;
    }

    const subject = `Tour Confirmed - ${property?.name ?? 'Property'}`;
    const scheduledAt =
      tour.scheduledDate
        ? `${tour.scheduledDate.toDateString()} ${tour.scheduledTime ?? ''}`.trim()
        : 'the scheduled time';
    const message = `
      <p>Hi ${lead.name ?? 'there'},</p>
      <p>Your tour for ${property?.name ?? 'the property'} is confirmed for ${scheduledAt}.</p>
      ${property?.address ? `<p>Address: ${property.address}</p>` : ''}
      ${tour.notes ? `<p>Notes: ${tour.notes}</p>` : ''}
      <p>We look forward to seeing you!</p>
    `;

    await this.sendNotificationEmail(lead.email, subject, message);
  }

  async sendTourReminderEmail(
    tour: { scheduledDate?: Date; scheduledTime?: string },
    lead: { name?: string; email?: string },
    property: { name?: string; address?: string },
  ): Promise<void> {
    if (!lead?.email) {
      return;
    }

    const subject = `Tour Reminder - ${property?.name ?? 'Property'}`;
    const scheduledAt =
      tour.scheduledDate
        ? `${tour.scheduledDate.toDateString()} ${tour.scheduledTime ?? ''}`.trim()
        : 'your scheduled time';
    const message = `
      <p>Hi ${lead.name ?? 'there'},</p>
      <p>This is a friendly reminder about your upcoming tour for ${property?.name ?? 'the property'} on ${scheduledAt}.</p>
      ${property?.address ? `<p>Address: ${property.address}</p>` : ''}
      <p>Please let us know if you need to reschedule.</p>
    `;

    await this.sendNotificationEmail(lead.email, subject, message);
  }

  async sendApplicationReceivedEmail(
    application: { submittedAt?: Date; property?: { name?: string } },
    lead: { name?: string; email?: string },
    property?: { name?: string; address?: string },
  ): Promise<void> {
    if (!lead?.email) {
      return;
    }

    const subject = `Application Received for ${property?.name ?? 'your selected property'}`;
    const submittedOn = application.submittedAt
      ? application.submittedAt.toDateString()
      : 'today';

    const message = `
      <p>Hi ${lead.name ?? 'there'},</p>
      <p>We've received your rental application for ${property?.name ?? 'the property'} on ${submittedOn}.</p>
      ${
        property?.address
          ? `<p>Property address: ${property.address}</p>`
          : ''
      }
      <p>Our team will review your information and follow up shortly.</p>
    `;

    await this.sendNotificationEmail(lead.email, subject, message);
  }

  async sendApplicationStatusEmail(
    application: { reviewedAt?: Date },
    lead: { name?: string; email?: string },
    property: { name?: string },
    status: LeadApplicationStatus,
  ): Promise<void> {
    if (!lead?.email) {
      return;
    }

    const subject = `Application Status Update - ${property?.name ?? 'Rental Application'}`;
    const friendlyStatus = status
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/^\w/, (c) => c.toUpperCase());

    const message = `
      <p>Hi ${lead.name ?? 'there'},</p>
      <p>Your application for ${property?.name ?? 'the property'} has been updated to <strong>${friendlyStatus}</strong>.</p>
      ${
        application.reviewedAt
          ? `<p>Reviewed on: ${application.reviewedAt.toDateString()}</p>`
          : ''
      }
      <p>Please contact us if you have any questions.</p>
    `;

    await this.sendNotificationEmail(lead.email, subject, message);
  }
}

