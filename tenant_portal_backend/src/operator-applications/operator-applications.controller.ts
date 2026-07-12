import { Body, Controller, Get, HttpCode, Param, Post, Query, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApplicationStatus, Role } from '@prisma/client';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse } from '@nestjs/swagger';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UseApiEnvelope } from '../common/envelope/envelope.decorator';
import { OrgId } from '../common/org-context/org-id.decorator';
import { RentalApplicationReviewActionDto } from '../rental-application/dto/review-action.dto';
import { ConvertApplicationToLeasePayload } from './operator-applications.types';
import { OperatorApplicationsService } from './operator-applications.service';

type AuthenticatedRequest = Request & {
  user: {
    userId: string;
    username?: string;
    role: Role;
  };
};

@Controller('operator-applications')
@ApiBearerAuth('JWT-auth')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@UseApiEnvelope()
export class OperatorApplicationsController {
  constructor(private readonly applicationsService: OperatorApplicationsService) {}

  @Get()
  @ApiOkResponse({ schema: envelopeSchema('Operator application-to-lease workbench') })
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  getWorkbench(
    @OrgId() orgId: string,
    @Request() req: AuthenticatedRequest,
    @Query('propertyId') propertyId?: string,
    @Query('status') status?: ApplicationStatus,
    @Query('limit') limit?: string,
  ) {
    return this.applicationsService.getWorkbench(orgId, req.user, {
      propertyId,
      status,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get(':id')
  @ApiOkResponse({ schema: envelopeSchema('Operator application detail') })
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  getDetail(@OrgId() orgId: string, @Request() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.applicationsService.getDetail(orgId, req.user, Number(id));
  }

  @Post(':id/screen')
  @HttpCode(200)
  @ApiOkResponse({ schema: envelopeSchema('Screening result') })
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  screen(@OrgId() orgId: string, @Request() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.applicationsService.screen(orgId, this.actor(req), Number(id));
  }

  @Post(':id/review-action')
  @HttpCode(200)
  @ApiOkResponse({ schema: envelopeSchema('Review action result') })
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  reviewAction(
    @OrgId() orgId: string,
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: RentalApplicationReviewActionDto,
  ) {
    return this.applicationsService.reviewAction(orgId, this.actor(req), Number(id), dto);
  }

  @Post(':id/convert-to-lease')
  @HttpCode(201)
  @ApiCreatedResponse({ schema: envelopeSchema('Draft lease created from application') })
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  convertToLease(
    @OrgId() orgId: string,
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() payload: ConvertApplicationToLeasePayload,
  ) {
    return this.applicationsService.convertToLease(orgId, this.actor(req), Number(id), payload);
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
