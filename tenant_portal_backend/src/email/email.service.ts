import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Password reset email sent to ${email}: ${info.messageId}`);
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
      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Notification email sent to ${email}: ${info.messageId}`);
    } catch (error) {
      this.logger.error(`Failed to send notification email to ${email}:`, error);
      throw error;
    }
  }
}

