import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PropertyRollupService {
  constructor(private prisma: PrismaService) {}

  async getPropertyRollup(propertyId: string, orgId: string) {
    const property = await this.prisma.property.findFirst({
      where: { id: propertyId, organizationId: orgId },
      include: {
        units: {
          include: {
            lease: {
              include: { invoices: { where: { status: 'OVERDUE' } } }
            },
            MaintenanceRequest: { where: { status: { not: 'COMPLETED' } } }
          }
        }
      }
    });

    if (!property) return null;

    let vacantCount = 0;
    let expiringCount = 0;
    let repairRiskCount = 0;
    let overdueAmount = 0;
    const signals: Array<{ type: string; message: string; unitId: string; unitName: string }> = [];

    property.units.forEach(unit => {
      if (unit.status === 'VACANT') vacantCount++;
      
      let unitOverdue = 0;
      if (unit.lease) {
        if (unit.lease.endDate) {
          const diffDays = (unit.lease.endDate.getTime() - new Date().getTime()) / (1000 * 3600 * 24);
          if (diffDays > 0 && diffDays <= 60) {
            expiringCount++;
            signals.push({ type: 'WARNING', message: `Lease Expiring`, unitId: unit.id, unitName: unit.name });
          }
        }
        unit.lease.invoices.forEach(inv => {
          unitOverdue += inv.amount;
        });
        if (unitOverdue > 0) {
          overdueAmount += unitOverdue;
          signals.push({ type: 'CRITICAL', message: `$${unitOverdue} Overdue`, unitId: unit.id, unitName: unit.name });
        }
      }

      if (unit.MaintenanceRequest.length > 0) {
        repairRiskCount++;
        signals.push({ type: 'CRITICAL', message: `Repair Risk`, unitId: unit.id, unitName: unit.name });
      }
    });

    return {
      totalUnits: property.units.length,
      vacantCount,
      expiringCount,
      repairRiskCount,
      overdueAmount,
      signals
    };
  }

  async getUnitRollup(unitId: string, orgId: string) {
    const unit = await this.prisma.unit.findFirst({
      where: { id: unitId, property: { organizationId: orgId } },
      include: {
        lease: {
          include: {
            invoices: true,
            payments: true
          }
        },
        expenses: true,
        MaintenanceRequest: { where: { status: { not: 'COMPLETED' } } },
        inspections: true
      }
    });

    if (!unit) return null;

    let revenueYtd = 0;
    let expenses = 0;

    unit.expenses.forEach(e => { expenses += e.amount; });
    if (unit.lease) {
      unit.lease.payments.forEach(p => {
        if (p.status === 'COMPLETED') revenueYtd += p.amount;
      });
    }

    return {
      revenueYtd,
      expenses,
      net: revenueYtd - expenses,
      activeIssues: unit.MaintenanceRequest.length,
      inspections: unit.inspections.length
    };
  }
}