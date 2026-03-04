import { Controller, Get, Post, Body, UseGuards, Request, Query, Param, Optional } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PaymentsService } from './payments.service';
import { AIPaymentMetricsService } from './ai-payment-metrics.service';
import { Invoice, Payment } from '@prisma/client';
import { RolesGuard } from '../auth/roles.guard';
import { OrgContextGuard } from '../common/org-context/org-context.guard';
import { OrgId } from '../common/org-context/org-id.decorator';
import { Roles } from '../auth/roles.decorator';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { CreatePaymentPlanDto } from './dto/create-payment-plan.dto';
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

  @Get('ai-metrics')
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  async getAIMetrics() {
    return this.aiMetrics ? this.aiMetrics.getMetrics() : {};
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
