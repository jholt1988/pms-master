import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LeadApplicationStatus } from '@prisma/client';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    // Initialize email transporter
    // In production, configure with real SMTP settings
    // For development, can use ethereal.email or similar
    const host = this.configService.get<string>('SMTP_HOST', 'localhost');
    const port = this.configService.get<number>('SMTP_PORT', 587);
    const secure = this.configService.get<boolean>('SMTP_SECURE', false);
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: user && pass ? { user, pass } : undefined,
      // For development/testing without real SMTP
      ...(process.env.NODE_ENV === 'development' && !user && {
        // Use console transport for development
        streamTransport: true,
        newline: 'unix',
        buffer: true,
      }),
    });
  }

  private isTestEnv() {
    return process.env.NODE_ENV === 'test';
  }

  private async dispatchEmail(options: nodemailer.SendMailOptions) {
    if (this.isTestEnv()) {
      this.logger.debug(`[test] Email skipped: to=${options.to} subject=${options.subject}`);
      return;
    }

    const info = await this.transporter.sendMail(options);
    this.logger.log(`Email sent to ${options.to}: ${info.messageId}`);
  }

  async sendPasswordResetEmail(email: string, resetToken: string, resetUrl: string): Promise<void> {
    const appUrl = this.configService.get<string>('APP_URL', 'http://localhost:3000');
    const fullResetUrl = resetUrl || `${appUrl}/reset-password?token=${resetToken}`;

    const mailOptions = {
      from: this.configService.get<string>('SMTP_FROM', 'noreply@propertymanagement.com'),
      to: email,
      subject: 'Password Reset Request',
      html: `
        <h2>Password Reset Request</h2>
        <p>You requested to reset your password. Click the link below to reset it:</p>
        <p><a href="${fullResetUrl}">${fullResetUrl}</a></p>
        <p>This link will expire in 24 hours.</p>
        <p>If you did not request this, please ignore this email.</p>
      `,
      text: `
        Password Reset Request
        
        You requested to reset your password. Click the link below to reset it:
        ${fullResetUrl}
        
        This link will expire in 24 hours.
        
        If you did not request this, please ignore this email.
      `,
    };

    try {
      await this.dispatchEmail(mailOptions);
    } catch (error) {
      this.logger.error(`Failed to send password reset email to ${email}:`, error);
      throw error;
    }
  }

  async sendNotificationEmail(email: string, subject: string, message: string): Promise<void> {
    const mailOptions = {
      from: this.configService.get<string>('SMTP_FROM', 'noreply@propertymanagement.com'),
      to: email,
      subject,
      html: message,
      text: message.replace(/<[^>]*>/g, ''),
    };

    try {
      await this.dispatchEmail(mailOptions);
    } catch (error) {
      this.logger.error(`Failed to send notification email to ${email}:`, error);
      throw error;
    }
  }

  async sendRentDueReminder(email: string, amount: number, dueDate: Date): Promise<void> {
    const subject = 'Rent Due Reminder';
    const message = `
      <p>Hi ${email},</p>
      <p>Your rent is due on ${dueDate.toDateString()}. Please pay your rent to avoid late fees.</p>
    `;
    await this.sendNotificationEmail(email, subject, message);
  }

  async sendLateRentNotification(email: string, amount: number, dueDate: Date): Promise<void> {
    const subject = 'Late Rent Notification';
    const message = `
      <p>Hi ${email},</p>
      <p>Your rent is due on ${dueDate.toDateString()}. Please pay your rent to avoid late fees.</p>
    `;
    await this.sendNotificationEmail(email, subject, message);
  }

  async sendRentPaymentConfirmation(email: string, amount: number, dueDate: Date): Promise<void> {
    const subject = 'Rent Payment Confirmation';
    const message = `
      <p>Hi ${email},</p>
      <p>Your rent payment of ${amount} has been received on ${dueDate.toDateString()}.</p>
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

