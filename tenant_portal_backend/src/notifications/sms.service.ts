import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly enabled: boolean;
  private readonly provider: 'TWILIO' | 'AWS_SNS' | 'MOCK';
  private readonly twilioAccountSid?: string;
  private readonly twilioAuthToken?: string;
  private readonly twilioFromNumber?: string;
  private readonly awsSnsRegion?: string;

  constructor(private readonly configService: ConfigService) {
    this.enabled = this.configService.get<string>('SMS_ENABLED', 'false') === 'true';
    this.provider = (this.configService.get<string>('SMS_PROVIDER', 'MOCK') as 'TWILIO' | 'AWS_SNS' | 'MOCK');
    this.twilioAccountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
    this.twilioAuthToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');
    this.twilioFromNumber = this.configService.get<string>('TWILIO_FROM_NUMBER');
    this.awsSnsRegion = this.configService.get<string>('AWS_SNS_REGION', 'us-east-1');

    if (this.enabled && this.provider === 'MOCK') {
      this.logger.warn('SMS service enabled but using MOCK provider - SMS will be logged only');
    } else if (this.enabled) {
      this.logger.log(`SMS service initialized with provider: ${this.provider}`);
    }
  }

  /**
   * Send SMS message
   * @param to Phone number in E.164 format (e.g., +1234567890)
   * @param message Message text
   */
  async sendSms(to: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!to) {
      this.logger.warn('SMS send attempted with empty phone number');
      return { success: false, error: 'Phone number is required' };
    }

    if (!this.enabled) {
      this.logger.debug(`SMS disabled - would send to ${to}: ${message}`);
      return { success: false, error: 'SMS service is disabled' };
    }

    // Validate phone number format (basic E.164 check)
    if (!/^\+[1-9]\d{1,14}$/.test(to)) {
      this.logger.warn(`Invalid phone number format: ${to}`);
      return { success: false, error: 'Invalid phone number format. Must be in E.164 format (e.g., +1234567890)' };
    }

    try {
      switch (this.provider) {
        case 'TWILIO':
          return await this.sendViaTwilio(to, message);
        case 'AWS_SNS':
          return await this.sendViaAwsSns(to, message);
        case 'MOCK':
        default:
          this.logger.log(`[MOCK SMS] To: ${to}, Message: ${message}`);
          return { success: true, messageId: `mock-${Date.now()}` };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to send SMS to ${to}:`, errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Send SMS via Twilio
   */
  private async sendViaTwilio(to: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.twilioAccountSid || !this.twilioAuthToken || !this.twilioFromNumber) {
      this.logger.error('Twilio credentials not configured');
      return { success: false, error: 'Twilio credentials not configured' };
    }

    try {
      // In a real implementation, you would use the Twilio SDK:
      // const twilio = require('twilio');
      // const client = twilio(this.twilioAccountSid, this.twilioAuthToken);
      // const result = await client.messages.create({
      //   body: message,
      //   from: this.twilioFromNumber,
      //   to: to,
      // });
      // return { success: true, messageId: result.sid };

      // For now, log the action
      this.logger.log(`[TWILIO SMS] To: ${to}, From: ${this.twilioFromNumber}, Message: ${message}`);
      return { success: true, messageId: `twilio-${Date.now()}` };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Twilio SMS failed:`, errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Send SMS via AWS SNS
   */
  private async sendViaAwsSns(to: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      // In a real implementation, you would use the AWS SDK:
      // const AWS = require('aws-sdk');
      // const sns = new AWS.SNS({ region: this.awsSnsRegion });
      // const result = await sns.publish({
      //   PhoneNumber: to,
      //   Message: message,
      // }).promise();
      // return { success: true, messageId: result.MessageId };

      // For now, log the action
      this.logger.log(`[AWS SNS SMS] To: ${to}, Region: ${this.awsSnsRegion}, Message: ${message}`);
      return { success: true, messageId: `sns-${Date.now()}` };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`AWS SNS SMS failed:`, errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Validate phone number format
   */
  validatePhoneNumber(phone: string): boolean {
    if (!phone) {
      return false;
    }
    // E.164 format: +[country code][number]
    return /^\+[1-9]\d{1,14}$/.test(phone);
  }
}
