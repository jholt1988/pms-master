import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { MaintenancePriority, Role } from '@prisma/client';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse } from '@nestjs/swagger';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UseApiEnvelope } from '../common/envelope/envelope.decorator';
import { OrgContextGuard } from '../common/org-context/org-context.guard';
import { OrgId } from '../common/org-context/org-id.decorator';
import {
  AwardVendorBidPayload,
  CompleteVendorDispatchPayload,
  DispatchVendorPayload,
  RejectVendorBidPayload,
  RequestBidPayload,
} from './operator-maintenance-dispatch.types';
import { OperatorMaintenanceDispatchService } from './operator-maintenance-dispatch.service';

type AuthenticatedRequest = Request & {
  user: { userId: string; username?: string; role: Role };
};

@Controller('operator-maintenance-dispatch')
@ApiBearerAuth('JWT-auth')
@UseGuards(AuthGuard('jwt'), RolesGuard, OrgContextGuard)
@UseApiEnvelope()
export class OperatorMaintenanceDispatchController {
  constructor(private readonly dispatchService: OperatorMaintenanceDispatchService) {}

  @Get()
  @ApiOkResponse({ schema: envelopeSchema('Operator maintenance vendor dispatch workbench') })
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  getWorkbench(
    @OrgId() orgId: string,
    @Request() req: AuthenticatedRequest,
    @Query('propertyId') propertyId?: string,
    @Query('priority') priority?: MaintenancePriority,
    @Query('limit') limit?: string,
  ) {
    return this.dispatchService.getWorkbench(orgId, req.user, {
      propertyId,
      priority,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Post('requests/:requestId/dispatch-vendor')
  @HttpCode(200)
  @ApiOkResponse({ schema: envelopeSchema('Vendor dispatch result') })
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  dispatchVendor(
    @OrgId() orgId: string,
    @Request() req: AuthenticatedRequest,
    @Param('requestId') requestId: string,
    @Body() payload: DispatchVendorPayload,
  ) {
    return this.dispatchService.dispatchVendor(orgId, req.user, requestId, payload);
  }

  @Post('requests/:requestId/bids')
  @HttpCode(201)
  @ApiCreatedResponse({ schema: envelopeSchema('Requested contractor bid') })
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  requestBid(
    @OrgId() orgId: string,
    @Request() req: AuthenticatedRequest,
    @Param('requestId') requestId: string,
    @Body() payload: RequestBidPayload,
  ) {
    return this.dispatchService.requestBid(orgId, req.user, requestId, payload);
  }

  @Patch('bids/:bidId/award')
  @ApiOkResponse({ schema: envelopeSchema('Awarded contractor bid dispatch') })
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  awardBid(
    @OrgId() orgId: string,
    @Request() req: AuthenticatedRequest,
    @Param('bidId') bidId: string,
    @Body() payload: AwardVendorBidPayload,
  ) {
    return this.dispatchService.awardBid(orgId, req.user, bidId, payload);
  }

  @Patch('bids/:bidId/complete')
  @ApiOkResponse({ schema: envelopeSchema('Completed vendor dispatch') })
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  completeDispatch(
    @OrgId() orgId: string,
    @Request() req: AuthenticatedRequest,
    @Param('bidId') bidId: string,
    @Body() payload: CompleteVendorDispatchPayload,
  ) {
    return this.dispatchService.completeDispatch(orgId, req.user, bidId, payload);
  }

  @Patch('bids/:bidId/reject')
  @ApiOkResponse({ schema: envelopeSchema('Rejected contractor bid') })
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  rejectBid(
    @OrgId() orgId: string,
    @Request() req: AuthenticatedRequest,
    @Param('bidId') bidId: string,
    @Body() payload: RejectVendorBidPayload,
  ) {
    return this.dispatchService.rejectBid(orgId, req.user, bidId, payload);
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
