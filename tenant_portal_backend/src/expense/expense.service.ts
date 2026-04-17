
import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ExpenseCategory } from '@prisma/client';
import { isUUID } from 'class-validator';

@Injectable()
export class ExpenseService {
  constructor(private prisma: PrismaService) {}

  async createExpense(
    recordedById: string,
    data: {
      propertyId: string;
      unitId?: string;
      description: string;
      amount: number;
      date: Date;
      category: ExpenseCategory;
    },
    orgId: string,
  ) {
    const propertyId = data.propertyId;
    const unitId = data.unitId ? this.parseUuidId(data.unitId, 'unit') : undefined;
    

    const property = await this.prisma.property.findFirst({
      where: { id: propertyId, organizationId: orgId },
      select: { id: true },
    });
    if (!property) {
      throw new BadRequestException('Property not found');
    }

    return this.prisma.expense.create({
      data: {
        recordedBy: { connect: { id: recordedById } },
        property: { connect: { id: propertyId } },
        unit: unitId ? { connect: { id: unitId } } : undefined,
        description: data.description,
        amount: data.amount,
        date: data.date,
        category: data.category,
      },
    });
  }

  async getAllExpenses(propertyId?: string, unitId?: string, category?: ExpenseCategory, orgId?: string) {
    const where: any = {};
    if (propertyId) {
      where.propertyId = propertyId;
    }
    if (unitId) {
      where.unitId = this.parseUuidId(unitId, 'unit');
    }
    if (category) {
      where.category = category;
    }
    if (orgId) {
      where.property = { organizationId: orgId };
    }

    return this.prisma.expense.findMany({ where, include: { property: true, unit: true, recordedBy: true } });
  }

  async getExpenseById(id: number, orgId?: string) {
    return this.prisma.expense.findFirst({
      where: {
        id,
        ...(orgId ? { property: { organizationId: orgId } } : {}),
      },
      include: { property: true, unit: true, recordedBy: true },
    });
  }

  async updateExpense(
    id: number,
    data: {
      propertyId?: string;
      unitId?: string;
      description?: string;
      amount?: number;
      date?: Date;
      category?: ExpenseCategory;
    },
    orgId: string,
  ) {
    const existing = await this.prisma.expense.findFirst({
      where: { id, property: { organizationId: orgId } },
      select: { id: true },
    });
    if (!existing) {
      throw new BadRequestException('Expense not found');
    }

    const updateData: any = { ...data };
    if (data.unitId) {
      updateData.unitId = this.parseUuidId(data.unitId, 'unit');
    }
    return this.prisma.expense.update({ where: { id }, data: updateData });
  }

  private parseUuidId(value: string, field: string): string {
    if (!isUUID(value)) {
      throw new BadRequestException(`Invalid ${field} identifier provided.`);
    }
    return value;
  }

  async deleteExpense(id: number, orgId: string) {
    const existing = await this.prisma.expense.findFirst({
      where: { id, property: { organizationId: orgId } },
      select: { id: true },
    });
    if (!existing) {
      throw new BadRequestException('Expense not found');
    }
    return this.prisma.expense.delete({ where: { id } });
  }

  // ========== GAP REMEDIATION - Issue 9: Expense Anomaly Reasoning ==========

  async getAnomalyDetails(expenseId: number, orgId: string) {
    // In production, this would calculate actual anomaly metrics
    // For now, return stub data showing the structure

    return {
      expenseId,
      isAnomalous: true,
      anomalyDetection: {
        expectedRange: { min: 150, max: 350 },
        actualAmount: 850,
        variancePercent: 157,
        confidence: 0.89,
        detectionMethod: 'STATISTICAL_OUTLIER',
      },
      factors: [
        {
          factor: 'Amount outside normal range',
          impact: 'HIGH',
          description: 'Amount is 157% higher than historical average for this category',
        },
        {
          factor: 'Vendor inconsistency',
          impact: 'MEDIUM',
          description: 'This vendor has not been used in previous 6 months',
        },
        {
          factor: 'Timing anomaly',
          impact: 'LOW',
          description: 'Expense dated on weekend when property typically closed',
        },
      ],
      recommendations: [
        'Verify with vendorinvoice',
        'Confirm authorization',
        'Mark as approved after review',
      ],
    };
  }

  // ========== END GAP REMEDIATION =========-
}
