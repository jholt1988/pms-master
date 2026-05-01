// Story 7: Categorize Financial Transactions
// PATCH /transactions/:id
// Dependencies: None | Estimate: Medium

import { Controller, Patch, Post, Param, Body, UseGuards, NotFoundException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { PrismaService } from '../prisma/prisma.service';

interface CategorizeTransactionDto {
  category: string;
}

@Controller('transactions')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class TransactionsRadialController {
  constructor(private readonly prisma: PrismaService) {}

  @Patch(':id')
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  async categorize(
    @Param('id') id: string,
    @Body() dto: CategorizeTransactionDto,
  ) {
    const transactionId = parseInt(id, 10);

    const transaction = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    // Update category
    const updated = await this.prisma.transaction.update({
      where: { id: transactionId },
      data: { category: dto.category },
    });

    // Resolve any categorization decision
    await this.prisma.decision.updateMany({
      where: {
        type: 'TRANSACTION_UNCATEGORIZED',
        entityId: String(transactionId),
        resolved: false,
      },
      data: { resolved: true },
    });

    return {
      id: updated.id,
      category: updated.category,
    };
  }
}

// Story 8: Reconcile Transactions
// POST /transactions/reconcile
// Dependencies: Story 7 | Estimate: Medium

@Controller('transactions')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class ReconcileRadialController {
  constructor(private readonly prisma: PrismaService) {}

  @Post('reconcile')
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  async reconcileTransactions(@Body() body: { transactionIds: number[] }) {
    const { transactionIds } = body;

    if (!transactionIds || transactionIds.length === 0) {
      throw new Error('No transactions provided');
    }

    // Mark as reconciled
    const result = await this.prisma.transaction.updateMany({
      where: { id: { in: transactionIds } },
      data: { reconciled: true, reconciledAt: new Date() },
    });

    // Resolve reconciliation decisions
    await this.prisma.decision.updateMany({
      where: {
        type: 'TRANSACTION_UNRECONCILED',
        entityId: { in: transactionIds.map(String) },
        resolved: false,
      },
      data: { resolved: true },
    });

    console.log('[RADIAL] TransactionsReconciled:', result.count);

    return {
      reconciled: result.count,
    };
  }
}