
import { Controller, Get, Post, Body, UseGuards, Request, Param, Put, Delete, Query, ParseIntPipe } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ExpenseService } from './expense.service';
import { Roles } from '../auth/roles.decorator';
import { Role, ExpenseCategory } from '@prisma/client';
import { RolesGuard } from '../auth/roles.guard';
import { OrgContextGuard } from '../common/org-context/org-context.guard';

interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
    role: Role;
  };
}

@Controller('expenses')
@UseGuards(AuthGuard('jwt'), RolesGuard, OrgContextGuard)
@Roles(Role.PROPERTY_MANAGER)
export class ExpenseController {
  constructor(private readonly expenseService: ExpenseService) {}

  @Post()
  createExpense(
    @Request() req: AuthenticatedRequest,
    @Body() data: { propertyId: string; unitId?: string; description: string; amount: number; date: Date; category: ExpenseCategory },
  ) {
    return this.expenseService.createExpense(req.user.userId, data);
  }

  @Get()
  getAllExpenses(
    @Query('propertyId') propertyId?: string,
    @Query('unitId') unitId?: string,
    @Query('category') category?: ExpenseCategory,
  ) {
    return this.expenseService.getAllExpenses(propertyId, unitId, category);
  }

  @Get(':id')
  getExpenseById(@Param('id', ParseIntPipe) id: number) {
    return this.expenseService.getExpenseById(id);
  }

  @Put(':id')
  updateExpense(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: { propertyId?: string; unitId?: string; description?: string; amount?: number; date?: Date; category?: ExpenseCategory },
  ) {
    return this.expenseService.updateExpense(id, data);
  }

  @Delete(':id')
  deleteExpense(@Param('id', ParseIntPipe) id: number) {
    return this.expenseService.deleteExpense(id);
  }
}
