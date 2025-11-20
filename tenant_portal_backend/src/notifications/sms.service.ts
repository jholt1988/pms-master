import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  async sendSms(to: string, message: string) {
    if (!to) {
      return;
    }

    this.logger.log(`SMS to ${to}: ${message}`);
  }
}
