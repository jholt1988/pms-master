import { Body, Controller, Param, Post } from '@nestjs/common';
import { DepositAlternativesService } from './deposit-alternatives.service';

@Controller('deposit-alternatives')
export class DepositAlternativesController {
  constructor(private readonly svc: DepositAlternativesService) {}

  @Post('plans/:leaseId')
  create(@Param('leaseId') leaseId: string, @Body() body: any) {
    return this.svc.createInstallmentPlan(leaseId, body.totalCents, body.installments);
  }

  @Post('plans/:planId/charge')
  charge(@Param('planId') planId: string) { return this.svc.processInstallment(planId); }
}
