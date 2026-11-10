import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { TrustAccountingService } from './trust-accounting.service';

@Controller('trust-accounting')
export class TrustAccountingController {
  constructor(private readonly svc: TrustAccountingService) {}

  @Get('accounts/:orgId')
  list(@Param('orgId') orgId: string) { return this.svc.listAccounts(orgId); }

  @Post('accounts')
  create(@Body() body: any) { return this.svc.createAccount(body); }

  @Post('accounts/:id/transactions')
  record(@Param('id') id: string, @Body() body: any) { return this.svc.recordTransaction(id, body); }

  @Post('accounts/:id/reconcile')
  reconcile(@Param('id') id: string) { return this.svc.reconcile(id); }
}
