import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOkResponse } from '@nestjs/swagger';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UseApiEnvelope } from '../common/envelope/envelope.decorator';
import { OrgId } from '../common/org-context/org-id.decorator';
import { OperatorSecurityService } from './operator-security.service';

@Controller('operator-security')
@ApiBearerAuth('JWT-auth')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@UseApiEnvelope()
export class OperatorSecurityController {
  constructor(private readonly securityService: OperatorSecurityService) {}

  @Get()
  @ApiOkResponse({ schema: envelopeSchema('Security events workbench summary') })
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  getWorkbench(
    @OrgId() orgId: string,
    @Query('userId') userId?: string,
    @Query('username') username?: string,
    @Query('type') type?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.securityService.getWorkbench(orgId, {
      userId: userId ?? undefined,
      username: username ?? undefined,
      type: type ?? undefined,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
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
