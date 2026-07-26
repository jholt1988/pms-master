import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse } from '@nestjs/swagger';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UseApiEnvelope } from '../common/envelope/envelope.decorator';
import { OrgId } from '../common/org-context/org-id.decorator';
import { OperatorVendorsService } from './operator-vendors.service';

@Controller('operator-vendors')
@ApiBearerAuth('JWT-auth')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@UseApiEnvelope()
export class OperatorVendorsController {
  constructor(private readonly vendorsService: OperatorVendorsService) {}

  @Get()
  @ApiOkResponse({ schema: envelopeSchema('Operator vendors workbench with metrics') })
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  getWorkbench(@OrgId() orgId: string) {
    return this.vendorsService.getWorkbench(orgId);
  }

  @Post()
  @ApiCreatedResponse({ schema: envelopeSchema('Created vendor') })
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  create(@OrgId() orgId: string, @Body() createDto: any) {
    return this.vendorsService.create(orgId, createDto);
  }

  @Get('1099-export')
  @ApiOkResponse({ schema: envelopeSchema('1099 export result') })
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  export1099s(@OrgId() orgId: string) {
    return this.vendorsService.generate1099Export(orgId);
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
