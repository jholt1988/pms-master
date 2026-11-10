import { Body, Controller, Param, Post } from '@nestjs/common';
import { CommercialLeaseService } from './commercial-lease.service';

@Controller('commercial-lease')
export class CommercialLeaseController {
  constructor(private readonly svc: CommercialLeaseService) {}

  @Post('nnn/:leaseId')
  nnn(@Param('leaseId') leaseId: string, @Body() body: any) { return this.svc.createNnnTerms(leaseId, body); }

  @Post('cam/:leaseId/:year')
  cam(@Param('leaseId') leaseId: string, @Param('year') year: string) { return this.svc.reconcileCam(leaseId, Number(year)); }
}
