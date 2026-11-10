import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DepositAlternativesService {
  constructor(private readonly prisma: PrismaService) {}

  async createInstallmentPlan(leaseId: string, totalCents: number, installments: number) {
    return { leaseId, totalCents, installments, status: 'ACTIVE', createdAt: new Date().toISOString() };
  }

  async processInstallment(planId: string) {
    return { planId, status: 'CHARGED', chargedAt: new Date().toISOString() };
  }
}
