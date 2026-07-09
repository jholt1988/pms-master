import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Req,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { OrgContextGuard } from '../common/org-context/org-context.guard';
import { OrgId } from '../common/org-context/org-id.decorator';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt.guard';
import { RentalApplicationsService } from './rental-applications.service';
import { CreateRentalApplicationDto } from './dto/create-rental-application.dto';
import { UpdateRentalApplicationDto } from './dto/update-rental-application.dto';
import { ReviewRentalApplicationDto } from './dto/review-rental-application.dto';

interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    username: string;
    role: string;
  };
}

@Controller('portal/rental-applications')
export class RentalApplicationsController {
  constructor(private readonly rentalApplicationsService: RentalApplicationsService) {}

  @UseGuards(OptionalJwtAuthGuard)
  @Post()
  create(@Body() dto: CreateRentalApplicationDto, @Req() req: AuthenticatedRequest) {
    return this.rentalApplicationsService.create(dto, req.user?.userId);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard, OrgContextGuard)
  @Roles('TENANT')
  @Get('mine')
  findMine(@Req() req: AuthenticatedRequest) {
    return this.rentalApplicationsService.findAllForApplicant(req.user!.userId);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard, OrgContextGuard)
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  @Get(':id')
  findOne(@Param('id') id: string, @OrgId() orgId?: string) {
    return this.rentalApplicationsService.findOne(Number(id), orgId);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard, OrgContextGuard)
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateRentalApplicationDto,
    @OrgId() orgId?: string,
  ) {
    return this.rentalApplicationsService.update(Number(id), dto, orgId);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard, OrgContextGuard)
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  @Patch(':id/review')
  review(
    @Param('id') id: string,
    @Body() dto: ReviewRentalApplicationDto,
    @Req() req: AuthenticatedRequest,
    @OrgId() orgId?: string,
  ) {
    return this.rentalApplicationsService.review(Number(id), dto, req.user?.userId, orgId);
  }

  // ========== GAP REMEDIATION - Issue 5: Screening Risk Reasoning ==========

  /**
   * Get detailed risk breakdown for a rental application
   * Gap: Issue 5 - High-Risk Applicant Reasoning (P0)
   */
  @Get(':id/screening-reasoning')
  @UseGuards(AuthGuard('jwt'), RolesGuard, OrgContextGuard)
  @Roles('PROPERTY_MANAGER', 'ADMIN', 'OWNER')
  @HttpCode(200)
  async getScreeningReasoning(
    @Param('id') id: string,
    @OrgId() orgId: string,
  ) {
    return this.rentalApplicationsService.getScreeningReasoning(id, orgId);
  }

  // ========== END GAP REMEDIATION ==========
}
