import { Body, Controller, Param, Post } from '@nestjs/common';
import { DepositItemizationService } from './deposit-itemization.service';

@Controller('deposit-itemization')
export class DepositItemizationController {
  constructor(private readonly svc: DepositItemizationService) {}

  @Post(':leaseId')
  create(@Param('leaseId') leaseId: string, @Body() body: any) { return this.svc.createItemization(leaseId, body.items); }

  @Post(':leaseId/finalize')
  finalize(@Param('leaseId') leaseId: string) { return this.svc.finalize(leaseId); }
}
