import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse } from '@nestjs/swagger';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UseApiEnvelope } from '../common/envelope/envelope.decorator';
import { OrgId } from '../common/org-context/org-id.decorator';
import { OperatorTenantInsuranceService } from './operator-tenant-insurance.service';

@Controller('operator-tenant-insurance')
@ApiBearerAuth('JWT-auth')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@UseApiEnvelope()
export class OperatorTenantInsuranceController {
  constructor(private readonly service: OperatorTenantInsuranceService) {}

  @Get()
  @ApiOkResponse({ schema: envelopeSchema('Operator tenant insurance workbench') })
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  getWorkbench(@OrgId() orgId: string) {
    return this.service.getWorkbench(orgId);
  }

  @Post('lease/:leaseId')
  @ApiCreatedResponse({ schema: envelopeSchema('Recorded insurance policy') })
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  recordPolicy(@OrgId() orgId: string, @Param('leaseId') leaseId: string, @Body() data: any) {
    return this.service.recordPolicy(orgId, leaseId, data);
  }

  @Get('lease/:leaseId')
  @ApiOkResponse({ schema: envelopeSchema('Insurance policies for lease') })
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  getPolicies(@OrgId() orgId: string, @Param('leaseId') leaseId: string) {
    return this.service.getPolicies(orgId, leaseId);
  }
}

function envelopeSchema(description: string) {
  return {
    type: 'object',
    description,
    required: ['data', 'meta', 'errors'],
    properties: {
      data: { type: 'object', additionalProperties: true },
      meta: { type: 'object', additionalProperties: true },
      errors: { type: 'array', items: { type: 'object', additionalProperties: true } },
    },
  };
}
