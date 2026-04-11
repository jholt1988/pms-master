import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TenantInsuranceService {
  private readonly logger = new Logger(TenantInsuranceService.name);

  constructor(private readonly prisma: PrismaService) {}

  async recordPolicy(leaseId: string, data: any) {
    return this.prisma.tenantInsurancePolicy.create({
      data: {
        leaseId,
        provider: data.provider,
        policyNumber: data.policyNumber,
        coverageAmount: data.coverageAmount,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        documentUrl: data.documentUrl,
      }
    });
  }

  async getPoliciesByLease(leaseId: string) {
    return this.prisma.tenantInsurancePolicy.findMany({
      where: { leaseId }
    });
  }

  async checkExpirations() {
    this.logger.log('Checking for expired tenant insurance policies...');
    const expired = await this.prisma.tenantInsurancePolicy.findMany({
      where: {
        endDate: { lt: new Date() },
        status: 'ACTIVE'
      },
      include: { lease: true }
    });

    for (const policy of expired) {
      await this.prisma.tenantInsurancePolicy.update({
        where: { id: policy.id },
        data: { status: 'EXPIRED' }
      });
      this.logger.warn(`Policy ${policy.id} for lease ${policy.leaseId} has expired. Force-placement required.`);
    }

    return expired.length;
  }
}
