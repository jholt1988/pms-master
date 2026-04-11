import { Controller, Get, Post, Body, UseGuards, Request, Query, Param, Optional } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PaymentsService } from './payments.service';
import { AIPaymentMetricsService } from './ai-payment-metrics.service';
import { Invoice, Payment, Role } from '@prisma/client';
import { RolesGuard } from '../auth/roles.guard';
import { OrgContextGuard } from '../common/org-context/org-context.guard';
import { OrgId } from '../common/org-context/org-id.decorator';
import { Roles } from '../auth/roles.decorator';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { CreatePaymentPlanDto } from './dto/create-payment-plan.dto';
import { CreateStripeCheckoutSessionDto } from './dto/create-stripe-checkout-session.dto';
import { CreateManualPaymentDto } from './dto/create-manual-payment.dto';
import { ReverseManualPaymentDto } from './dto/reverse-manual-payment.dto';
import { CreateManualChargeDto } from './dto/create-manual-charge.dto';
import { VoidManualChargeDto } from './dto/void-manual-charge.dto';
import { UpdateDelinquencyPriorityConfigDto } from './dto/update-delinquency-priority-config.dto';
import { IssueDelinquencyNoticeDto } from './dto/issue-delinquency-notice.dto';
import { ResolveDelinquencyLegalHoldDto } from './dto/resolve-delinquency-legal-hold.dto';
import { ReferDelinquencyAttorneyDto } from './dto/refer-delinquency-attorney.dto';
import { RecordCourtDateDto } from './dto/record-court-date.dto';
import { Request as ExpressRequest } from 'express';
import { AuditLogService } from '../shared/audit-log.service';

type AuthenticatedRequest = ExpressRequest & {
  user: {
    userId: string;
    role: Role;
  };
};

