import { Controller, Get, Post, Body, UseGuards, Request, Param, Put, ForbiddenException, Logger, HttpCode } from '@nestjs/common';
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
import { AuditLogService } from '../shared/audit-log.service';
import { PrismaService } from '../prisma/prisma.service';
import { ApiTags, ApiOkResponse, ApiExtraModels } from '@nestjs/swagger';
import { LeaseResponseDto } from './dto/lease-response.dto';

interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
    role: Role;
  };
}

@ApiTags('leases')
@ApiExtraModels(LeaseResponseDto)
@Controller('leases')
@UseGuards(AuthGuard('jwt'), RolesGuard, OrgContextGuard)
export class LeaseController {
  private readonly logger = new Logger(LeaseController.name);

  constructor(
    private readonly leaseService: LeaseService,
    private readonly aiMetrics: AILeaseRenewalMetricsService,
    private readonly auditLogService: AuditLogService,
    private readonly prisma: PrismaService,
  ) {}

  @Post()
  @Roles('PROPERTY_MANAGER')
  async createLease(@Body() data: CreateLeaseDto, @Request() req: AuthenticatedRequest, @OrgId() orgId: string) {
    const lease = await this.leaseService.createLease(data, orgId);
    await this.auditLogService.record({
      orgId, actorId: String(req?.user?.userId ?? ''), module: 'LEASE', action: 'LEASE_CREATED',
      entityType: 'Lease', entityId: lease.id, result: 'SUCCESS', metadata: { tenantId: data.tenantId, unitId: data.unitId }
    });
    return lease;
  }

  @Get()
  @Roles('PROPERTY_MANAGER')
  @ApiOkResponse({ type: LeaseResponseDto, isArray: true })
  getAllLeases(@OrgId() orgId?: string) {
    return this.leaseService.getAllLeases(orgId);
  }

  @Get('my-lease')
  @Roles('TENANT')
  @ApiOkResponse({ type: LeaseResponseDto })
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
  @Roles('PROPERTY_MANAGER')
  @ApiOkResponse({ type: LeaseResponseDto })
  getLeaseById(@Param('id') id: string, @OrgId() orgId?: string) {
    return this.leaseService.getLeaseById(id, orgId);
  }

  @Get(':id/history')
  @Roles('PROPERTY_MANAGER')
  getLeaseHistory(@Param('id') id: string, @OrgId() orgId?: string) {
    return this.leaseService.getLeaseHistory(id, orgId);
  }

  @Put(':id')
  @Roles('PROPERTY_MANAGER')
  async updateLease(
    @Param('id') id: string,
    @Body() data: UpdateLeaseDto,
    @Request() req: AuthenticatedRequest,
    @OrgId() orgId?: string,
  ) {
    const lease = await this.leaseService.updateLease(id, data, req.user.userId, orgId);
    await this.auditLogService.record({ orgId, actorId: String(req.user.userId), module: 'LEASE', action: 'LEASE_UPDATED', entityType: 'Lease', entityId: lease.id, result: 'SUCCESS' });
    return lease;
  }

  @Put(':id/status')
  @Roles('PROPERTY_MANAGER')
  async updateLeaseStatus(
    @Param('id') id: string,
    @Body() data: UpdateLeaseStatusDto,
    @Request() req: AuthenticatedRequest,
    @OrgId() orgId?: string,
  ) {
    const lease = await this.leaseService.updateLeaseStatus(id, data, req.user.userId, orgId);
    await this.auditLogService.record({ orgId, actorId: String(req.user.userId), module: 'LEASE', action: 'LEASE_STATUS_UPDATED', entityType: 'Lease', entityId: lease.id, result: 'SUCCESS', metadata: { status: data.status } });
    return lease;
  }

  @Post(':id/renewal-offers')
  @Roles('PROPERTY_MANAGER')
  createRenewalOffer(
    @Param('id') id: string,
    @Body() dto: CreateRenewalOfferDto,
    @Request() req: AuthenticatedRequest,
    @OrgId() orgId?: string,
  ) {
    return this.leaseService.createRenewalOffer(id, dto, req.user.userId, orgId);
  }

  @Post(':id/notices')
  @Roles('PROPERTY_MANAGER')
  async recordLeaseNotice(
    @Param('id') id: string,
    @Body() dto: RecordLeaseNoticeDto,
    @Request() req: AuthenticatedRequest,
    @OrgId() orgId?: string,
  ) {
    return this.leaseService.recordLeaseNotice(id, dto, req.user.userId, orgId);
  }

  @Post(':id/renewal-offers/:offerId/respond')
  @Roles('TENANT')
  respondToRenewalOffer(
    @Param('id') id: string,
    @Param('offerId') offerId: string,
    @Body() dto: RespondRenewalOfferDto,
    @Request() req: AuthenticatedRequest,
    @OrgId() orgId?: string,
  ) {
    return this.leaseService.respondToRenewalOffer(
      id,
      offerId,
      dto,
      req.user.userId,
      orgId,
    );
  }

  @Post(':id/tenant-notices')
  @Roles('TENANT')
  submitTenantNotice(
    @Param('id') id: string,
    @Body() dto: TenantSubmitNoticeDto,
    @Request() req: AuthenticatedRequest,
    @OrgId() orgId?: string,
  ) {
    return this.leaseService.submitTenantNotice(id, dto, req.user.userId, orgId);
  }

  @Get('ai-metrics')
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  getAIMetrics() {
    return this.aiMetrics.getMetrics();
  }

  // ========== GAP REMEDIATION - Issue 3: Lease Signing Flow ==========

  /**
   * Generate lease document
   * Gap: Issue 3 - Lease Creation Signing Flow (P0)
   */
  @Post(':id/generate-document')
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  @HttpCode(201)
  async generateLeaseDocument(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
    @OrgId() orgId: string,
  ) {
    const result = await this.leaseService.generateLeaseDocument(id, req.user.userId, orgId);
    await (this.prisma as any).telemetryEvent.create({
      data: {
        eventName: 'lease_document_generated',
        userId: String(req.user.userId),
        orgId,
        entityId: id,
        domain: 'lease',
        outcome: 'success',
        metadata: {}
      }
    });
    return result;
  }

  /**
   * Send lease for tenant signature
   * Gap: Issue 3 - Lease Creation Signing Flow (P0)
   */
  @Post(':id/send-for-signature')
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  @HttpCode(200)
  async sendForSignature(
    @Param('id') id: string,
    @Body() body: { signerEmail?: string; signerName?: string },
    @Request() req: AuthenticatedRequest,
    @OrgId() orgId: string,
  ) {
    const result = await this.leaseService.sendForSignature(id, body.signerEmail, body.signerName, req.user.userId, orgId);
    await (this.prisma as any).telemetryEvent.create({
      data: {
        eventName: 'lease_sent_for_signature',
        userId: String(req.user.userId),
        orgId,
        entityId: id,
        domain: 'lease',
        outcome: 'success',
        metadata: {}
      }
    });
    return result;
  }

  // ========== END GAP REMEDIATION ==========
}
