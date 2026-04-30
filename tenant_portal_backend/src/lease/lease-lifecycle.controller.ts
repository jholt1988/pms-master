// Story 16: Lease Lifecycle Management and Renewal Flow
// POST /leases, GET /leases/:id, POST /leases/:id/renew, POST /leases/:id/terminate
// Dependencies: 11 | Estimate: Large

import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards, NotFoundException, BadRequestException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { PrismaService } from '../prisma/prisma.service';

interface CreateLeaseDto {
  tenantId: number;
  unitId: number;
  startDate: string;
  endDate: string;
  monthlyRent: number;
  securityDeposit?: number;
  autoRenew?: boolean;
  noticePeriodDays?: number;
}

interface RenewLeaseDto {
  newMonthlyRent?: number;
  newStartDate?: string;
  newEndDate?: string;
  termsChanged?: boolean;
}

interface TerminateLeaseDto {
  terminationDate: string;
  reason?: string;
  moveOutConfirmed?: boolean;
}

interface LeaseQueryDto {
  status?: string;
  propertyId?: number;
  unitId?: number;
  expiresWithinDays?: number;
  limit?: number;
  offset?: number;
}

@Controller('leases')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class LeaseLifecycleController {
  constructor(private readonly prisma: PrismaService) {}

  @Post()
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  async createLease(@Body() dto: CreateLeaseDto) {
    // Validate tenant exists
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: dto.tenantId },
    });
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    // Validate unit exists and is available
    const unit = await this.prisma.unit.findUnique({
      where: { id: dto.unitId },
    });
    if (!unit) {
      throw new NotFoundException('Unit not found');
    }

    if (unit.status === 'LEASED') {
      throw new BadRequestException('Unit is already leased');
    }

    // Validate dates
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);
    if (startDate >= endDate) {
      throw new BadRequestException('End date must be after start date');
    }

    // Create lease
    const lease = await this.prisma.lease.create({
      data: {
        tenantId: dto.tenantId,
        unitId: dto.unitId,
        startDate,
        endDate,
        monthlyRent: dto.monthlyRent,
        securityDeposit: dto.securityDeposit || dto.monthlyRent,
        status: 'PENDING',
        autoRenew: dto.autoRenew || false,
        noticePeriodDays: dto.noticePeriodDays || 30,
      },
    });

    // Update unit status
    await this.prisma.unit.update({
      where: { id: dto.unitId },
      data: { status: 'LEASED' },
    });

    // Create decision for move-in confirmation
    await this.prisma.decision.create({
      data: {
        domain: 'leasing',
        type: 'LEASE_CONFIRMATION',
        entityId: String(lease.id),
        title: `Confirm lease for ${tenant.fullName}`,
        priority: 70,
        urgency: 'today',
        context: { leaseId: lease.id, tenantId: dto.tenantId },
      },
    });

    console.log('[LEASE] Created:', lease.id);

    return {
      id: lease.id,
      tenantId: lease.tenantId,
      unitId: lease.unitId,
      startDate: lease.startDate,
      endDate: lease.endDate,
      monthlyRent: lease.monthlyRent,
      status: lease.status,
    };
  }

  @Get()
  async listLeases(@Query() query: LeaseQueryDto) {
    const { status, propertyId, unitId, expiresWithinDays, limit = 20, offset = 0 } = query;

    const where: any = {};

    if (status) where.status = status;
    if (propertyId) where.unit = { propertyId };
    if (unitId) where.unitId = unitId;

    if (expiresWithinDays) {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + expiresWithinDays);
      where.endDate = { lte: futureDate };
      where.status = 'ACTIVE';
    }

    const [leases, total] = await Promise.all([
      this.prisma.lease.findMany({
        where,
        include: {
          tenant: true,
          unit: { include: { property: true } },
        },
        orderBy: { endDate: 'asc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.lease.count({ where }),
    ]);

    return {
      data: leases,
      total,
      limit,
      offset,
    };
  }

  @Get('expiring')
  async getExpiringLeases(@Query('days') days: string = '60') {
    const daysNum = parseInt(days, 10) || 60;
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysNum);

    const leases = await this.prisma.lease.findMany({
      where: {
        status: 'ACTIVE',
        endDate: { lte: futureDate },
      },
      include: {
        tenant: { select: { id: true, fullName: true, email: true, phone: true } },
        unit: { select: { id: true, name: true, unitNumber: true } },
      },
      orderBy: { endDate: 'asc' },
    });

    return {
      data: leases,
      total: leases.length,
      expiresWithinDays: daysNum,
    };
  }

  @Get(':id')
  async getLease(@Param('id') id: string) {
    const leaseId = parseInt(id, 10);

    const lease = await this.prisma.lease.findUnique({
      where: { id: leaseId },
      include: {
        tenant: true,
        unit: { include: { property: true } },
      },
    });

    if (!lease) {
      throw new NotFoundException('Lease not found');
    }

    // Get payment history
    const payments = await this.prisma.payment.findMany({
      where: { leaseId },
      orderBy: { paymentDate: 'desc' },
      take: 12,
    });

    // Calculate delinquency
    const overduePayments = payments.filter(p => p.status !== 'PAID' && p.paymentDate < new Date());
    const delinquencyAmount = overduePayments.reduce((sum, p) => sum + p.amount, 0);

    return {
      ...lease,
      paymentHistory: payments,
      delinquency: {
        count: overduePayments.length,
        amount: delinquencyAmount,
      },
    };
  }

  @Post(':id/activate')
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  async activateLease(@Param('id') id: string) {
    const leaseId = parseInt(id, 10);

    const lease = await this.prisma.lease.findUnique({
      where: { id: leaseId },
    });

    if (!lease) {
      throw new NotFoundException('Lease not found');
    }

    const activated = await this.prisma.lease.update({
      where: { id: leaseId },
      data: { status: 'ACTIVE' },
    });

    // Resolve related decision
    await this.prisma.decision.updateMany({
      where: { domain: 'leasing', entityId: String(leaseId), resolved: false },
      data: { resolved: true, resolvedAt: new Date() },
    });

    console.log('[LEASE] Activated:', leaseId);

    return { id: activated.id, status: activated.status };
  }

  @Post(':id/renew')
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  async renewLease(
    @Param('id') id: string,
    @Body() dto: RenewLeaseDto,
  ) {
    const leaseId = parseInt(id, 10);

    const existing = await this.prisma.lease.findUnique({
      where: { id: leaseId },
    });

    if (!existing) {
      throw new NotFoundException('Lease not found');
    }

    if (existing.status !== 'ACTIVE') {
      throw new BadRequestException('Can only renew active leases');
    }

    // Create new lease
    const newStartDate = dto.newStartDate ? new Date(dto.newStartDate) : new Date(existing.endDate);
    newStartDate.setDate(newStartDate.getDate() + 1);

    const newEndDate = dto.newEndDate ? new Date(dto.newEndDate) : new Date(existing.endDate);
    newEndDate.setFullYear(newEndDate.getFullYear() + 1);

    const newLease = await this.prisma.lease.create({
      data: {
        tenantId: existing.tenantId,
        unitId: existing.unitId,
        startDate: newStartDate,
        endDate: newEndDate,
        monthlyRent: dto.newMonthlyRent || existing.monthlyRent,
        securityDeposit: existing.securityDeposit,
        status: 'PENDING',
        autoRenew: existing.autoRenew,
        noticePeriodDays: existing.noticePeriodDays,
        priorLeaseId: existing.id,
      },
    });

    // Update old lease
    await this.prisma.lease.update({
      where: { id: leaseId },
      data: { status: 'EXPIRED' },
    });

    // Update unit status to reflect pending renewal
    await this.prisma.unit.update({
      where: { id: existing.unitId },
      data: { status: 'LEASE_RENEWED' },
    });

    console.log('[LEASE] Renewed:', leaseId, '->', newLease.id);

    return {
      oldLeaseId: leaseId,
      newLeaseId: newLease.id,
      newStartDate: newLease.startDate,
      newEndDate: newLease.endDate,
      newMonthlyRent: newLease.monthlyRent,
    };
  }

  @Post(':id/terminate')
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  async terminateLease(
    @Param('id') id: string,
    @Body() dto: TerminateLeaseDto,
  ) {
    const leaseId = parseInt(id, 10);

    const lease = await this.prisma.lease.findUnique({
      where: { id: leaseId },
    });

    if (!lease) {
      throw new NotFoundException('Lease not found');
    }

    const terminationDate = new Date(dto.terminationDate);

    const terminated = await this.prisma.lease.update({
      where: { id: leaseId },
      data: {
        status: 'TERMINATED',
        terminationDate,
        terminationReason: dto.reason,
      },
    });

    // Update unit to vacant
    await this.prisma.unit.update({
      where: { id: lease.unitId },
      data: { status: 'VACANT' },
    });

    // Create move-out decision if move out confirmed
    if (dto.moveOutConfirmed) {
      await this.prisma.decision.create({
        data: {
          domain: 'leasing',
          type: 'MOVE_OUT_PROCESS',
          entityId: String(leaseId),
          title: `Process move-out for unit ${lease.unitId}`,
          priority: 60,
          urgency: 'this_week',
          context: { leaseId, terminationDate },
        },
      });
    }

    console.log('[LEASE] Terminated:', leaseId);

    return {
      id: terminated.id,
      status: terminated.status,
      terminationDate: terminated.terminationDate,
    };
  }
}