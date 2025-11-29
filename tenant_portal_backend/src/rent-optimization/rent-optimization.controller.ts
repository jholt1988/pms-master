import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RentOptimizationService } from './rent-optimization.service';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { RolesGuard } from '../auth/roles.guard';
import { GenerateRecommendationsDto, UpdateRecommendationDto } from './dto/rent-optimization.dto';

@Controller('rent-recommendations')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(Role.PROPERTY_MANAGER)
export class RentOptimizationController {
  constructor(private readonly rentOptimizationService: RentOptimizationService) {}

  // ============================================================================
  // GET ROUTES - Ordered from most specific to least specific
  // CRITICAL: Dynamic routes (/:id) MUST come after all specific routes
  // ============================================================================

  // Base route - get all recommendations
  @Get()
  async getAllRecommendations() {
    return this.rentOptimizationService.getAllRecommendations();
  }

  // Specific routes (must come before dynamic routes)
  @Get('stats')
  async getStats() {
    return this.rentOptimizationService.getStats();
  }

  @Get('recent')
  async getRecentRecommendations(@Query('limit') limit?: string) {
    return this.rentOptimizationService.getRecentRecommendations(limit ? Number(limit) : 10);
  }

  @Get('pending')
  async getPendingRecommendations() {
    return this.rentOptimizationService.getRecommendationsByStatus('PENDING');
  }

  @Get('accepted')
  async getAcceptedRecommendations() {
    return this.rentOptimizationService.getRecommendationsByStatus('ACCEPTED');
  }

  @Get('rejected')
  async getRejectedRecommendations() {
    return this.rentOptimizationService.getRecommendationsByStatus('REJECTED');
  }

  // Parameterized specific routes
  @Get('property/:propertyId')
  async getRecommendationsByProperty(@Param('propertyId') propertyId: string) {
    return this.rentOptimizationService.getRecommendationsByProperty(Number(propertyId));
  }

  @Get('comparison/:unitId')
  async getComparison(@Param('unitId') unitId: string) {
    return this.rentOptimizationService.getComparison(Number(unitId));
  }

  @Get('unit/:unitId')
  async getRecommendationByUnit(@Param('unitId') unitId: string) {
    return this.rentOptimizationService.getRecommendationByUnit(Number(unitId));
  }

  // Dynamic route - MUST be last to prevent intercepting specific routes
  @Get(':id')
  async getRecommendation(@Param('id') id: string) {
    return this.rentOptimizationService.getRecommendation(id);
  }

  // ============================================================================
  // POST ROUTES - Ordered from most specific to least specific
  // ============================================================================

  // Specific routes
  @Post('generate')
  async generateRecommendations(@Body() dto: GenerateRecommendationsDto) {
    return this.rentOptimizationService.generateRecommendations(dto.unitIds);
  }

  @Post('bulk-generate/property/:propertyId')
  async bulkGenerateByProperty(@Param('propertyId') propertyId: string) {
    return this.rentOptimizationService.bulkGenerateByProperty(Number(propertyId));
  }

  @Post('bulk-generate/all')
  async bulkGenerateAll() {
    return this.rentOptimizationService.bulkGenerateAll();
  }

  // Dynamic routes (must come after specific routes)
  @Post(':id/accept')
  async acceptRecommendation(
    @Param('id') id: string,
    @Request() req: any,
  ) {
    return this.rentOptimizationService.acceptRecommendation(id, req.user.userId);
  }

  @Post(':id/reject')
  async rejectRecommendation(
    @Param('id') id: string,
    @Request() req: any,
  ) {
    return this.rentOptimizationService.rejectRecommendation(id, req.user.userId);
  }

  @Post(':id/apply')
  async applyRecommendation(
    @Param('id') id: string,
    @Request() req: any,
  ) {
    return this.rentOptimizationService.applyRecommendation(id, req.user.userId);
  }

  // ============================================================================
  // PUT ROUTES
  // ============================================================================

  @Put(':id/update')
  async updateRecommendation(
    @Param('id') id: string,
    @Body() dto: UpdateRecommendationDto,
  ) {
    return this.rentOptimizationService.updateRecommendation(id, dto.recommendedRent, dto.reasoning);
  }

  // ============================================================================
  // DELETE ROUTES
  // ============================================================================

  @Delete(':id')
  async deleteRecommendation(@Param('id') id: string) {
    return this.rentOptimizationService.deleteRecommendation(id);
  }
}
