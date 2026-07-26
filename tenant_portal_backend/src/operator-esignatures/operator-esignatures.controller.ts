import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { EsignEnvelopeStatus, Role } from '@prisma/client';
import { ApiBearerAuth, ApiOkResponse } from '@nestjs/swagger';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UseApiEnvelope } from '../common/envelope/envelope.decorator';
import { OrgId } from '../common/org-context/org-id.decorator';
import { VoidEnvelopeDto } from '../esignature/dto/void-envelope.dto';
import { OperatorEsignaturesService } from './operator-esignatures.service';

type AuthenticatedRequest = Request & {
  user: {
    userId: string;
    username?: string;
    role: Role;
  };
};

@Controller('operator-esignatures')
@ApiBearerAuth('JWT-auth')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@UseApiEnvelope()
export class OperatorEsignaturesController {
  constructor(private readonly esignaturesService: OperatorEsignaturesService) {}

  @Get()
  @ApiOkResponse({ schema: envelopeSchema('Operator e-signature workbench') })
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  getWorkbench(
    @OrgId() orgId: string,
    @Request() req: AuthenticatedRequest,
    @Query('propertyId') propertyId?: string,
    @Query('status') status?: EsignEnvelopeStatus,
    @Query('limit') limit?: string,
  ) {
    return this.esignaturesService.getWorkbench(orgId, req.user, {
      propertyId,
      status,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Patch('envelopes/:envelopeId/void')
  @ApiOkResponse({ schema: envelopeSchema('Envelope voided') })
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  voidEnvelope(
    @OrgId() orgId: string,
    @Request() req: AuthenticatedRequest,
    @Param('envelopeId') envelopeId: string,
    @Body() dto: VoidEnvelopeDto,
  ) {
    return this.esignaturesService.voidEnvelope(orgId, this.actor(req), Number(envelopeId), dto);
  }

  @Post('envelopes/:envelopeId/resend')
  @HttpCode(200)
  @ApiOkResponse({ schema: envelopeSchema('Envelope notifications resent') })
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  resendEnvelope(
    @OrgId() orgId: string,
    @Request() req: AuthenticatedRequest,
    @Param('envelopeId') envelopeId: string,
  ) {
    return this.esignaturesService.resendEnvelope(orgId, this.actor(req), Number(envelopeId));
  }

  private actor(req: AuthenticatedRequest) {
    return {
      userId: req.user.userId,
      username: req.user.username ?? req.user.userId,
      role: req.user.role,
    };
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
