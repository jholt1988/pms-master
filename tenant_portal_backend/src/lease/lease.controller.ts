import { Controller, Get, Post, Body, UseGuards, Request, Param, Put, ForbiddenException, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { LeaseService } from './lease.service';
import { AILeaseRenewalMetricsService } from './ai-lease-renewal-metrics.service';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { RolesGuard } from '../auth/roles.guard';
import { OrgContextGuard } from '../common/org-context/org-context.guard';
import { OrgId } from '../common/org-context/org-id.decorator';
import { CreateLeaseDto } from './dto/create-lease.dto';
import { UpdateLeaseDto } from './dto/update-lease.dto';
import { UpdateLeaseStatusDto } from './dto/update-lease-status.dto';
import { CreateRenewalOfferDto } from './dto/create-renewal-offer.dto';
import { RecordLeaseNoticeDto } from './dto/record-lease-notice.dto';
import { RespondRenewalOfferDto } from './dto/respond-renewal-offer.dto';
import { TenantSubmitNoticeDto } from './dto/tenant-submit-notice.dto';

interface AuthenticatedRequest extends Request {
  user: {
    userId: number;
    role: Role;
  };
}

@Controller('leases')
@UseGuards(AuthGuard('jwt'), RolesGuard, OrgContextGuard)
export class LeaseController {
  private readonly logger = new Logger(LeaseController.name);

  constructor(
    private readonly leaseService: LeaseService,
    private readonly aiMetrics: AILeaseRenewalMetricsService,
  ) {}

  @Post()
  @Roles(Role.PROPERTY_MANAGER)
  createLease(@Body() data: CreateLeaseDto, @OrgId() orgId: string) {
    return this.leaseService.createLease(data, orgId);
  }

  @Get()
  @Roles(Role.PROPERTY_MANAGER)
  getAllLeases(@OrgId() orgId?: string) {
    return this.leaseService.getAllLeases(orgId);
  }

  @Get('my-lease')
  @Roles(Role.TENANT)
  async getMyLease(@Request() req: AuthenticatedRequest) {
    // Verify user is authenticated and has TENANT role
    // The RolesGuard should handle this, but we add an extra check for safety
    if (!req.user) {
      this.logger.warn('getMyLease called without authenticated user');
      throw new ForbiddenException('Authentication required.');
    }
    
    if (req.user.role !== Role.TENANT) {
      this.logger.warn(`getMyLease called by user with role ${req.user.role}, expected TENANT`);
      throw new ForbiddenException('Only tenants can access their lease information.');
    }
    
    this.logger.debug(`Fetching lease for tenant ${req.user.userId}`);
    const lease = await this.leaseService.getLeaseByTenantId(req.user.userId);
    
    if (!lease) {
      this.logger.debug(`No lease found for tenant ${req.user.userId}`);
    }
    
    // Return null if no lease exists - frontend should handle this gracefully
    return lease;
  }

  @Get(':id')
  @Roles(Role.PROPERTY_MANAGER)
  getLeaseById(@Param('id') id: string, @OrgId() orgId?: string) {
    return this.leaseService.getLeaseById(Number(id), orgId);
  }

  @Get(':id/history')
  @Roles(Role.PROPERTY_MANAGER)
  getLeaseHistory(@Param('id') id: string, @OrgId() orgId?: string) {
    return this.leaseService.getLeaseHistory(Number(id), orgId);
  }

  @Put(':id')
  @Roles(Role.PROPERTY_MANAGER)
  updateLease(
    @Param('id') id: string,
    @Body() data: UpdateLeaseDto,
    @Request() req: AuthenticatedRequest,
    @OrgId() orgId?: string,
  ) {
    return this.leaseService.updateLease(Number(id), data, req.user.userId, orgId);
  }

  @Put(':id/status')
  @Roles(Role.PROPERTY_MANAGER)
  updateLeaseStatus(
    @Param('id') id: string,
    @Body() data: UpdateLeaseStatusDto,
    @Request() req: AuthenticatedRequest,
    @OrgId() orgId?: string,
  ) {
    return this.leaseService.updateLeaseStatus(Number(id), data, req.user.userId, orgId);
  }

  @Post(':id/renewal-offers')
  @Roles(Role.PROPERTY_MANAGER)
  createRenewalOffer(
    @Param('id') id: string,
    @Body() dto: CreateRenewalOfferDto,
    @Request() req: AuthenticatedRequest,
    @OrgId() orgId?: string,
  ) {
    return this.leaseService.createRenewalOffer(Number(id), dto, req.user.userId, orgId);
  }

  @Post(':id/notices')
  @Roles(Role.PROPERTY_MANAGER)
  recordLeaseNotice(
    @Param('id') id: string,
    @Body() dto: RecordLeaseNoticeDto,
    @Request() req: AuthenticatedRequest,
    @OrgId() orgId?: string,
  ) {
    return this.leaseService.recordLeaseNotice(Number(id), dto, req.user.userId, orgId);
  }

  @Post(':id/renewal-offers/:offerId/respond')
  @Roles(Role.TENANT)
  respondToRenewalOffer(
    @Param('id') id: string,
    @Param('offerId') offerId: string,
    @Body() dto: RespondRenewalOfferDto,
    @Request() req: AuthenticatedRequest,
    @OrgId() orgId?: string,
  ) {
    return this.leaseService.respondToRenewalOffer(
      Number(id),
      Number(offerId),
      dto,
      req.user.userId,
      orgId,
    );
  }

  @Post(':id/tenant-notices')
  @Roles(Role.TENANT)
  submitTenantNotice(
    @Param('id') id: string,
    @Body() dto: TenantSubmitNoticeDto,
    @Request() req: AuthenticatedRequest,
    @OrgId() orgId?: string,
  ) {
    return this.leaseService.submitTenantNotice(Number(id), dto, req.user.userId, orgId);
  }

  @Get('ai-metrics')
  @Roles(Role.PROPERTY_MANAGER, Role.ADMIN)
  getAIMetrics() {
    return this.aiMetrics.getMetrics();
  }
}
