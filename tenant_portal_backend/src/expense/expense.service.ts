
import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ExpenseCategory } from '@prisma/client';

@Injectable()
export class ExpenseService {
  constructor(private prisma: PrismaService) {}

  async createExpense(
    recordedById: string,
    data: { propertyId: string | number; unitId?: string | number; description: string; amount: number; date: Date; category: ExpenseCategory },
  ) {
    const propertyId = this.parseNumericId(data.propertyId, 'property');
    const unitId = data.unitId ? this.parseNumericId(data.unitId, 'unit') : undefined;
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

  async getAllExpenses(propertyId?: string | number, unitId?: string | number, category?: ExpenseCategory) {
    const where: any = {};
    if (propertyId) {
      where.propertyId = this.parseNumericId(propertyId, 'property');
    }
    if (unitId) {
      where.unitId = this.parseNumericId(unitId, 'unit');
    }
    if (category) {
      where.category = category;
    }

    return this.prisma.expense.findMany({ where, include: { property: true, unit: true, recordedBy: true } });
  }

  async getExpenseById(id: number) {
    return this.prisma.expense.findUnique({ where: { id }, include: { property: true, unit: true, recordedBy: true } });
  }

  async updateExpense(
    id: number,
    data: { propertyId?: string; unitId?: string; description?: string; amount?: number; date?: Date; category?: ExpenseCategory },
  ) {
    const updateData: any = { ...data };
    if (data.propertyId) {
      updateData.propertyId = this.parseNumericId(data.propertyId, 'property');
    }
    if (data.unitId) {
      updateData.unitId = this.parseNumericId(data.unitId, 'unit');
    }
    return this.prisma.expense.update({ where: { id }, data: updateData });
  }

  private parseNumericId(value: string | number, field: string): number {
    const normalized = typeof value === 'string' ? Number(value) : value;
    if (!Number.isFinite(normalized) || !Number.isInteger(normalized)) {
      throw new BadRequestException(`Invalid ${field} identifier provided.`);
    }
    return normalized;
  }

  async deleteExpense(id: number) {
    return this.prisma.expense.delete({ where: { id } });
  }
}
