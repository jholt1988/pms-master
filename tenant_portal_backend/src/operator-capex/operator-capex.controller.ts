import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse } from '@nestjs/swagger';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UseApiEnvelope } from '../common/envelope/envelope.decorator';
import { OrgId } from '../common/org-context/org-id.decorator';
import { OperatorCapexService } from './operator-capex.service';

@Controller('operator-capex')
@ApiBearerAuth('JWT-auth')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@UseApiEnvelope()
export class OperatorCapexController {
  constructor(private readonly capexService: OperatorCapexService) {}

  @Get()
  @ApiOkResponse({ schema: envelopeSchema('Capex workbench — forecasts, metrics, and summary') })
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  getWorkbench(@OrgId() orgId: string) {
    return this.capexService.getWorkbench(orgId);
  }

  @Post('forecasts')
  @ApiCreatedResponse({ schema: envelopeSchema('Created forecast') })
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  createForecast(@OrgId() orgId: string, @Body() dto: any) {
    return this.capexService.createForecast(orgId, dto);
  }

  @Patch('forecasts/:id/approve')
  @ApiOkResponse({ schema: envelopeSchema('Approved forecast') })
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  approveForecast(
    @OrgId() orgId: string,
    @Param('id') id: string,
    @Body('approvedBudget') approvedBudget: number,
  ) {
    return this.capexService.approveForecast(orgId, id, approvedBudget);
  }

  @Patch('forecasts/:id/complete')
  @ApiOkResponse({ schema: envelopeSchema('Completed forecast') })
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  completeForecast(
    @OrgId() orgId: string,
    @Param('id') id: string,
    @Body('actualCostCents') actualCostCents: number,
  ) {
    return this.capexService.completeForecast(orgId, id, actualCostCents);
  }

  @Post('properties/:propertyId/generate')
  @ApiCreatedResponse({ schema: envelopeSchema('Generated AI forecasts') })
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  generateForecasts(
    @OrgId() orgId: string,
    @Param('propertyId') propertyId: string,
  ) {
    return this.capexService.generateForecasts(orgId, propertyId);
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
