import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse } from '@nestjs/swagger';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UseApiEnvelope } from '../common/envelope/envelope.decorator';
import { OrgId } from '../common/org-context/org-id.decorator';
import { OperatorLeaseAbstractionService } from './operator-lease-abstraction.service';

@Controller('operator-lease-abstraction')
@ApiBearerAuth('JWT-auth')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@UseApiEnvelope()
export class OperatorLeaseAbstractionController {
  constructor(private readonly service: OperatorLeaseAbstractionService) {}

  @Get()
  @ApiOkResponse({ schema: envelopeSchema('Operator lease abstraction workbench') })
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  getWorkbench(@OrgId() orgId: string) {
    return this.service.getWorkbench(orgId);
  }

  @Post('extract')
  @ApiCreatedResponse({ schema: envelopeSchema('Extracted lease data') })
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  extractLease(@OrgId() orgId: string, @Body() dto: any) {
    return this.service.extractLease(orgId, dto.leaseId, dto.documentId);
  }

  @Get('abstractions')
  @ApiOkResponse({ schema: envelopeSchema('List of lease abstractions') })
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  listAbstractions(
    @OrgId() orgId: string,
    @Query('status') status?: string,
    @Query('leaseId') leaseId?: string,
  ) {
    return this.service.listAbstractions(orgId, { status, leaseId });
  }

  @Patch('abstractions/:id/review')
  @ApiOkResponse({ schema: envelopeSchema('Reviewed lease abstraction') })
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  markReviewed(
    @OrgId() orgId: string,
    @Param('id') id: string,
    @Body('reviewedById') reviewedById: string,
  ) {
    return this.service.markReviewed(orgId, id, reviewedById);
  }

  @Post('bulk-extract')
  @ApiOkResponse({ schema: envelopeSchema('Bulk extraction results') })
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  bulkExtract(@OrgId() orgId: string) {
    return this.service.bulkExtractLeases(orgId);
  }

  @Get('analytics')
  @ApiOkResponse({ schema: envelopeSchema('Lease abstraction analytics') })
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  getAnalytics(@OrgId() orgId: string) {
    return this.service.getAbstractionAnalytics(orgId);
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
