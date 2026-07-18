import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOkResponse } from '@nestjs/swagger';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UseApiEnvelope } from '../common/envelope/envelope.decorator';
import { OrgId } from '../common/org-context/org-id.decorator';
import { OperatorWorkflowsService } from './operator-workflows.service';

@Controller('operator-workflows')
@ApiBearerAuth('JWT-auth')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@UseApiEnvelope()
export class OperatorWorkflowsController {
  constructor(private readonly service: OperatorWorkflowsService) {}

  @Get()
  @ApiOkResponse({ schema: envelopeSchema('Operator workflow inventory') })
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  getWorkflows(@OrgId() orgId: string) {
    return this.service.getWorkflows(orgId);
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
