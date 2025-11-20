
import { Controller, Get, Post, Body, UseGuards, Request, Param, Put, Delete, Query } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ExpenseService } from './expense.service';
import { Roles } from '../auth/roles.decorator';
import { Role, ExpenseCategory } from '@prisma/client';
import { RolesGuard } from '../auth/roles.guard';

interface AuthenticatedRequest extends Request {
  user: {
    userId: number;
    role: Role;
  };
}

@Controller('expenses')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(Role.PROPERTY_MANAGER)
export class ExpenseController {
  constructor(private readonly expenseService: ExpenseService) {}

  @Post()
  createExpense(
    @Request() req: AuthenticatedRequest,
    @Body() data: { propertyId: number; unitId?: number; description: string; amount: number; date: Date; category: ExpenseCategory },
  ) {
    return this.expenseService.createExpense(req.user.userId, data);
  }

  @Get()
  getAllExpenses(
    @Query('propertyId') propertyId?: string,
    @Query('unitId') unitId?: string,
    @Query('category') category?: ExpenseCategory,
  ) {
    return this.expenseService.getAllExpenses(propertyId ? Number(propertyId) : undefined, unitId ? Number(unitId) : undefined, category);
  }

  @Get(':id')
  getExpenseById(@Param('id') id: string) {
    return this.expenseService.getExpenseById(Number(id));
  }

  @Put(':id')
  updateExpense(
    @Param('id') id: string,
    @Body() data: { propertyId?: number; unitId?: number; description?: string; amount?: number; date?: Date; category?: ExpenseCategory },
  ) {
    return this.expenseService.updateExpense(Number(id), data);
  }

  @Delete(':id')
  deleteExpense(@Param('id') id: string) {
    return this.expenseService.deleteExpense(Number(id));
  }
}
