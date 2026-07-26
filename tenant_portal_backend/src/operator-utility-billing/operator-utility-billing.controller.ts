import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse } from '@nestjs/swagger';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UseApiEnvelope } from '../common/envelope/envelope.decorator';
import { OrgId } from '../common/org-context/org-id.decorator';
import { OperatorUtilityBillingService } from './operator-utility-billing.service';

@Controller('operator-utility-billing')
@ApiBearerAuth('JWT-auth')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@UseApiEnvelope()
export class OperatorUtilityBillingController {
  constructor(private readonly service: OperatorUtilityBillingService) {}

  @Get()
  @ApiOkResponse({ schema: envelopeSchema('Operator utility billing workbench') })
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  getWorkbench(@OrgId() orgId: string) {
    return this.service.getWorkbench(orgId);
  }

  @Post('master-bill')
  @ApiCreatedResponse({ schema: envelopeSchema('Created master utility bill') })
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  createMasterBill(@OrgId() orgId: string, @Body() data: any) {
    return this.service.createMasterBill(orgId, data);
  }

  @Post('master-bill/:billId/allocate')
  @ApiOkResponse({ schema: envelopeSchema('Allocated master utility bill') })
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  allocateBill(@OrgId() orgId: string, @Param('billId') billId: string) {
    return this.service.allocateBill(orgId, billId);
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
