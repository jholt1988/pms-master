import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TenantInsuranceService } from './tenant-insurance.service';

@Injectable()
export class TenantInsuranceProcessor {
  constructor(private readonly insuranceService: TenantInsuranceService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleDailyExpirations() {
    await this.insuranceService.checkExpirations();
  }
}
