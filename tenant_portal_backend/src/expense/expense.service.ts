
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ExpenseCategory } from '@prisma/client';

@Injectable()
export class ExpenseService {
  constructor(private prisma: PrismaService) {}

  async createExpense(
    recordedById: number,
    data: { propertyId: number; unitId?: number; description: string; amount: number; date: Date; category: ExpenseCategory },
  ) {
    return this.prisma.expense.create({
      data: {
        recordedBy: { connect: { id: recordedById } },
        property: { connect: { id: data.propertyId } },
        unit: data.unitId ? { connect: { id: data.unitId } } : undefined,
        description: data.description,
        amount: data.amount,
        date: data.date,
        category: data.category,
      },
    });
  }

  async getAllExpenses(propertyId?: number, unitId?: number, category?: ExpenseCategory) {
    const where: any = {};
    if (propertyId) {
      where.propertyId = propertyId;
    }
    if (unitId) {
      where.unitId = unitId;
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
    data: { propertyId?: number; unitId?: number; description?: string; amount?: number; date?: Date; category?: ExpenseCategory },
  ) {
    return this.prisma.expense.update({ where: { id }, data });
  }

  async deleteExpense(id: number) {
    return this.prisma.expense.delete({ where: { id } });
  }
}
