// Story 1: Create Property via Radial Command
// POST /properties
// Dependencies: None | Estimate: Small

import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { PrismaService } from '../prisma/prisma.service';

interface CreatePropertyDto {
  name: string;
  address: string;
  unitCount: number;
}

@Controller('properties')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class PropertyRadialController {
  private readonly logger = new Logger(this.constructor.name);
  constructor(private readonly prisma: PrismaService) {}

  @Post()
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  async createProperty(
    @Body() dto: CreatePropertyDto,
    @OrgId() orgId: string,
  ) {
    // Validate input
    if (!dto.name || dto.name.trim().length === 0) {
      throw new Error('Property name is required');
    }
    if (!dto.unitCount || dto.unitCount < 1) {
      throw new Error('unitCount must be at least 1');
    }

    // Create property
    const property = await this.prisma.property.create({
      data: {
        name: dto.name.trim(),
        address: dto.address?.trim() || '',
        orgId,
        status: 'ACTIVE',
      },
    });

    // Emit event for Decision Engine
    // In production, emit via EventEmitter2
    this.logger.log('[RADIAL] PropertyCreated:', property.id);

    return {
      id: property.id,
      name: property.name,
      address: property.address,
      status: property.status,
      createdAt: property.createdAt,
    };
  }
}