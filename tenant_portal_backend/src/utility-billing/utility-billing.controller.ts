import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { UtilityBillingService } from './utility-billing.service';
import { AuthGuard } from '@nestjs/passport';
import { OrgId } from '../common/org-context/org-id.decorator';

@Controller('utility-billing')
@UseGuards(AuthGuard('jwt'))
export class UtilityBillingController {
  constructor(private readonly service: UtilityBillingService) {}

  @Post('master-bill')
  recordMasterBill(@Body() data: any) {
    return this.service.recordMasterBill(data);
  }

  @Post('master-bill/:billId/allocate')
  allocateBill(@Param('billId') billId: string) {
    return this.service.allocateMasterBill(billId);
  }
}
