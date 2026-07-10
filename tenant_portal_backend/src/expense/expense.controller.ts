
import { Controller, Get, Post, Body, UseGuards, Request, Param, Put, Delete, Query, ParseUUIDPipe, HttpCode } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ExpenseService } from './expense.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { Roles } from '../auth/roles.decorator';
import { ExpenseCategory, Role } from '@prisma/client';
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
    @Body() data: CreateExpenseDto,
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
  getExpenseById(@Param('id', ParseUUIDPipe) id: number, @OrgId() orgId?: string) {
    return this.expenseService.getExpenseById(id, orgId);
  }

  @Put(':id')
  updateExpense(
    @Param('id', ParseUUIDPipe) id: number,
    @Body() data: UpdateExpenseDto,
    @OrgId() orgId: string,
  ) {
    return this.expenseService.updateExpense(id, data, orgId);
  }

  @Delete(':id')
  deleteExpense(@Param('id', ParseUUIDPipe) id: number, @OrgId() orgId: string) {
    return this.expenseService.deleteExpense(id, orgId);
  }

  // ========== GAP REMEDIATION - Issue 9: Expense Anomaly Reasoning ==========

  /**
   * Get anomaly details for an expense
   * Gap: Issue 9 - Expense Anomaly Reasoning (P0)
   */
  @Get(':id/anomaly-details')
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  @HttpCode(200)
  async getAnomalyDetails(
    @Param('id', ParseUUIDPipe) id: number,
    @OrgId() orgId: string,
  ) {
    return this.expenseService.getAnomalyDetails(id, orgId);
  }

  // ========== END GAP REMEDIATION =========-
}
