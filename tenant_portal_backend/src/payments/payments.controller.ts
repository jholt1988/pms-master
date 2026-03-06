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
