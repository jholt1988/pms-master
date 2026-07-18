import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { InspectionStatus, Role } from '@prisma/client';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse } from '@nestjs/swagger';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UseApiEnvelope } from '../common/envelope/envelope.decorator';
import { OrgId } from '../common/org-context/org-id.decorator';
import { CreateRepairRequestPayload } from './operator-inspection-estimates.types';
import { OperatorInspectionEstimatesService } from './operator-inspection-estimates.service';

type AuthenticatedRequest = Request & {
  user: { userId: string; username?: string; role: Role };
};

@Controller('operator-inspection-estimates')
@ApiBearerAuth('JWT-auth')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@UseApiEnvelope()
export class OperatorInspectionEstimatesController {
  constructor(private readonly estimatesService: OperatorInspectionEstimatesService) {}

  @Get()
  @ApiOkResponse({ schema: envelopeSchema('Operator inspection to repair estimate workbench') })
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  getWorkbench(
    @OrgId() orgId: string,
    @Request() req: AuthenticatedRequest,
    @Query('propertyId') propertyId?: string,
    @Query('status') status?: InspectionStatus,
    @Query('limit') limit?: string,
  ) {
    return this.estimatesService.getWorkbench(orgId, req.user, {
      propertyId,
      status,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Post('inspections/:inspectionId/generate-estimate')
  @HttpCode(201)
  @ApiCreatedResponse({ schema: envelopeSchema('Generated repair estimate') })
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  generateEstimate(@OrgId() orgId: string, @Request() req: AuthenticatedRequest, @Param('inspectionId') inspectionId: string) {
    return this.estimatesService.generateEstimate(orgId, req.user, Number(inspectionId));
  }

  @Patch('estimates/:estimateId/approve')
  @ApiOkResponse({ schema: envelopeSchema('Approved repair estimate') })
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  approveEstimate(@OrgId() orgId: string, @Request() req: AuthenticatedRequest, @Param('estimateId') estimateId: string) {
    return this.estimatesService.approveEstimate(orgId, req.user, estimateId);
  }

  @Patch('estimates/:estimateId/reject')
  @ApiOkResponse({ schema: envelopeSchema('Rejected repair estimate') })
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  rejectEstimate(
    @OrgId() orgId: string,
    @Request() req: AuthenticatedRequest,
    @Param('estimateId') estimateId: string,
    @Body() body: { reason?: string },
  ) {
    return this.estimatesService.rejectEstimate(orgId, req.user, estimateId, body.reason);
  }

  @Post('estimates/:estimateId/create-repair-request')
  @HttpCode(201)
  @ApiCreatedResponse({ schema: envelopeSchema('Created maintenance repair request') })
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  createRepairRequest(
    @OrgId() orgId: string,
    @Request() req: AuthenticatedRequest,
    @Param('estimateId') estimateId: string,
    @Body() payload: CreateRepairRequestPayload,
  ) {
    return this.estimatesService.createRepairRequest(orgId, req.user, estimateId, payload);
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
