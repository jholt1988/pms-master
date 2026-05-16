import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { OrgContextGuard } from '../common/org-context/org-context.guard';
import { OrgId } from '../common/org-context/org-id.decorator';
import { Roles } from '../auth/roles.decorator';
import { BookkeepingService } from './bookkeeping.service';

@Controller('bookkeeping')
@UseGuards(AuthGuard('jwt'), RolesGuard, OrgContextGuard)
export class BookkeepingController {
  constructor(private readonly bookkeepingService: BookkeepingService) {}

  @Get('workspace')
  @Roles('PROPERTY_MANAGER', 'OWNER', 'ADMIN')
  getWorkspace(@OrgId() orgId: string) {
    return this.bookkeepingService.getFinancialsWorkspace(orgId);
  }

  @Get('transactions/pending')
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  getPendingTransactions(@OrgId() orgId: string, @Query('take') take?: string) {
    return this.bookkeepingService.getPendingTransactions(orgId, take ? parseInt(take, 10) : undefined);
  }

  @Get('transactions/exceptions')
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  getExceptions(@OrgId() orgId: string) {
    return this.bookkeepingService.getExceptionTransactions(orgId);
  }

  @Patch('transactions/:id/categorize')
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  categorize(@Param('id') id: string, @Body() body: { category: string }, @Request() req: any) {
    return this.bookkeepingService.categorizeTransaction(id, body.category, req.user.userId);
  }

  @Patch('transactions/:id/exception')
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  markException(@Param('id') id: string, @Body() body: { reason: string }) {
    return this.bookkeepingService.markException(id, body.reason);
  }

  @Post('transactions/:id/allocate')
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  allocate(
    @Param('id') id: string,
    @Body() body: {
      allocations: {
        accountId: string;
        amountCents: number;
        propertyId?: string;
        unitId?: string;
        leaseId?: string;
        vendorId?: string;
        ownerId?: string;
      }[];
    },
  ) {
    return this.bookkeepingService.allocateTransaction(id, body.allocations);
  }

  @Get('reconciliation')
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  getReconciliation(@OrgId() orgId: string) {
    return this.bookkeepingService.getReconciliationSummary(orgId);
  }

  @Patch('reconciliation/items/:id/confirm')
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  confirmMatch(@Param('id') id: string, @Request() req: any) {
    return this.bookkeepingService.confirmReconciliationMatch(id, req.user.userId);
  }

  @Get('monthly-close')
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  getMonthlyClose(@OrgId() orgId: string) {
    return this.bookkeepingService.getMonthlyCloseStates(orgId);
  }

  @Post('monthly-close/:propertyId/lock')
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  lockMonth(
    @Param('propertyId') propertyId: string,
    @Body() body: { month: string },
    @Request() req: any,
  ) {
    return this.bookkeepingService.lockMonth(propertyId, body.month, req.user.userId);
  }

  @Post('monthly-close/:propertyId/reopen')
  @Roles('ADMIN')
  reopenMonth(
    @Param('propertyId') propertyId: string,
    @Body() body: { month: string; reason: string },
  ) {
    return this.bookkeepingService.reopenMonth(propertyId, body.month, body.reason);
  }

  @Get('owner-statements')
  @Roles('PROPERTY_MANAGER', 'OWNER', 'ADMIN')
  getOwnerStatements(@OrgId() orgId: string, @Query('month') month?: string) {
    return this.bookkeepingService.getOwnerStatements(orgId, month);
  }

  @Patch('owner-statements/:id/approve')
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  approveStatement(@Param('id') id: string, @Request() req: any) {
    return this.bookkeepingService.approveOwnerStatement(id, req.user.userId);
  }

  @Patch('owner-statements/:id/send')
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  sendStatement(@Param('id') id: string) {
    return this.bookkeepingService.markOwnerStatementSent(id);
  }

  @Get('chart-of-accounts')
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  getChartOfAccounts(@OrgId() orgId: string) {
    return this.bookkeepingService.getChartOfAccounts(orgId);
  }

  @Post('chart-of-accounts')
  @Roles('ADMIN')
  createAccount(
    @OrgId() orgId: string,
    @Body() body: { code: string; name: string; type: string; parentId?: string; description?: string },
  ) {
    return this.bookkeepingService.createAccount(orgId, body);
  }

  /**
   * POST /bookkeeping/transactions/import
   * Manual bank transaction import — accepts JSON rows or parsed CSV.
   * Rows are ingested as PENDING_REVIEW and flow through the existing
   * categorization / reconciliation pipeline.
   *
   * Body: { transactions: Array<{ date, description, amount, type? }> }
   * Dates: any format parseable by new Date()
   * Amount: dollar value string or number (e.g. "1234.56" or 1234.56)
   * Type: "CREDIT" | "DEBIT" (default CREDIT if omitted)
   */
  @Post('transactions/import')
  @Roles('ADMIN', 'PROPERTY_MANAGER')
  @HttpCode(201)
  importTransactions(
    @OrgId() orgId: string,
    @Request() req: any,
    @Body() body: { transactions: any[] },
  ) {
    return this.bookkeepingService.importTransactions(orgId, body.transactions, req.user?.sub ?? req.user?.userId);
  }
}
