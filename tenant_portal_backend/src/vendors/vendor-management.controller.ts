// Story 20: Vendor and Contractor Management System
// POST /vendors, GET /vendors, POST /vendors/:id/rate, POST /vendors/:id/assign
// Dependencies: 9, 10 | Estimate: Medium

import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards, NotFoundException, BadRequestException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { PrismaService } from '../prisma/prisma.service';

interface CreateVendorDto {
  name: string;
  email?: string;
  phone?: string;
  category: string;
  specialties?: string[];
  hourlyRate?: number;
  licenseNumber?: string;
  insuranceExpiry?: string;
  notes?: string;
}

interface RateVendorDto {
  rating: number;
  comment?: string;
  maintenanceRequestId?: number;
}

interface AssignVendorDto {
  maintenanceRequestId: number;
  scheduledDate?: string;
  estimatedDuration?: number;
  quotedPrice?: number;
  notes?: string;
}

@Controller('vendors')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class VendorManagementController {
  constructor(private readonly prisma: PrismaService) {}

  @Post()
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  async createVendor(@Body() dto: CreateVendorDto) {
    if (!dto.name?.trim()) throw new BadRequestException('Vendor name is required');
    if (!dto.category) throw new BadRequestException('Category is required');

    const vendor = await this.prisma.vendor.create({
      data: {
        name: dto.name.trim(),
        email: dto.email?.toLowerCase(),
        phone: dto.phone,
        category: dto.category,
        specialties: dto.specialties || [],
        hourlyRate: dto.hourlyRate,
        licenseNumber: dto.licenseNumber,
        insuranceExpiry: dto.insuranceExpiry ? new Date(dto.insuranceExpiry) : null,
        notes: dto.notes,
        status: 'ACTIVE',
      },
    });

    console.log('[VENDOR] Created:', vendor.id, vendor.name);

    return { id: vendor.id, name: vendor.name, category: vendor.category };
  }

  @Get()
  async listVendors(
    @Query('category') category?: string,
    @Query('status') status?: string,
    @Query('minRating') minRating?: string,
    @Query('search') search?: string,
  ) {
    const where: any = {};
    if (category) where.category = category;
    if (status) where.status = status;
    if (minRating) where.averageRating = { gte: parseFloat(minRating) };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const vendors = await this.prisma.vendor.findMany({
      where,
      orderBy: [{ averageRating: 'desc' }, { name: 'asc' }],
      take: 50,
    });

    return { data: vendors, total: vendors.length };
  }

  @Get('categories')
  async listCategories() {
    const categories = await this.prisma.vendor.groupBy({
      by: ['category'],
      _count: true,
      orderBy: { _count: { id: 'desc' } },
    });

    return categories.map(c => ({ category: c.category, count: c._count }));
  }

  @Get(':id')
  async getVendor(@Param('id') id: string) {
    const vendorId = parseInt(id, 10);
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
      include: {
        ratings: { orderBy: { createdAt: 'desc' }, take: 10 },
        assignments: { where: { status: 'ACTIVE' }, take: 5 },
      },
    });

    if (!vendor) throw new NotFoundException('Vendor not found');

    // Calculate average rating
    const allRatings = await this.prisma.vendorRating.findMany({
      where: { vendorId },
      select: { rating: true },
    });
    const avgRating = allRatings.length > 0
      ? allRatings.reduce((sum, r) => sum + r.rating, 0) / allRatings.length
      : null;

    return { ...vendor, averageRating: avgRating };
  }

  @Patch(':id')
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  async updateVendor(@Param('id') id: string, @Body() dto: Partial<CreateVendorDto>) {
    const vendorId = parseInt(id, 10);
    const vendor = await this.prisma.vendor.findUnique({ where: { id: vendorId } });
    if (!vendor) throw new NotFoundException('Vendor not found');

    const updated = await this.prisma.vendor.update({
      where: { id: vendorId },
      data: {
        ...(dto.name && { name: dto.name.trim() }),
        ...(dto.email && { email: dto.email.toLowerCase() }),
        ...(dto.phone && { phone: dto.phone }),
        ...(dto.category && { category: dto.category }),
        ...(dto.specialties && { specialties: dto.specialties }),
        ...(dto.hourlyRate && { hourlyRate: dto.hourlyRate }),
        ...(dto.licenseNumber && { licenseNumber: dto.licenseNumber }),
        ...(dto.insuranceExpiry && { insuranceExpiry: new Date(dto.insuranceExpiry) }),
        ...(dto.notes && { notes: dto.notes }),
      },
    });

    console.log('[VENDOR] Updated:', vendorId);

    return { id: updated.id, name: updated.name };
  }

  @Post(':id/rate')
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  async rateVendor(@Param('id') id: string, @Body() dto: RateVendorDto) {
    const vendorId = parseInt(id, 10);
    const vendor = await this.prisma.vendor.findUnique({ where: { id: vendorId } });
    if (!vendor) throw new NotFoundException('Vendor not found');

    if (dto.rating < 1 || dto.rating > 5) throw new BadRequestException('Rating must be 1-5');

    const rating = await this.prisma.vendorRating.create({
      data: {
        vendorId,
        rating: dto.rating,
        comment: dto.comment,
        maintenanceRequestId: dto.maintenanceRequestId,
        ratedBy: 'pm', // In production, from auth
      },
    });

    // Update vendor's average rating
    const allRatings = await this.prisma.vendorRating.findMany({
      where: { vendorId },
      select: { rating: true },
    });
    const avgRating = allRatings.reduce((sum, r) => sum + r.rating, 0) / allRatings.length;

    await this.prisma.vendor.update({
      where: { id: vendorId },
      data: { averageRating: avgRating },
    });

    console.log('[VENDOR] Rated:', vendorId, dto.rating);

    return { id: rating.id, rating: dto.rating };
  }

  @Post(':id/assign')
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  async assignVendor(@Param('id') id: string, @Body() dto: AssignVendorDto) {
    const vendorId = parseInt(id, 10);
    const vendor = await this.prisma.vendor.findUnique({ where: { id: vendorId } });
    if (!vendor) throw new NotFoundException('Vendor not found');

    const request = await this.prisma.maintenanceRequest.findUnique({
      where: { id: dto.maintenanceRequestId },
    });
    if (!request) throw new NotFoundException('Maintenance request not found');

    // Create assignment
    const assignment = await this.prisma.vendorAssignment.create({
      data: {
        vendorId,
        maintenanceRequestId: dto.maintenanceRequestId,
        status: 'ASSIGNED',
        scheduledDate: dto.scheduledDate ? new Date(dto.scheduledDate) : null,
        estimatedDuration: dto.estimatedDuration,
        quotedPrice: dto.quotedPrice,
        notes: dto.notes,
      },
    });

    // Update maintenance request
    await this.prisma.maintenanceRequest.update({
      where: { id: dto.maintenanceRequestId },
      data: {
        status: 'ASSIGNED',
        vendorId,
        assignedAt: new Date(),
      },
    });

    // Resolve any related scheduling decision
    await this.prisma.decision.updateMany({
      where: { domain: 'repairs', entityId: String(dto.maintenanceRequestId), type: 'MAINTENANCE_SCHEDULE', resolved: false },
      data: { resolved: true, resolvedAt: new Date() },
    });

    console.log('[VENDOR] Assigned:', vendorId, 'to request:', dto.maintenanceRequestId);

    return { id: assignment.id, vendorId, requestId: dto.maintenanceRequestId, status: 'ASSIGNED' };
  }

  @Post(':id/deactivate')
  @Roles('ADMIN')
  async deactivateVendor(@Param('id') id: string) {
    const vendorId = parseInt(id, 10);
    const vendor = await this.prisma.vendor.findUnique({ where: { id: vendorId } });
    if (!vendor) throw new NotFoundException('Vendor not found');

    await this.prisma.vendor.update({
      where: { id: vendorId },
      data: { status: 'INACTIVE' },
    });

    console.log('[VENDOR] Deactivated:', vendorId);

    return { success: true };
  }
}