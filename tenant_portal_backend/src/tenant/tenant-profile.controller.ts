// Story 11: Create and Manage Tenant Profile from Unit Context
// POST /tenants, PATCH /tenants/:id
// Dependencies: 2, 4 | Estimate: Medium

import { Controller, Post, Patch, Body, Param, UseGuards, NotFoundException, BadRequestException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { PrismaService } from '../prisma/prisma.service';

interface CreateTenantDto {
  fullName: string;
  email: string;
  phone: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  notes?: string;
  unitId: string;
  leaseId?: string;
}

interface UpdateTenantDto {
  fullName?: string;
  email?: string;
  phone?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  notes?: string;
}

@Controller('tenants')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class TenantProfileController {
  private readonly logger = new Logger(this.constructor.name);
  constructor(private readonly prisma: PrismaService) {}

  @Post()
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  async createTenantProfile(@Body() dto: CreateTenantDto) {
    // Validate required fields
    if (!dto.fullName?.trim()) {
      throw new BadRequestException('fullName is required');
    }
    if (!dto.email?.includes('@')) {
      throw new BadRequestException('Valid email is required');
    }
    if (!dto.phone?.trim()) {
      throw new BadRequestException('phone is required');
    }
    if (!dto.unitId) {
      throw new BadRequestException('unitId is required');
    }

    // Verify unit exists
    const unit = await this.prisma.unit.findUnique({
      where: { id: dto.unitId },
    });
    if (!unit) {
      throw new NotFoundException('Unit not found');
    }

    // Verify lease exists if provided
    if (dto.leaseId) {
      const lease = await this.prisma.lease.findUnique({
        where: { id: dto.leaseId },
      });
      if (!lease) {
        throw new NotFoundException('Lease not found');
      }
      if (lease.unitId !== dto.unitId) {
        throw new BadRequestException('lease.unitId must match payload.unitId');
      }
    }

    // Create tenant
    const tenant = await this.prisma.tenant.create({
      data: {
        fullName: dto.fullName.trim(),
        email: dto.email.toLowerCase().trim(),
        phone: dto.phone.trim(),
        emergencyContactName: dto.emergencyContactName?.trim(),
        emergencyContactPhone: dto.emergencyContactPhone?.trim(),
        notes: dto.notes?.trim(),
      },
    });

    // Link tenant to lease if provided
    if (dto.leaseId) {
      await this.prisma.lease.update({
        where: { id: dto.leaseId },
        data: { tenantId: tenant.id },
      });
    }

    this.logger.log('[TENANT] ProfileCreated:', tenant.id);

    return {
      id: tenant.id,
      fullName: tenant.fullName,
      email: tenant.email,
      phone: tenant.phone,
      unitId: dto.unitId,
      leaseId: dto.leaseId,
    };
  }

  @Patch(':id')
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  async updateTenantProfile(
    @Param('id') id: string,
    @Body() dto: UpdateTenantDto,
  ) {
    const tenantId = id;

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    // Validate email if provided
    if (dto.email && !dto.email.includes('@')) {
      throw new BadRequestException('Invalid email format');
    }

    // Update only provided fields
    const updated = await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        ...(dto.fullName && { fullName: dto.fullName.trim() }),
        ...(dto.email && { email: dto.email.toLowerCase().trim() }),
        ...(dto.phone && { phone: dto.phone.trim() }),
        ...(dto.emergencyContactName !== undefined && { emergencyContactName: dto.emergencyContactName?.trim() }),
        ...(dto.emergencyContactPhone !== undefined && { emergencyContactPhone: dto.emergencyContactPhone?.trim() }),
        ...(dto.notes !== undefined && { notes: dto.notes?.trim() }),
      },
    });

    this.logger.log('[TENANT] ProfileUpdated:', tenantId);

    return {
      id: updated.id,
      fullName: updated.fullName,
      email: updated.email,
      phone: updated.phone,
    };
  }
}

// Extend GET /units/:id to include tenant summary
@Controller('units')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class UnitTenantSummaryController {
  private readonly logger = new Logger(this.constructor.name);
  constructor(private readonly prisma: PrismaService) {}

  async getUnitWithTenantSummary(unitId: string) {
    const unit = await this.prisma.unit.findUnique({
      where: { id: unitId },
      include: {
        property: true,
        leases: {
          where: { status: 'ACTIVE' },
          take: 1,
          include: {
            tenant: true,
          },
        },
      },
    });

    if (!unit) {
      throw new NotFoundException('Unit not found');
    }

    const activeLease = unit.leases[0];
    const tenant = activeLease?.tenant;

    // Check for missing required fields
    const hasCompleteContact = !!(tenant?.fullName && tenant?.email && tenant?.phone);

    return {
      id: unit.id,
      name: unit.name,
      status: unit.status,
      propertyId: unit.propertyId,
      tenantId: tenant?.id ?? null,
      tenantName: tenant?.fullName ?? null,
      tenantEmail: tenant?.email ?? null,
      tenantPhone: tenant?.phone ?? null,
      delinquencyStatus: 'CURRENT', // Placeholder - would calculate from payments
      lastPaymentStatus: 'PAID', // Placeholder - would calculate from payments
      contactComplete: hasCompleteContact,
    };
  }
}