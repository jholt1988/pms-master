// Story 9: Create Maintenance Request
// POST /maintenance
// Dependencies: None | Estimate: Small

// Story 10: Schedule Repair
// POST /maintenance/:id/schedule
// Dependencies: Story 9 | Estimate: Medium

import { Controller, Post, Body, Param, UseGuards, NotFoundException } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { PrismaService } from '../prisma/prisma.service';

interface CreateMaintenanceDto {
  title: string;
  description?: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  unitId?: number;
  propertyId?: number;
  category?: string;
}

interface ScheduleMaintenanceDto {
  scheduledDate?: string;
  vendorId?: number;
  notes?: string;
}

@Controller('maintenance')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class MaintenanceRadialController {
  private readonly logger = new Logger(this.constructor.name);
  constructor(private readonly prisma: PrismaService) {}

  @Post()
  @Roles('TENANT', 'PROPERTY_MANAGER', 'ADMIN')
  async createRequest(@Body() dto: CreateMaintenanceDto) {
    const request = await this.prisma.maintenanceRequest.create({
      data: {
        title: dto.title,
        description: dto.description,
        priority: dto.priority || 'MEDIUM',
        unitId: dto.unitId,
        propertyId: dto.propertyId,
        category: dto.category || 'GENERAL',
        status: 'SUBMITTED',
        submittedAt: new Date(),
      },
    });

    // Create decision for scheduling
    await this.prisma.decision.create({
      data: {
        type: 'MAINTENANCE_SCHEDULE',
        domain: 'repairs',
        entityId: String(request.id),
        title: `Schedule: ${request.title}`,
        urgency: request.priority === 'URGENT' ? 'immediate' : 'this_week',
        priority: request.priority === 'URGENT' ? 90 : 60,
        context: { requestId: request.id },
      },
    });

    this.logger.log('[RADIAL] MaintenanceRequestCreated:', request.id);

    return {
      id: request.id,
      title: request.title,
      status: request.status,
      priority: request.priority,
    };
  }

  @Post(':id/schedule')
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  async schedule(
    @Param('id') id: string,
    @Body() dto: ScheduleMaintenanceDto,
  ) {
    const requestId = parseInt(id, 10);

    const request = await this.prisma.maintenanceRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException('Maintenance request not found');
    }

    // Update status to scheduled
    const updated = await this.prisma.maintenanceRequest.update({
      where: { id: requestId },
      data: {
        status: 'SCHEDULED',
        scheduledDate: dto.scheduledDate ? new Date(dto.scheduledDate) : null,
        vendorId: dto.vendorId,
        scheduledAt: new Date(),
      },
    });

    // Resolve scheduling decision
    await this.prisma.decision.updateMany({
      where: {
        type: 'MAINTENANCE_SCHEDULE',
        entityId: String(requestId),
        resolved: false,
      },
      data: {
        resolved: true,
        resolvedAt: new Date(),
      },
    });

    this.logger.log('[RADIAL] MaintenanceScheduled:', requestId);

    return {
      id: updated.id,
      status: updated.status,
      scheduledDate: updated.scheduledDate,
    };
  }
}