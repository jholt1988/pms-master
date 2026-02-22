import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { BadRequestException } from '@nestjs/common';
import { RentOptimizationService } from './rent-optimization.service';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { RolesGuard } from '../auth/roles.guard';
import { OrgContextGuard } from '../common/org-context/org-context.guard';
import { OrgId } from '../common/org-context/org-id.decorator';
import { GenerateRecommendationsDto, UpdateRecommendationDto } from './dto/rent-optimization.dto';

@Controller('rent-recommendations')
@UseGuards(AuthGuard('jwt'), RolesGuard, OrgContextGuard)
@Roles(Role.PROPERTY_MANAGER)
export class RentOptimizationController {
  constructor(private readonly rentOptimizationService: RentOptimizationService) {}

  // ============================================================================
  // GET ROUTES - Ordered from most specific to least specific
  // CRITICAL: Dynamic routes (/:id) MUST come after all specific routes
  // ============================================================================

  // Base route - get all recommendations
  @Get()
  async getAllRecommendations(@OrgId() orgId?: string) {
    return this.rentOptimizationService.getAllRecommendations(orgId);
  }

  // Specific routes (must come before dynamic routes)
  @Get('stats')
  async getStats(@OrgId() orgId?: string) {
    return this.rentOptimizationService.getStats(orgId);
  }

  @Get('recent')
  async getRecentRecommendations(@Query('limit') limit?: string, @OrgId() orgId?: string) {
    return this.rentOptimizationService.getRecentRecommendations(limit ? Number(limit) : 10, orgId);
  }

  @Get('pending')
  async getPendingRecommendations(@OrgId() orgId?: string) {
    return this.rentOptimizationService.getRecommendationsByStatus('PENDING', orgId);
  }

  @Get('accepted')
  async getAcceptedRecommendations(@OrgId() orgId?: string) {
    return this.rentOptimizationService.getRecommendationsByStatus('ACCEPTED', orgId);
  }

  @Get('rejected')
  async getRejectedRecommendations(@OrgId() orgId?: string) {
    return this.rentOptimizationService.getRecommendationsByStatus('REJECTED', orgId);
  }

  // Parameterized specific routes
  @Get('property/:propertyId')
  async getRecommendationsByProperty(@Param('propertyId') propertyId: string, @OrgId() orgId?: string) {
    return this.rentOptimizationService.getRecommendationsByProperty(propertyId, orgId);
  }

  @Get('comparison/:unitId')
  async getComparison(@Param('unitId') unitId: string, @OrgId() orgId?: string) {
    return this.rentOptimizationService.getComparison(unitId, orgId);
  }

  @Get('unit/:unitId')
  async getRecommendationByUnit(@Param('unitId') unitId: string, @OrgId() orgId?: string) {
    return this.rentOptimizationService.getRecommendationByUnit(unitId, orgId);
  }

  // Dynamic route - MUST be last to prevent intercepting specific routes
  @Get(':id')
  async getRecommendation(@Param('id') id: string, @OrgId() orgId?: string) {
    return this.rentOptimizationService.getRecommendation(id, orgId);
  }

  // ============================================================================
  // POST ROUTES - Ordered from most specific to least specific
  // ============================================================================

  // Specific routes
  @Post('generate')
  async generateRecommendations(@Body() dto: GenerateRecommendationsDto, @OrgId() orgId?: string) {
    const unitIds = dto.unitIds.map((id) => {
      const parsed = Number(id);
      if (!Number.isFinite(parsed) || Number.isNaN(parsed) || !Number.isInteger(parsed)) {
        throw new BadRequestException(`Invalid unit id: ${id}`);
      }
      return parsed;
    });
    return this.rentOptimizationService.generateRecommendations(unitIds, orgId);
  }

  @Post('bulk-generate/property/:propertyId')
  async bulkGenerateByProperty(@Param('propertyId') propertyId: string, @OrgId() orgId?: string) {
    return this.rentOptimizationService.bulkGenerateByProperty(propertyId, orgId);
  }

  @Post('bulk-generate/all')
  async bulkGenerateAll(@OrgId() orgId?: string) {
    return this.rentOptimizationService.bulkGenerateAll(orgId);
  }

  // Dynamic routes (must come after specific routes)
  @Post(':id/accept')
  async acceptRecommendation(
    @Param('id') id: string,
    @Request() req: any,
    @OrgId() orgId?: string,
  ) {
    return this.rentOptimizationService.acceptRecommendation(id, req.user.userId, orgId);
  }

  @Post(':id/reject')
  async rejectRecommendation(
    @Param('id') id: string,
    @Request() req: any,
    @OrgId() orgId?: string,
  ) {
    return this.rentOptimizationService.rejectRecommendation(id, req.user.userId, orgId);
  }

  @Post(':id/apply')
  async applyRecommendation(
    @Param('id') id: string,
    @Request() req: any,
    @OrgId() orgId?: string,
  ) {
    return this.rentOptimizationService.applyRecommendation(id, req.user.userId, orgId);
  }

  // ============================================================================
  // PUT ROUTES
  // ============================================================================

  @Put(':id/update')
  async updateRecommendation(
    @Param('id') id: string,
    @Body() dto: UpdateRecommendationDto,
    @OrgId() orgId?: string,
  ) {
    return this.rentOptimizationService.updateRecommendation(id, dto.recommendedRent, dto.reasoning, orgId);
  }

  // ============================================================================
  // DELETE ROUTES
  // ============================================================================

  @Delete(':id')
  async deleteRecommendation(@Param('id') id: string, @OrgId() orgId?: string) {
    return this.rentOptimizationService.deleteRecommendation(id, orgId);
  }
}
