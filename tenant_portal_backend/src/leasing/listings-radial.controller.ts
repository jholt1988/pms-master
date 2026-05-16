// Story 3: List Vacant Units for Leasing
// POST /listings
// Dependencies: Story 2 | Estimate: Medium

import { Controller, Post, Body, UseGuards, NotFoundException } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { PrismaService } from '../prisma/prisma.service';

interface ListUnitDto {
  unitId: number;
  listingPrice?: number;
}

@Controller('listings')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class ListingsRadialController {
  private readonly logger = new Logger(this.constructor.name);
  constructor(private readonly prisma: PrismaService) {}

  @Post()
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  async listUnit(@Body() dto: ListUnitDto) {
    const { unitId, listingPrice } = dto;

    // Find unit
    const unit = await this.prisma.unit.findUnique({
      where: { id: unitId },
    });

    if (!unit) {
      throw new NotFoundException('Unit not found');
    }

    if (unit.status !== 'VACANT') {
      throw new Error('Unit is not vacant');
    }

    // Create listing
    const listing = await this.prisma.listing.create({
      data: {
        unitId,
        status: 'ACTIVE',
        listingPrice: listingPrice || 0,
      },
    });

    // Update unit status
    await this.prisma.unit.update({
      where: { id: unitId },
      data: { status: 'LISTED' },
    });

    this.logger.log('[RADIAL] UnitListed:', unitId);

    return {
      id: listing.id,
      unitId,
      status: listing.status,
    };
  }
}