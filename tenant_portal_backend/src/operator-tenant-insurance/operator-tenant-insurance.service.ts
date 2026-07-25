import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OperatorTenantInsuranceService {
  constructor(private readonly prisma: PrismaService) {}

  async getWorkbench(orgId: string) {
    const properties = await this.prisma.property.findMany({
      where: { organizationId: orgId },
      select: { id: true, name: true },
    });
    const propertyIds = properties.map((p) => p.id);

    const leases = await this.prisma.lease.findMany({
      where: {
        unit: { propertyId: { in: propertyIds } },
        status: 'ACTIVE',
      },
      select: {
        id: true,
        tenant: { select: { id: true, firstName: true, lastName: true } },
        unit: { select: { id: true, name: true, propertyId: true, property: { select: { name: true } } } },
      },
    });

    const policies = await this.prisma.tenantInsurancePolicy.findMany({
      where: {
        lease: {
          unit: { propertyId: { in: propertyIds } },
        },
      },
      include: {
        lease: {
          select: {
            id: true,
            tenant: { select: { firstName: true, lastName: true } },
            unit: { select: { name: true, property: { select: { name: true } } } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const now = new Date();
    const activePolicies = policies.filter((p) => p.status === 'ACTIVE');
    const expiringSoon = activePolicies.filter((p) => {
      if (!p.endDate) return false;
      const days = (p.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      return days <= 30 && days > 0;
    });
    const expiredPolicies = policies.filter((p) => p.status === 'EXPIRED');
    const missingPolicies = leases.filter(
      (lease) => !policies.some((p) => p.leaseId === lease.id),
    );

    return {
      generatedAt: now.toISOString(),
      metrics: {
        totalLeases: leases.length,
        activePolicies: activePolicies.length,
        expiringSoon: expiringSoon.length,
        expiredPolicies: expiredPolicies.length,
        missingPolicies: missingPolicies.length,
      },
      policies: policies.slice(0, 20),
      missingPolicies: missingPolicies.slice(0, 20),
    };
  }

  async recordPolicy(orgId: string, leaseId: string, data: any) {
    const lease = await this.prisma.lease.findFirst({
      where: { id: leaseId, unit: { property: { organizationId: orgId } } },
    });
    if (!lease) {
      throw new Error('Lease not found');
    }

    return this.prisma.tenantInsurancePolicy.create({
      data: {
        leaseId,
        provider: data.provider,
        policyNumber: data.policyNumber,
        coverageAmount: data.coverageAmount,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        documentUrl: data.documentUrl,
      },
    });
  }

  async getPolicies(orgId: string, leaseId: string) {
    return this.prisma.tenantInsurancePolicy.findMany({
      where: {
        leaseId,
        lease: { unit: { property: { organizationId: orgId } } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
