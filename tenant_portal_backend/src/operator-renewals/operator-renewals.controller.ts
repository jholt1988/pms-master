import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse } from '@nestjs/swagger';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UseApiEnvelope } from '../common/envelope/envelope.decorator';
import { OrgContextGuard } from '../common/org-context/org-context.guard';
import { OrgId } from '../common/org-context/org-id.decorator';
import {
  CreateRenewalOfferPayload,
  RecordMoveOutPayload,
  RecordRenewalResponsePayload,
  SendRenewalSignaturePayload,
} from './operator-renewals.types';
import { OperatorRenewalsService } from './operator-renewals.service';

type AuthenticatedRequest = Request & { user: { userId: string; username?: string; role: Role } };

@Controller('operator-renewals')
@ApiBearerAuth('JWT-auth')
@UseGuards(AuthGuard('jwt'), RolesGuard, OrgContextGuard)
@UseApiEnvelope()
export class OperatorRenewalsController {
  constructor(private readonly renewalsService: OperatorRenewalsService) {}

  @Get()
  @ApiOkResponse({ schema: envelopeSchema('Operator renewal workflow workbench') })
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  getWorkbench(
    @OrgId() orgId: string,
    @Request() req: AuthenticatedRequest,
    @Query('propertyId') propertyId?: string,
    @Query('days') days?: string,
    @Query('limit') limit?: string,
  ) {
    return this.renewalsService.getWorkbench(orgId, req.user, {
      propertyId,
      days: days ? Number(days) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Post('leases/:leaseId/offers')
  @HttpCode(201)
  @ApiCreatedResponse({ schema: envelopeSchema('Created renewal offer') })
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  createOffer(@OrgId() orgId: string, @Request() req: AuthenticatedRequest, @Param('leaseId') leaseId: string, @Body() payload: CreateRenewalOfferPayload) {
    return this.renewalsService.createOffer(orgId, req.user, leaseId, payload);
  }

  @Post('leases/:leaseId/offers/:offerId/response')
  @HttpCode(200)
  @ApiOkResponse({ schema: envelopeSchema('Recorded renewal response') })
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  recordResponse(
    @OrgId() orgId: string,
    @Request() req: AuthenticatedRequest,
    @Param('leaseId') leaseId: string,
    @Param('offerId') offerId: string,
    @Body() payload: RecordRenewalResponsePayload,
  ) {
    return this.renewalsService.recordResponse(orgId, req.user, leaseId, Number(offerId), payload);
  }

  @Post('leases/:leaseId/signature')
  @HttpCode(201)
  @ApiCreatedResponse({ schema: envelopeSchema('Sent renewal signature envelope') })
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  sendSignature(@OrgId() orgId: string, @Request() req: AuthenticatedRequest, @Param('leaseId') leaseId: string, @Body() payload: SendRenewalSignaturePayload) {
    return this.renewalsService.sendSignature(orgId, req.user, leaseId, payload);
  }

  @Patch('envelopes/:envelopeId/refresh')
  @ApiOkResponse({ schema: envelopeSchema('Refreshed renewal signature envelope') })
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  refreshEnvelope(@OrgId() orgId: string, @Request() req: AuthenticatedRequest, @Param('envelopeId') envelopeId: string) {
    return this.renewalsService.refreshEnvelope(orgId, req.user, Number(envelopeId));
  }

  @Post('leases/:leaseId/move-out')
  @HttpCode(201)
  @ApiCreatedResponse({ schema: envelopeSchema('Recorded move-out from renewal workflow') })
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  recordMoveOut(@OrgId() orgId: string, @Request() req: AuthenticatedRequest, @Param('leaseId') leaseId: string, @Body() payload: RecordMoveOutPayload) {
    return this.renewalsService.recordMoveOut(orgId, req.user, leaseId, payload);
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
