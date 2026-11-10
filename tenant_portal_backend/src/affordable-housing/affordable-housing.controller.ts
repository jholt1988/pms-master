import { Controller, Get, Param, Post } from '@nestjs/common';
import { AffordableHousingService } from './affordable-housing.service';

@Controller('affordable-housing')
export class AffordableHousingController {
  constructor(private readonly svc: AffordableHousingService) {}

  @Get('eligibility/:tenantId')
  eligibility(@Param('tenantId') tenantId: string) { return this.svc.checkEligibility(tenantId); }

  @Post('recertify/:tenantId')
  recertify(@Param('tenantId') tenantId: string) { return this.svc.recertify(tenantId); }

  @Get('report/:program')
  report(@Param('program') program: string) { return this.svc.generateReport(program); }
}
