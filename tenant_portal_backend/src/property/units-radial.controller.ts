// Story 2: Create Units Under Property
// POST /units/bulk
// Dependencies: Story 1 | Estimate: Medium

import { Controller, Post, Body, UseGuards, BadRequestException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import { PrismaService } from '../../prisma/prisma.service';

interface BulkCreateUnitsDto {
  propertyId: number;
  unitCount: number;
  unitPrefix?: string;
}

@Controller('units')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class UnitsRadialController {
  constructor(private readonly prisma: PrismaService) {}

  @Post('bulk')
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  async bulkCreateUnits(@Body() dto: BulkCreateUnitsDto) {
    const { propertyId, unitCount, unitPrefix = 'Unit' } = dto;

    if (!propertyId || propertyId <= 0) {
      throw new BadRequestException('Valid propertyId is required');
    }
    if (!unitCount || unitCount < 1 || unitCount > 500) {
      throw new BadRequestException('unitCount must be between 1 and 500');
    }

    // Verify property exists
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
    });
    if (!property) {
      throw new BadRequestException('Property not found');
    }

    // Generate unit data
    const units = [];
    for (let i = 1; i <= unitCount; i++) {
      units.push({
        propertyId,
        name: `${unitPrefix} ${i}`,
        status: 'VACANT',
        unitNumber: String(i),
      });
    }

    // Bulk insert
    const created = await this.prisma.unit.createMany({
      data: units,
    });

    console.log('[RADIAL] UnitsCreated:', created.count, 'for property:', propertyId);

    return {
      success: true,
      created: created.count,
      propertyId,
    };
  }
}