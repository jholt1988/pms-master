import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DepositItemizationService {
  constructor(private readonly prisma: PrismaService) {}

  async createItemization(leaseId: string, items: { description: string; amountCents: number; photoUrl?: string }[]) {
    return { leaseId, items, status: 'DRAFT', createdAt: new Date().toISOString() };
  }

  async finalize(leaseId: string) {
    return { leaseId, status: 'FINALIZED', finalizedAt: new Date().toISOString() };
  }
}
