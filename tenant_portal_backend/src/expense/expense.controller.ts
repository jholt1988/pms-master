
import { Controller, Get, Post, Body, UseGuards, Request, Param, Put, Delete, Query, ParseIntPipe } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ExpenseService } from './expense.service';
import { Roles } from '../auth/roles.decorator';
import { ExpenseCategory } from '@prisma/client';
import { RolesGuard } from '../auth/roles.guard';
import { OrgContextGuard } from '../common/org-context/org-context.guard';
import { OrgId } from '../common/org-context/org-id.decorator';

interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
    role: Role;
  };
}

@Controller('expenses')
@UseGuards(AuthGuard('jwt'), RolesGuard, OrgContextGuard)
@Roles('PROPERTY_MANAGER')
export class ExpenseController {
  constructor(private readonly expenseService: ExpenseService) {}

  @Post()
  createExpense(
    @Request() req: AuthenticatedRequest,
    @Body() data: { propertyId: string; unitId?: string; description: string; amount: number; date: Date; category: ExpenseCategory },
    @OrgId() orgId: string,
  ) {
    return this.expenseService.createExpense(req.user.userId, data, orgId);
  }

  @Get()
  getAllExpenses(
    @Query('propertyId') propertyId?: string,
    @Query('unitId') unitId?: string,
    @Query('category') category?: ExpenseCategory,
    @OrgId() orgId?: string,
  ) {
    return this.expenseService.getAllExpenses(propertyId, unitId, category, orgId);
  }

  @Get(':id')
  getExpenseById(@Param('id', ParseIntPipe) id: number, @OrgId() orgId?: string) {
    return this.expenseService.getExpenseById(id, orgId);
  }

  @Put(':id')
  updateExpense(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: { propertyId?: string; unitId?: string; description?: string; amount?: number; date?: Date; category?: ExpenseCategory },
    @OrgId() orgId: string,
  ) {
    return this.expenseService.updateExpense(id, data, orgId);
  }

  @Delete(':id')
  deleteExpense(@Param('id', ParseIntPipe) id: number, @OrgId() orgId: string) {
    return this.expenseService.deleteExpense(id, orgId);
  }
}
