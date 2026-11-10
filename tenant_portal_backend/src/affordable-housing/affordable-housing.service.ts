import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AffordableHousingService {
  constructor(private readonly prisma: PrismaService) {}

  async checkEligibility(tenantId: string) {
    return { tenantId, eligible: true, program: 'HUD', notes: 'Stub eligibility check' };
  }

  async recertify(tenantId: string) {
    return { tenantId, recertifiedAt: new Date().toISOString(), status: 'PENDING_REVIEW' };
  }

  async generateReport(program: string) {
    return { program, generatedAt: new Date().toISOString(), rows: [] };
  }
}
