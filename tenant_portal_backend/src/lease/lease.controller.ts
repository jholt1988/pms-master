import { Controller, Get, Post, Body, UseGuards, Request, Param, Put } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { LeaseService } from './lease.service';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { RolesGuard } from '../auth/roles.guard';
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
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class LeaseController {
  constructor(private readonly leaseService: LeaseService) {}

  @Post()
  @Roles(Role.PROPERTY_MANAGER)
  createLease(@Body() data: CreateLeaseDto) {
    return this.leaseService.createLease(data);
  }

  @Get()
  @Roles(Role.PROPERTY_MANAGER)
  getAllLeases() {
    return this.leaseService.getAllLeases();
  }

  @Get('my-lease')
  @Roles(Role.TENANT)
  getMyLease(@Request() req: AuthenticatedRequest) {
    return this.leaseService.getLeaseByTenantId(req.user.userId);
  }

  @Get(':id')
  @Roles(Role.PROPERTY_MANAGER)
  getLeaseById(@Param('id') id: string) {
    return this.leaseService.getLeaseById(Number(id));
  }

  @Get(':id/history')
  @Roles(Role.PROPERTY_MANAGER)
  getLeaseHistory(@Param('id') id: string) {
    return this.leaseService.getLeaseHistory(Number(id));
  }

  @Put(':id')
  @Roles(Role.PROPERTY_MANAGER)
  updateLease(
    @Param('id') id: string,
    @Body() data: UpdateLeaseDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.leaseService.updateLease(Number(id), data, req.user.userId);
  }

  @Put(':id/status')
  @Roles(Role.PROPERTY_MANAGER)
  updateLeaseStatus(
    @Param('id') id: string,
    @Body() data: UpdateLeaseStatusDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.leaseService.updateLeaseStatus(Number(id), data, req.user.userId);
  }

  @Post(':id/renewal-offers')
  @Roles(Role.PROPERTY_MANAGER)
  createRenewalOffer(
    @Param('id') id: string,
    @Body() dto: CreateRenewalOfferDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.leaseService.createRenewalOffer(Number(id), dto, req.user.userId);
  }

  @Post(':id/notices')
  @Roles(Role.PROPERTY_MANAGER)
  recordLeaseNotice(
    @Param('id') id: string,
    @Body() dto: RecordLeaseNoticeDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.leaseService.recordLeaseNotice(Number(id), dto, req.user.userId);
  }

  @Post(':id/renewal-offers/:offerId/respond')
  @Roles(Role.TENANT)
  respondToRenewalOffer(
    @Param('id') id: string,
    @Param('offerId') offerId: string,
    @Body() dto: RespondRenewalOfferDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.leaseService.respondToRenewalOffer(
      Number(id),
      Number(offerId),
      dto,
      req.user.userId,
    );
  }

  @Post(':id/tenant-notices')
  @Roles(Role.TENANT)
  submitTenantNotice(
    @Param('id') id: string,
    @Body() dto: TenantSubmitNoticeDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.leaseService.submitTenantNotice(Number(id), dto, req.user.userId);
  }
}
