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
  ParseIntPipe,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { EstimateService } from './estimate.service';
import {
  CreateEstimateDto,
  UpdateEstimateDto,
  EstimateQueryDto,
  EstimateStatus,
} from './dto/simple-inspection.dto';

@Controller('api/estimates')
export class EstimateController {
  constructor(private readonly estimateService: EstimateService) {}

  @Post('from-maintenance/:requestId')
  @HttpCode(HttpStatus.CREATED)
  async generateEstimateFromMaintenance(
    @Param('requestId', ParseIntPipe) requestId: number,
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
    const propertyIdNum = propertyId ? parseInt(propertyId) : undefined;
    if (propertyIdNum) {
      return this.estimateService.getEstimateStats(propertyIdNum);
    }
    return this.estimateService.getEstimateStats();
  }

  @Get(':id')
  async getEstimate(@Param('id', ParseIntPipe) id: number) {
    return this.estimateService.getEstimateById(id);
  }

  @Patch(':id')
  async updateEstimate(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEstimateDto,
    @Request() req: any,
  ) {
    return this.estimateService.updateEstimate(id, dto, req.user.id);
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  async approveEstimate(
    @Param('id', ParseIntPipe) id: number,
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
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
  ) {
    return this.estimateService.updateEstimate(
      id,
      { status: EstimateStatus.REJECTED },
      req.user.id,
    );
  }

  @Post(':id/convert-to-maintenance')
  @HttpCode(HttpStatus.CREATED)
  async convertToMaintenanceRequests(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
  ) {
    return this.estimateService.convertEstimateToMaintenanceRequests(id, req.user.id);
  }

  @Get(':id/line-items')
  async getEstimateLineItems(@Param('id', ParseIntPipe) id: number) {
    // Get estimate with line items included
    const estimate = await this.estimateService.getEstimateById(id) as any;
    return estimate.lineItems || [];
  }
}