@Controller('payments')
@UseGuards(AuthGuard('jwt'), RolesGuard, OrgContextGuard)
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly auditLogService: AuditLogService,
    @Optional() private readonly aiMetrics?: AIPaymentMetricsService,
  ) {}

  @Post('invoices')
  @Roles('PROPERTY_MANAGER')
  async createInvoice(@Body() body: CreateInvoiceDto, @Request() req: AuthenticatedRequest, @OrgId() orgId: string): Promise<Invoice> {
    const invoice = await this.paymentsService.createInvoice(body, orgId);
    await this.auditLogService.record({
      orgId,
      actorId: req.user.userId,
      module: 'payments',
      action: 'CREATE_INVOICE',
      entityType: 'invoice',
      entityId: invoice.id,
      result: 'SUCCESS',
      metadata: { leaseId: body.leaseId, amount: body.amount },
    });
    return invoice;
  }

  @Get('invoices')
  @Roles('PROPERTY_MANAGER', 'TENANT')
  async getInvoices(
    @Request() req: AuthenticatedRequest,
    @Query('leaseId') leaseId?: string,
  ): Promise<Invoice[]> {
    const orgId = (req as any).org?.orgId as string | undefined;
    return this.paymentsService.getInvoicesForUser(req.user.userId, req.user.role, leaseId, orgId);
  }

  @Post()
  @Roles('PROPERTY_MANAGER', 'TENANT')
  async createPayment(
    @Body() body: CreatePaymentDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<Payment> {
    const orgId = (req as any).org?.orgId as string | undefined;
    const payment = await this.paymentsService.createPayment(body, req.user, orgId);
    await this.auditLogService.record({
      orgId,
      actorId: req.user.userId,
      module: 'payments',
      action: 'CREATE_PAYMENT',
      entityType: 'payment',
      entityId: payment.id,
      result: 'SUCCESS',
      metadata: { leaseId: body.leaseId, amount: body.amount },
    });
    return payment;
  }

  @Get()
  @Roles('PROPERTY_MANAGER', 'TENANT')
  async getPayments(
    @Request() req: AuthenticatedRequest,
    @Query('leaseId') leaseId?: string,
  ): Promise<Payment[]> {
    const orgId = (req as any).org?.orgId as string | undefined;
    return this.paymentsService.getPaymentsForUser(req.user.userId, req.user.role, leaseId, orgId);
  }

  // Back-compat alias for older UIs
  @Get('history')
  @Roles('PROPERTY_MANAGER', 'TENANT')
  async getPaymentHistory(
    @Request() req: AuthenticatedRequest,
    @Query('leaseId') leaseId?: string,
  ): Promise<Payment[]> {
    const orgId = (req as any).org?.orgId as string | undefined;
    return this.paymentsService.getPaymentsForUser(req.user.userId, req.user.role, leaseId, orgId);
  }

  @Get('ledger/accounts/:leaseId')
  @Roles('PROPERTY_MANAGER', 'TENANT')
  async getLedgerAccount(
    @Param('leaseId') leaseId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    const orgId = (req as any).org?.orgId as string | undefined;
    return this.paymentsService.getOperationalLedgerAccount(leaseId, req.user, orgId);
  }

  @Get('delinquency/queue')
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  async getDelinquencyQueue(
    @Request() req: AuthenticatedRequest,
    @Query('bucket') bucket?: '1_7' | '8_30' | '31_plus',
    @Query('propertyId') propertyId?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('sortBy') sortBy?: 'daysPastDue' | 'amountDueCents' | 'tenantName' | 'priorityScore',
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    const orgId = (req as any).org?.orgId as string | undefined;
    return this.paymentsService.getDelinquencyQueue({
      orgId,
      bucket,
      propertyId,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
      sortBy,
      sortOrder,
    });
  }

  @Get('delinquency/priority-config')
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  async getDelinquencyPriorityConfig(@OrgId() orgId: string) {
    return this.paymentsService.getDelinquencyPriorityConfig(orgId);
  }

  @Post('delinquency/priority-config')
  @Roles('ADMIN')
  async updateDelinquencyPriorityConfig(
    @OrgId() orgId: string,
    @Body() body: UpdateDelinquencyPriorityConfigDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const result = await this.paymentsService.updateDelinquencyPriorityConfig(orgId, body.daysWeight, body.amountWeight);
    await this.auditLogService.record({
      orgId,
      actorId: req.user.userId,
      module: 'payments',
      action: 'UPDATE_DELINQUENCY_PRIORITY_CONFIG',
      entityType: 'organization',
      entityId: orgId,
      result: 'SUCCESS',
      metadata: {
        daysWeight: body.daysWeight,
        amountWeight: body.amountWeight,
      },
    });
    return result;
  }
  

  @Post('delinquency/issue-notice')
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  async issueDelinquencyNotice(
    @Body() dto: IssueDelinquencyNoticeDto,
    @Request() req: AuthenticatedRequest,
    @OrgId() orgId: string,
  ) {
    return this.paymentsService.issueDelinquencyNotice(dto, req.user.userId, orgId);
  }

  @Post('delinquency/resolve-legal-hold')
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  async resolveDelinquencyLegalHold(
    @Body() dto: ResolveDelinquencyLegalHoldDto,
    @Request() req: AuthenticatedRequest,
    @OrgId() orgId: string,
  ) {
    return this.paymentsService.resolveDelinquencyLegalHold(dto, req.user.userId, orgId);
  }

  @Post('delinquency/refer-attorney')
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  async referDelinquencyToAttorney(
    @Body() dto: ReferDelinquencyAttorneyDto,
    @Request() req: AuthenticatedRequest,
    @OrgId() orgId: string,
  ) {
    return this.paymentsService.referDelinquencyToAttorney(dto, req.user.userId, orgId);
  }

  @Post('delinquency/record-court-date')
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  async recordCourtDate(
    @Body() dto: RecordCourtDateDto,
    @Request() req: AuthenticatedRequest,
    @OrgId() orgId: string,
  ) {
    return this.paymentsService.recordCourtDate(dto, req.user.userId, orgId);
  }

  @Get('delinquency/legal-tracker/:leaseId')
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  async getDelinquencyLegalTracker(
    @Param('leaseId') leaseId: string,
    @Request() req: AuthenticatedRequest,
    @OrgId() orgId: string,
  ) {
    return this.paymentsService.getDelinquencyLegalTracker(leaseId, orgId);
  }

  @Get('delinquency/attorney-packet/:leaseId')
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  async getAttorneyPacketChecklist(
    @Param('leaseId') leaseId: string,
    @Request() req: AuthenticatedRequest,
    @OrgId() orgId: string,
  ) {
    return this.paymentsService.getAttorneyPacketChecklist(
      leaseId,
      { userId: req.user.userId, role: req.user.role },
      orgId,
    );
  }

  @Post('stripe/checkout-session')
  @Roles('PROPERTY_MANAGER', 'TENANT')
  async createStripeCheckoutSession(
    @Body() body: CreateStripeCheckoutSessionDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<{ checkoutUrl: string; sessionId: string; invoiceId: number }> {
    const orgId = (req as any).org?.orgId as string | undefined;
    return this.paymentsService.createStripeCheckoutSession(body, req.user, orgId);
  }

  @Get('ai-metrics')
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  async getAIMetrics() {
    return this.aiMetrics ? this.aiMetrics.getMetrics() : {};
  }

  @Post('manual')
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  async postManualPayment(
    @Body() dto: CreateManualPaymentDto,
    @Request() req: AuthenticatedRequest,
    @OrgId() orgId: string,
  ) {
    const payment = await this.paymentsService.postManualPayment({
      ...dto,
      receivedAt: dto.receivedAt ? new Date(dto.receivedAt) : undefined,
      createdById: req.user.userId,
    }, orgId);

    await this.auditLogService.record({
      orgId,
      actorId: req.user.userId,
      module: 'payments',
      action: 'MANUAL_PAYMENT_POSTED',
      entityType: 'manualPayment',
      entityId: payment.id,
      result: 'SUCCESS',
      metadata: {
        leaseId: dto.leaseId,
        tenantId: dto.tenantId,
        amountCents: dto.amountCents,
        method: dto.method,
        referenceNumber: dto.referenceNumber,
      },
    });

    return payment;
  }

  @Post('manual/:id/reverse')
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  async reverseManualPayment(
    @Param('id') id: string,
    @Body() dto: ReverseManualPaymentDto,
    @Request() req: AuthenticatedRequest,
    @OrgId() orgId: string,
  ) {
    const payment = await this.paymentsService.reverseManualPayment(id, dto.reason, orgId);

    await this.auditLogService.record({
      orgId,
      actorId: req.user.userId,
      module: 'payments',
      action: 'MANUAL_PAYMENT_REVERSED',
      entityType: 'manualPayment',
      entityId: id,
      result: 'SUCCESS',
      metadata: { reason: dto.reason },
    });

    return payment;
  }

  @Post('charges/manual')
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  async postManualCharge(
    @Body() dto: CreateManualChargeDto,
    @Request() req: AuthenticatedRequest,
    @OrgId() orgId: string,
  ) {
    const charge = await this.paymentsService.postManualCharge({
      ...dto,
      chargeDate: dto.chargeDate ? new Date(dto.chargeDate) : undefined,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      createdById: req.user.userId,
    }, orgId);

    await this.auditLogService.record({
      orgId,
      actorId: req.user.userId,
      module: 'payments',
      action: 'MANUAL_CHARGE_POSTED',
      entityType: 'manualCharge',
      entityId: charge.id,
      result: 'SUCCESS',
      metadata: {
        leaseId: dto.leaseId,
        tenantId: dto.tenantId,
        amountCents: dto.amountCents,
        chargeType: dto.chargeType,
      },
    });

    return charge;
  }

  @Post('charges/manual/:id/void')
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  async voidManualCharge(
    @Param('id') id: string,
    @Body() dto: VoidManualChargeDto,
    @Request() req: AuthenticatedRequest,
    @OrgId() orgId: string,
  ) {
    const charge = await this.paymentsService.voidManualCharge(id, dto.reason, orgId);

    await this.auditLogService.record({
      orgId,
      actorId: req.user.userId,
      module: 'payments',
      action: 'MANUAL_CHARGE_VOIDED',
      entityType: 'manualCharge',
      entityId: id,
      result: 'SUCCESS',
      metadata: { reason: dto.reason },
    });

    return charge;
  }

  @Get('invoices/:id')
  @Roles('PROPERTY_MANAGER', 'TENANT')
  async getInvoiceById(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<Invoice> {
    const orgId = (req as any).org?.orgId as string | undefined;
    return this.paymentsService.getInvoiceById(Number(id), req.user.userId, req.user.role, orgId);
  }

  @Post('payment-plans')
  @Roles('PROPERTY_MANAGER')
  async createPaymentPlan(
    @Body() dto: CreatePaymentPlanDto,
    @Request() req: AuthenticatedRequest,
    @OrgId() orgId: string,
  ) {
    const plan = await this.paymentsService.createPaymentPlan(dto.invoiceId, {
      installments: dto.installments,
      amountPerInstallment: dto.amountPerInstallment,
      totalAmount: dto.totalAmount,
    }, orgId);
    await this.auditLogService.record({
      orgId,
      actorId: req.user.userId,
      module: 'payments',
      action: 'CREATE_PAYMENT_PLAN',
      entityType: 'paymentPlan',
      entityId: plan?.id,
      result: 'SUCCESS',
      metadata: { invoiceId: dto.invoiceId, installments: dto.installments },
    });
    return plan;
  }

  @Get('payment-plans')
  @Roles('PROPERTY_MANAGER', 'TENANT')
  async getPaymentPlans(
    @Request() req: AuthenticatedRequest,
    @Query('invoiceId') invoiceId?: string,
  ) {
    const parsedInvoiceId = invoiceId ? Number(invoiceId) : undefined;
    const orgId = (req as any).org?.orgId as string | undefined;
    return this.paymentsService.getPaymentPlans(req.user.userId, req.user.role, parsedInvoiceId, orgId);
  }

  @Get('payment-plans/:id')
  @Roles('PROPERTY_MANAGER', 'TENANT')
  async getPaymentPlanById(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    const orgId = (req as any).org?.orgId as string | undefined;
    return this.paymentsService.getPaymentPlanById(Number(id), req.user.userId, req.user.role, orgId);
  }

  @Get('ops-summary')
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  async getPaymentsOpsSummary(
    @Request() req: AuthenticatedRequest,
    @Query('limit') limit?: string,
  ) {
    const orgId = (req as any).org?.orgId as string | undefined;
    return this.paymentsService.getPaymentsOpsSummary(orgId, limit ? Number(limit) : undefined);
  }

  @Post('ops-summary/bulk-action')
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  async executePaymentsBulkAction(
    @Body()
    body: {
      action: 'SEND_PAYMENT_REMINDER' | 'RETRY_FAILED_PAYMENT';
      ids: Array<string | number>;
      simulate?: boolean;
      confirm?: boolean;
      simulationToken?: string;
    },
    @Request() req: AuthenticatedRequest,
  ) {
    const orgId = (req as any).org?.orgId as string | undefined;
    return this.paymentsService.executePaymentsBulkAction(
      body.action,
      body.ids,
      { userId: req.user.userId },
      orgId,
      body.simulate ?? false,
      body.confirm ?? false,
      body.simulationToken,
    );
  }

  @Get(':id')
  @Roles('PROPERTY_MANAGER', 'TENANT')
  async getPaymentById(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<Payment> {
    const orgId = (req as any).org?.orgId as string | undefined;
    return this.paymentsService.getPaymentById(Number(id), req.user.userId, req.user.role, orgId);
  }
}
