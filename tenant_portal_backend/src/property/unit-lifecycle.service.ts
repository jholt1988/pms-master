import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UnitStatus } from '@prisma/client';

@Injectable()
export class UnitLifecycleService {
  constructor(private prisma: PrismaService) {}

  async transitionState(unitId: string, newState: UnitStatus, orgId: string) {
    const unit = await this.prisma.unit.findFirst({
      where: { id: unitId, property: { organizationId: orgId } }
    });

    if (!unit) throw new BadRequestException('Unit not found');

    return this.prisma.unit.update({
      where: { id: unitId },
      data: { status: newState }
    });
  }
}