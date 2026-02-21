
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
  ) {
    const propertyId = data.propertyId;
    const unitId = data.unitId ? this.parseUuidId(data.unitId, 'unit') : undefined;
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

  async getAllExpenses(propertyId?: string, unitId?: string, category?: ExpenseCategory) {
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

    return this.prisma.expense.findMany({ where, include: { property: true, unit: true, recordedBy: true } });
  }

  async getExpenseById(id: number) {
    return this.prisma.expense.findUnique({ where: { id }, include: { property: true, unit: true, recordedBy: true } });
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
  ) {
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

  async deleteExpense(id: number) {
    return this.prisma.expense.delete({ where: { id } });
  }
}
