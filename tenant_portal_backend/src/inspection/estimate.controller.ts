import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseUUIDPipe,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { OrgContextGuard } from '../common/org-context/org-context.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { EstimateService } from './estimate.service';
import {
  CreateEstimateDto,
  UpdateEstimateDto,
  EstimateQueryDto,
  EstimateStatus,
} from './dto/simple-inspection.dto';

@Controller('api/estimates')
@UseGuards(AuthGuard('jwt'), RolesGuard, OrgContextGuard)
export class EstimateController {
  constructor(private readonly estimateService: EstimateService) {}

  @Post('from-maintenance/:requestId')
  @HttpCode(HttpStatus.CREATED)
  async generateEstimateFromMaintenance(
    @Param('requestId', ParseUUIDPipe) requestId: string,
    @Request() req: any,
  ) {
    return this.estimateService.generateEstimateForMaintenance(requestId, req.user.id);
  }

  @Get()
  async getEstimates(@Query() query: EstimateQueryDto) {
    return this.estimateService.getEstimates(query);
  }

  @Get('stats')
  async getEstimateStats(@Query('propertyId') propertyId?: string) {
    if (propertyId) {
      return this.estimateService.getEstimateStats(propertyId);
    }
    return this.estimateService.getEstimateStats();
  }

  @Get(':id')
  async getEstimate(@Param('id', ParseUUIDPipe) id: string) {
    return this.estimateService.getEstimateById(id);
  }

  @Patch(':id')
  async updateEstimate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEstimateDto,
    @Request() req: any,
  ) {
    return this.estimateService.updateEstimate(id, dto, req.user.id);
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  async approveEstimate(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ) {
    return this.estimateService.updateEstimate(
      id,
      { status: EstimateStatus.APPROVED },
      req.user.id,
    );
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  async rejectEstimate(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ) {
    return this.estimateService.updateEstimate(
      id,
      { status: EstimateStatus.REJECTED },
      req.user.id,
    );
  }

  @Post(':id/convert-to-maintenance')
  @Roles(Role.PROPERTY_MANAGER)
  @HttpCode(HttpStatus.CREATED)
  async convertToMaintenanceRequests(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ) {
    return this.estimateService.convertEstimateToMaintenanceRequests(id, req.user.id);
  }

  @Get(':id/line-items')
  async getEstimateLineItems(@Param('id', ParseUUIDPipe) id: string) {
    // Get estimate with line items included
    const estimate = await this.estimateService.getEstimateById(id) as any;
    return estimate.lineItems || [];
  }
}
