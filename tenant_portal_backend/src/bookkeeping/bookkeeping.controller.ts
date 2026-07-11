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
import { OrgId } from '../common/org-context/org-id.decorator';
import { Roles } from '../auth/roles.decorator';
import { BookkeepingService } from './bookkeeping.service';

const ok = <T>(data: T, meta: Record<string, unknown> = {}) => ({ data, meta, errors: [] });
const pagination = (total: number, skip: number, take: number) => ({ pagination: { total, skip, take } });

@Controller('bookkeeping')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class BookkeepingController {
  constructor(private readonly bookkeepingService: BookkeepingService) {}

  @Get('workspace')
  @Roles('PROPERTY_MANAGER', 'OWNER', 'ADMIN')
  async getWorkspace(@OrgId() orgId: string) {
    return ok(await this.bookkeepingService.getFinancialsWorkspace(orgId));
  }

  @Get('transactions/pending')
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  async getPendingTransactions(@OrgId() orgId: string, @Query('take') take?: string, @Query('skip') skip?: string) {
    const result = await this.bookkeepingService.getPendingTransactions(orgId, take ? parseInt(take, 10) : undefined, skip ? parseInt(skip, 10) : undefined);
    return ok(result.data, pagination(result.total, result.skip, result.take));
  }

  @Get('transactions/exceptions')
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  async getExceptions(@OrgId() orgId: string, @Query('take') take?: string, @Query('skip') skip?: string) {
    const result = await this.bookkeepingService.getExceptionTransactions(orgId, take ? parseInt(take, 10) : undefined, skip ? parseInt(skip, 10) : undefined);
    return ok(result.data, pagination(result.total, result.skip, result.take));
  }

  @Patch('transactions/:id/categorize')
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  async categorize(@Param('id') id: string, @Body() body: { category: string }, @Request() req: any) {
    return ok(await this.bookkeepingService.categorizeTransaction(id, body.category, req.user.userId));
  }

  @Patch('transactions/:id/exception')
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  async markException(@Param('id') id: string, @Body() body: { reason: string }) {
    return ok(await this.bookkeepingService.markException(id, body.reason));
  }

  @Post('transactions/:id/allocate')
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  async allocate(
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
    return ok(await this.bookkeepingService.allocateTransaction(id, body.allocations));
  }

  @Get('reconciliation')
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  async getReconciliation(@OrgId() orgId: string) {
    return ok(await this.bookkeepingService.getReconciliationSummary(orgId));
  }

  @Patch('reconciliation/items/:id/confirm')
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  async confirmMatch(@Param('id') id: string, @Request() req: any) {
    return ok(await this.bookkeepingService.confirmReconciliationMatch(id, req.user.userId));
  }

  @Get('monthly-close')
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  async getMonthlyClose(@OrgId() orgId: string) {
    return ok(await this.bookkeepingService.getMonthlyCloseStates(orgId));
  }

  @Post('monthly-close/:propertyId/lock')
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  async lockMonth(
    @Param('propertyId') propertyId: string,
    @Body() body: { month: string },
    @Request() req: any,
  ) {
    return ok(await this.bookkeepingService.lockMonth(propertyId, body.month, req.user.userId));
  }

  @Post('monthly-close/:propertyId/reopen')
  @Roles('ADMIN')
  async reopenMonth(
    @Param('propertyId') propertyId: string,
    @Body() body: { month: string; reason: string },
  ) {
    return ok(await this.bookkeepingService.reopenMonth(propertyId, body.month, body.reason));
  }

  @Get('owner-statements')
  @Roles('PROPERTY_MANAGER', 'OWNER', 'ADMIN')
  async getOwnerStatements(@OrgId() orgId: string, @Query('month') month?: string) {
    return ok(await this.bookkeepingService.getOwnerStatements(orgId, month));
  }

  @Patch('owner-statements/:id/approve')
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  async approveStatement(@Param('id') id: string, @Request() req: any) {
    return ok(await this.bookkeepingService.approveOwnerStatement(id, req.user.userId));
  }

  @Patch('owner-statements/:id/send')
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  async sendStatement(@Param('id') id: string) {
    return ok(await this.bookkeepingService.markOwnerStatementSent(id));
  }

  @Get('chart-of-accounts')
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  async getChartOfAccounts(@OrgId() orgId: string) {
    return ok(await this.bookkeepingService.getChartOfAccounts(orgId));
  }

  @Post('chart-of-accounts/seed')
  @Roles('ADMIN')
  @HttpCode(201)
  async seedChartOfAccounts(@OrgId() orgId: string) {
    return ok(await this.bookkeepingService.seedDefaultChartOfAccounts(orgId));
  }

  @Get('chart-of-accounts/mapping-status')
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  async getMappingStatus(@OrgId() orgId: string) {
    return ok(await this.bookkeepingService.validateRequiredAccountingMappings(orgId));
  }

  @Post('chart-of-accounts')
  @Roles('ADMIN')
  async createAccount(
    @OrgId() orgId: string,
    @Body() body: { code: string; name: string; type: string; parentId?: string; description?: string },
  ) {
    return ok(await this.bookkeepingService.createAccount(orgId, body));
  }

  @Post('journal-entries/draft-from-ledger')
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  @HttpCode(201)
  async draftFromLedger(@OrgId() orgId: string, @Request() req: any, @Body() body: { ledgerTransactionId: string }) {
    return ok(await this.bookkeepingService.createAccountingDraftFromOperationalLedgerEvent(orgId, body.ledgerTransactionId, req.user.userId));
  }

  @Post('journal-entries')
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  @HttpCode(201)
  async createJournalDraft(@OrgId() orgId: string, @Request() req: any, @Body() body: any) {
    return ok(await this.bookkeepingService.createJournalDraft(orgId, body, req.user.userId));
  }

  @Post('journal-entries/:id/post')
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  async postJournal(@Param('id') id: string, @Request() req: any) {
    return ok(await this.bookkeepingService.postJournalEntry(id, req.user.userId));
  }

  @Post('journal-entries/:id/reverse')
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  @HttpCode(201)
  async reverseJournal(@Param('id') id: string, @Request() req: any, @Body() body: { reason: string; date?: string }) {
    return ok(await this.bookkeepingService.reverseJournalEntry(id, body.reason, req.user.userId, body.date ? new Date(body.date) : undefined));
  }

  @Post('owner-statements/generate')
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  @HttpCode(201)
  async generateOwnerStatements(@OrgId() orgId: string, @Body() body: { month: string }) {
    return ok(await this.bookkeepingService.generateOwnerStatementsFromPostedEntries(orgId, body.month));
  }

  @Get('payment-expansion-gates')
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  async getPaymentExpansionGates(@OrgId() orgId: string) {
    return ok(await this.bookkeepingService.getPaymentExpansionGateStatus(orgId));
  }

  @Get('quickbooks/export-spec')
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  async getQuickBooksExportSpec(@OrgId() orgId: string) {
    return ok(await this.bookkeepingService.getQuickBooksExportBatchSpec(orgId));
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
  async importTransactions(
    @OrgId() orgId: string,
    @Request() req: any,
    @Body() body: { transactions: any[] },
  ) {
    return ok(await this.bookkeepingService.importTransactions(orgId, body.transactions, req.user?.sub ?? req.user?.userId));
  }
}
