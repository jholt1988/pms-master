import { Body, Controller, Get, Post, Query, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { apiOk, pagination } from '../common/api-envelope';
import { UseApiEnvelope } from '../common/envelope/envelope.decorator';
import { OrgContextGuard } from '../common/org-context/org-context.guard';
import { OrgId } from '../common/org-context/org-id.decorator';
import { CreateDecisionRecordInput, DecisionRecordService } from './decision-record.service';

@Controller('decisions')
@ApiBearerAuth('JWT-auth')
@UseGuards(AuthGuard('jwt'), RolesGuard, OrgContextGuard)
@UseApiEnvelope()
export class DecisionRecordController {
  constructor(private readonly decisions: DecisionRecordService) {}

  @Get()
  @ApiOkResponse({ schema: envelopeSchema('Decision records') })
  @ApiQuery({ name: 'workflowId', required: false })
  @ApiQuery({ name: 'entityType', required: false })
  @ApiQuery({ name: 'entityId', required: false })
  @ApiQuery({ name: 'take', required: false })
  @ApiQuery({ name: 'skip', required: false })
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  async list(
    @OrgId() orgId: string,
    @Query('workflowId') workflowId?: string,
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
    @Query('take') take?: string,
    @Query('skip') skip?: string,
  ) {
    const result = await this.decisions.list(orgId, {
      workflowId,
      entityType,
      entityId,
      take: take ? Number(take) : undefined,
      skip: skip ? Number(skip) : undefined,
    });
    return apiOk(result.data, pagination(result.total, result.skip, result.take));
  }

  @Post()
  @ApiCreatedResponse({ schema: envelopeSchema('Created decision record') })
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  create(@OrgId() orgId: string, @Request() req: any, @Body() body: Omit<CreateDecisionRecordInput, 'organizationId' | 'actorId'>) {
    return this.decisions.create({
      ...body,
      organizationId: orgId,
      actorId: req.user?.userId,
    });
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
