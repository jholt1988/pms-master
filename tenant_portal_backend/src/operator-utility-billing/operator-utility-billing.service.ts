import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OperatorUtilityBillingService {
  private readonly logger = new Logger(OperatorUtilityBillingService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getWorkbench(orgId: string) {
    const properties = await this.prisma.property.findMany({
      where: { organizationId: orgId },
      select: { id: true, name: true },
    });
    const propertyIds = properties.map((p) => p.id);

    const masterBills = await this.prisma.masterUtilityBill.findMany({
      where: { propertyId: { in: propertyIds } },
      include: {
        property: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const allocations = await this.prisma.utilityAllocation.findMany({
      where: {
        masterBill: { propertyId: { in: propertyIds } },
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
      take: 20,
    });

    const pendingBills = masterBills.filter((b) => b.status === 'PENDING');
    const allocatedBills = masterBills.filter((b) => b.status === 'ALLOCATED');
    const totalAmountCents = masterBills.reduce((sum, b) => sum + (b.totalAmountCents ?? 0), 0);
    const allocatedAmountCents = allocations.reduce((sum, a) => sum + (a.allocatedAmountCents ?? 0), 0);

    return {
      generatedAt: new Date().toISOString(),
      metrics: {
        totalMasterBills: masterBills.length,
        pendingBills: pendingBills.length,
        allocatedBills: allocatedBills.length,
        totalAllocations: allocations.length,
        totalAmountCents,
        allocatedAmountCents,
      },
      masterBills,
      recentAllocations: allocations,
    };
  }

  async createMasterBill(orgId: string, data: any) {
    const property = await this.prisma.property.findFirst({
      where: { id: data.propertyId, organizationId: orgId },
    });
    if (!property) {
      throw new NotFoundException('Property not found');
    }

    return this.prisma.masterUtilityBill.create({
      data: {
        propertyId: data.propertyId,
        utilityType: data.utilityType,
        billingPeriod: data.billingPeriod,
        totalAmountCents: data.totalAmountCents,
        dueDate: new Date(data.dueDate),
      },
    });
  }

  async allocateBill(orgId: string, billId: string) {
    this.logger.log(`Allocating master utility bill ${billId}`);

    const bill = await this.prisma.masterUtilityBill.findFirst({
      where: { id: billId, property: { organizationId: orgId } },
      include: { property: { include: { units: { include: { lease: true } } } } },
    });

    if (!bill) throw new NotFoundException('Bill not found');

    const activeLeases = bill.property.units
      .map((u) => (u.lease as any)?.[0])
      .filter((l) => l && l.status === 'ACTIVE');

    if (activeLeases.length === 0) {
      return { allocated: 0 };
    }

    const amountPerLease = Math.floor(bill.totalAmountCents / activeLeases.length);

    for (const lease of activeLeases) {
      await this.prisma.utilityAllocation.create({
        data: {
          masterBillId: bill.id,
          leaseId: lease.id,
          allocatedAmountCents: amountPerLease,
          allocationMethod: 'EVEN_SPLIT',
        },
      });
    }

    await this.prisma.masterUtilityBill.update({
      where: { id: bill.id },
      data: { status: 'ALLOCATED' },
    });

    return {
      status: 'ALLOCATED',
      allocatedCount: activeLeases.length,
      amountPerLease,
    };
  }
}
