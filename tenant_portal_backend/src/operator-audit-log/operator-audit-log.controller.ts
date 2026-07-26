import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOkResponse, ApiQuery } from '@nestjs/swagger';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UseApiEnvelope } from '../common/envelope/envelope.decorator';
import { OrgId } from '../common/org-context/org-id.decorator';
import { OperatorAuditLogService } from './operator-audit-log.service';

@Controller('operator-audit-log')
@ApiBearerAuth('JWT-auth')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@UseApiEnvelope()
export class OperatorAuditLogController {
  constructor(private readonly service: OperatorAuditLogService) {}

  @Get()
  @ApiOkResponse({ schema: envelopeSchema('Operator audit log workbench') })
  @ApiQuery({ name: 'entityId', required: false })
  @ApiQuery({ name: 'module', required: false })
  @ApiQuery({ name: 'actorId', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'skip', required: false })
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  getWorkbench(
    @OrgId() orgId: string,
    @Query('entityId') entityId?: string,
    @Query('module') module?: string,
    @Query('actorId') actorId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
    @Query('skip') skip?: string,
  ) {
    return this.service.getWorkbench(orgId, {
      entityId,
      module,
      actorId,
      startDate,
      endDate,
      limit: limit ? parseInt(limit, 10) : 50,
      skip: skip ? parseInt(skip, 10) : 0,
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
