import { Body, Controller, Get, HttpCode, Param, Post, Query, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { LeaseStatus, Role } from '@prisma/client';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse } from '@nestjs/swagger';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UseApiEnvelope } from '../common/envelope/envelope.decorator';
import { OrgContextGuard } from '../common/org-context/org-context.guard';
import { OrgId } from '../common/org-context/org-id.decorator';
import { OperatorLeaseSigningService } from './operator-lease-signing.service';
import { SendLeaseEnvelopePayload } from './operator-lease-signing.types';

type AuthenticatedRequest = Request & {
  user: {
    userId: string;
    username?: string;
    role: Role;
  };
};

@Controller('operator-lease-signing')
@ApiBearerAuth('JWT-auth')
@UseGuards(AuthGuard('jwt'), RolesGuard, OrgContextGuard)
@UseApiEnvelope()
export class OperatorLeaseSigningController {
  constructor(private readonly leaseSigningService: OperatorLeaseSigningService) {}

  @Get()
  @ApiOkResponse({ schema: envelopeSchema('Operator lease signing workbench') })
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  getWorkbench(
    @OrgId() orgId: string,
    @Request() req: AuthenticatedRequest,
    @Query('propertyId') propertyId?: string,
    @Query('status') status?: LeaseStatus,
    @Query('limit') limit?: string,
  ) {
    return this.leaseSigningService.getWorkbench(orgId, req.user, {
      propertyId,
      status,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Post('leases/:leaseId/generate-packet')
  @HttpCode(201)
  @ApiCreatedResponse({ schema: envelopeSchema('Generated lease packet') })
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  generatePacket(@OrgId() orgId: string, @Request() req: AuthenticatedRequest, @Param('leaseId') leaseId: string) {
    return this.leaseSigningService.generatePacket(orgId, req.user, leaseId);
  }

  @Post('leases/:leaseId/send-envelope')
  @HttpCode(201)
  @ApiCreatedResponse({ schema: envelopeSchema('Created e-signature envelope') })
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  sendEnvelope(
    @OrgId() orgId: string,
    @Request() req: AuthenticatedRequest,
    @Param('leaseId') leaseId: string,
    @Body() payload: SendLeaseEnvelopePayload,
  ) {
    return this.leaseSigningService.sendEnvelope(orgId, req.user, leaseId, payload);
  }

  @Post('envelopes/:envelopeId/refresh')
  @HttpCode(200)
  @ApiOkResponse({ schema: envelopeSchema('Refreshed e-signature envelope') })
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  refreshEnvelope(@OrgId() orgId: string, @Request() req: AuthenticatedRequest, @Param('envelopeId') envelopeId: string) {
    return this.leaseSigningService.refreshEnvelope(orgId, req.user, Number(envelopeId));
  }

  @Post('envelopes/:envelopeId/resend')
  @HttpCode(200)
  @ApiOkResponse({ schema: envelopeSchema('Resent e-signature notifications') })
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  resendEnvelope(@OrgId() orgId: string, @Request() req: AuthenticatedRequest, @Param('envelopeId') envelopeId: string) {
    return this.leaseSigningService.resendEnvelope(orgId, req.user.userId, Number(envelopeId));
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
