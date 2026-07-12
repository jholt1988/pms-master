import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';
import { ApiBearerAuth, ApiOkResponse, ApiQuery } from '@nestjs/swagger';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UseApiEnvelope } from '../common/envelope/envelope.decorator';
import { OrgId } from '../common/org-context/org-id.decorator';
import { OperatorPaymentsService } from './operator-payments.service';

type AuthenticatedRequest = Request & {
  user: {
    userId: string;
    role: Role;
  };
};

@Controller('operator-payments')
@ApiBearerAuth('JWT-auth')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@UseApiEnvelope()
export class OperatorPaymentsController {
  constructor(private readonly service: OperatorPaymentsService) {}

  @Get()
  @ApiOkResponse({ schema: envelopeSchema('Operator payment workbench') })
  @ApiQuery({ name: 'propertyId', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  getWorkbench(
    @OrgId() orgId: string,
    @Request() req: AuthenticatedRequest,
    @Query('propertyId') propertyId?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.getWorkbench(orgId, req.user, {
      propertyId,
      limit: limit ? Number(limit) : undefined,
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
