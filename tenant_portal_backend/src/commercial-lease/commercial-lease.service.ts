import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CommercialLeaseService {
  constructor(private readonly prisma: PrismaService) {}

  async createNnnTerms(leaseId: string, data: any) {
    return { leaseId, terms: data, status: 'CREATED' };
  }

  async reconcileCam(leaseId: string, year: number) {
    return { leaseId, year, camDueCents: 0, status: 'PENDING' };
  }
}
