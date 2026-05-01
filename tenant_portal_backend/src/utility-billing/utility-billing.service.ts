import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UtilityBillingService {
  private readonly logger = new Logger(UtilityBillingService.name);

  constructor(private readonly prisma: PrismaService) {}

  async recordMasterBill(data: any) {
    return this.prisma.masterUtilityBill.create({
      data: {
        propertyId: data.propertyId,
        utilityType: data.utilityType,
        billingPeriod: data.billingPeriod,
        totalAmountCents: data.totalAmountCents,
        dueDate: new Date(data.dueDate),
      }
    });
  }

  async allocateMasterBill(billId: string) {
    this.logger.log(`Allocating master utility bill ${billId}`);
    
    const bill = await this.prisma.masterUtilityBill.findUnique({
      where: { id: billId },
      include: {
        property: {
          include: {
            units: {
              include: {
                leases: {
                  where: { status: 'ACTIVE' },
                  take: 1
                }
              }
            }
          }
        }
      }
    });

    if (!bill) throw new Error('Bill not found');

    const activeLeases = bill.property.units
      .map(u => u.leases[0])
      .filter(l => l && l.status === 'ACTIVE');

    if (activeLeases.length === 0) return { allocated: 0 };

    // Simple EVEN_SPLIT allocation logic
    const amountPerLease = Math.floor(bill.totalAmountCents / activeLeases.length);

    for (const lease of activeLeases) {
      await this.prisma.utilityAllocation.create({
        data: {
          masterBillId: bill.id,
          leaseId: lease.id,
          allocatedAmountCents: amountPerLease,
          allocationMethod: 'EVEN_SPLIT'
        }
      });
      // In reality, this would also create a ManualCharge or Invoice for the tenant
    }

    await this.prisma.masterUtilityBill.update({
      where: { id: bill.id },
      data: { status: 'ALLOCATED' }
    });

    return {
      status: 'ALLOCATED',
      allocatedCount: activeLeases.length,
      amountPerLease
    };
  }
}
