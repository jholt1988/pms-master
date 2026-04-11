import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { TenantInsuranceService } from './tenant-insurance.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('tenant-insurance')
@UseGuards(AuthGuard('jwt'))
export class TenantInsuranceController {
  constructor(private readonly service: TenantInsuranceService) {}

  @Post('lease/:leaseId')
  create(@Param('leaseId') leaseId: string, @Body() data: any) {
    return this.service.recordPolicy(leaseId, data);
  }

  @Get('lease/:leaseId')
  findByLease(@Param('leaseId') leaseId: string) {
    return this.service.getPoliciesByLease(leaseId);
  }
}
