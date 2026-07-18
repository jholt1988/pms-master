import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { OrgId } from '../common/org-context/org-id.decorator';
import { LeaseAbstractionService } from './lease-abstraction.service';

@Controller('lease-abstraction')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('PROPERTY_MANAGER', 'ADMIN')
export class LeaseAbstractionController {
  constructor(private readonly abstractionService: LeaseAbstractionService) {}

  @Post('extract')
  extractLease(@OrgId() orgId: string, @Body() dto: any) {
    return this.abstractionService.extractLease(orgId, dto.leaseId, dto.documentId);
  }

  @Get('abstractions')
  listAbstractions(
    @OrgId() orgId: string,
    @Query('status') status?: string,
    @Query('leaseId') leaseId?: string,
  ) {
    return this.abstractionService.listAbstractions(orgId, { status, leaseId });
  }

  @Get('abstractions/:id')
  getAbstraction(@OrgId() orgId: string, @Param('id') id: string) {
    return this.abstractionService.getAbstraction(orgId, id);
  }

  @Patch('abstractions/:id/review')
  markReviewed(
    @OrgId() orgId: string,
    @Param('id') id: string,
    @Body('reviewedById') reviewedById: string,
  ) {
    return this.abstractionService.markReviewed(orgId, id, reviewedById);
  }

  @Post('bulk-extract')
  bulkExtract(@OrgId() orgId: string) {
    return this.abstractionService.bulkExtractLeases(orgId);
  }

  @Get('analytics')
  getAnalytics(@OrgId() orgId: string) {
    return this.abstractionService.getAbstractionAnalytics(orgId);
  }
}
