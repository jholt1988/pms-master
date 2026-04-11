import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UnitStatus } from '@prisma/client';

const VALID_TRANSITIONS: Record<UnitStatus, UnitStatus[]> = {
  VACANT: ['TURNING', 'UNDER_REPAIR', 'LISTED'],
  TURNING: ['VACANT', 'LISTED', 'UNDER_REPAIR'],
  LISTED: ['APPLIED', 'VACANT'],
  APPLIED: ['APPROVED', 'LISTED', 'VACANT'],
  APPROVED: ['LEASED', 'LISTED', 'VACANT'],
  LEASED: ['OCCUPIED', 'VACANT'],
  OCCUPIED: ['RENEWAL_DUE', 'DELINQUENT', 'VACANT', 'TURNING', 'UNDER_REPAIR'],
  DELINQUENT: ['OCCUPIED', 'VACANT', 'TURNING'],
  UNDER_REPAIR: ['VACANT', 'OCCUPIED', 'TURNING'],
  RENEWAL_DUE: ['OCCUPIED', 'VACANT', 'TURNING']
};

@Injectable()
export class UnitLifecycleService {
  constructor(private prisma: PrismaService) {}

  async transitionState(unitId: string, newState: UnitStatus, orgId: string) {
    const unit = await this.prisma.unit.findFirst({
      where: { id: unitId, property: { organizationId: orgId } }
    });

    if (!unit) throw new BadRequestException('Unit not found');

    const allowedTransitions = VALID_TRANSITIONS[unit.status];
    if (!allowedTransitions.includes(newState) && unit.status !== newState) {
      throw new BadRequestException(`Invalid state transition from ${unit.status} to ${newState}`);
    }

    return this.prisma.unit.update({
      where: { id: unitId },
      data: { status: newState }
    });
  }
}