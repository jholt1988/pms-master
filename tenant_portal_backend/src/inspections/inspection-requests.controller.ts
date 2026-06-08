import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { OrgContextGuard } from '../common/org-context/org-context.guard';
import { OrgId } from '../common/org-context/org-id.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { InspectionRequestStatus, InspectionType } from '@prisma/client';

@Controller('inspections/requests')
@UseGuards(AuthGuard('jwt'), RolesGuard, OrgContextGuard)
export class InspectionRequestsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @Roles('PROPERTY_MANAGER', 'ADMIN', 'OWNER')
  async list(
    @OrgId() orgId?: string,
    @Query('status') status?: InspectionRequestStatus,
    @Query('type') type?: InspectionType,
    @Query('take') take?: string,
    @Query('skip') skip?: string,
  ) {
    const where = {
      ...(orgId ? { property: { organizationId: orgId } } : {}),
      ...(status ? { status } : {}),
      ...(type ? { type } : {}),
    };

    const takeValue = Math.min(Math.max(Number(take ?? 50) || 50, 1), 100);
    const skipValue = Math.max(Number(skip ?? 0) || 0, 0);

    const [requests, total] = await Promise.all([
      this.prisma.inspectionRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: skipValue,
        take: takeValue,
        include: {
          tenant: { select: { id: true, username: true, firstName: true, lastName: true, email: true } },
          property: { select: { id: true, name: true, address: true, city: true, state: true } },
          unit: { select: { id: true, name: true, unitNumber: true } },
          lease: { select: { id: true, startDate: true, endDate: true } },
          decidedBy: { select: { id: true, username: true } },
        },
      }),
      this.prisma.inspectionRequest.count({ where }),
    ]);

    return {
      data: requests,
      meta: {
        pagination: {
          total,
          skip: skipValue,
          take: takeValue,
        },
      },
      errors: [],
    };
  }
}
