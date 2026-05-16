import { Controller, Get, Post, Body, UseGuards, Request, Query, Param, Optional, HttpCode } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PaymentsService } from './payments.service';
import { AIPaymentMetricsService } from './ai-payment-metrics.service';
import { Invoice, LeaseNoticeDeliveryMethod, Payment, Role } from '@prisma/client';
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
import { DelinquencyResolutionMode, ResolveDelinquencyLegalHoldDto } from './dto/resolve-delinquency-legal-hold.dto';
import { ReferDelinquencyAttorneyDto } from './dto/refer-delinquency-attorney.dto';
import { RecordCourtDateDto } from './dto/record-court-date.dto';
import { Request as ExpressRequest } from 'express';
import { AuditLogService } from '../shared/audit-log.service';
import { PrismaService } from '../prisma/prisma.service';

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
    private readonly prisma: PrismaService,
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
    const result = await this.paymentsService.getOperationalLedgerAccount(leaseId, req.user, orgId);
    await (this.prisma as any).telemetryEvent.create({
      data: {
        eventName: 'ledger_context_opened',
        userId: req.user.userId,
        orgId,
        entityId: leaseId,
        domain: 'payments',
        outcome: 'success',
        metadata: {}
      }
    });
    return result;
  }

  @Get('decisions')
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  async getPaymentDecisions(
    @Request() req: AuthenticatedRequest,
  ) {
    const orgId = (req as any).org?.orgId as string | undefined;
    return this.paymentsService.getPaymentDecisions(orgId);
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
    const result = await this.paymentsService.issueDelinquencyNotice(dto, req.user.userId, orgId);
    await (this.prisma as any).telemetryEvent.create({
      data: {
        eventName: 'payment_notice_sent',
        userId: req.user.userId,
        orgId,
        entityId: dto.leaseId,
        domain: 'payments',
        outcome: 'success',
        metadata: { deliveryMethod: dto.deliveryMethod },
      }
    });
    return result;
  }

  @Post('delinquency/by-payment/:paymentId/issue-notice')
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  async issueDelinquencyNoticeByPaymentId(
    @Param('paymentId') paymentId: string,
    @Body() body: { intent?: string; deliveryMethod?: LeaseNoticeDeliveryMethod; message?: string },
    @Request() req: AuthenticatedRequest,
    @OrgId() orgId: string,
  ) {
    const intent = body?.intent ?? 'send_late_notice';
    const defaultMessage =
      intent === 'send_3_day_notice'
        ? 'Three-day delinquency notice issued from admin feed action.'
        : 'Late notice issued from admin feed action.';

    return this.paymentsService.issueDelinquencyNoticeByPaymentId(
      Number(paymentId),
      {
        deliveryMethod: body?.deliveryMethod ?? LeaseNoticeDeliveryMethod.PRINT,
        approvalConfirmed: true,
        message: body?.message ?? defaultMessage,
      },
      req.user.userId,
      orgId,
    );
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

  @Post('delinquency/by-payment/:paymentId/promise-to-pay')
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  async setPromiseToPayByPaymentId(
    @Param('paymentId') paymentId: string,
    @Body() body: { reason?: string },
    @Request() req: AuthenticatedRequest,
    @OrgId() orgId: string,
  ) {
    return this.paymentsService.resolveDelinquencyLegalHoldByPaymentId(
      Number(paymentId),
      {
        resolutionMode: DelinquencyResolutionMode.PAYMENT_PLAN,
        reason: body?.reason ?? 'Promise to pay initiated from admin feed action.',
      },
      req.user.userId,
      orgId,
    );
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

  // ========== NEW ENDPOINTS FOR GAP REMEDIATION ==========
  
  /**
   * Send a message to tenant about their payment
   * Gap: Issue 1 - Payment Execution Handlers (P0)
   */
  @Post(':id/message-tenant')
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  @HttpCode(200)
  async messageTenant(
    @Param('id') paymentId: string,
    @Body() body: { subject: string; message: string },
    @Request() req: AuthenticatedRequest,
    @OrgId() orgId: string,
  ) {
    await this.auditLogService.log(
      `Payment message sent to tenant for payment ${paymentId}: ${body.subject}`,
    );
    return this.paymentsService.sendTenantMessage(
      parseInt(paymentId),
      body.subject,
      body.message,
      req.user.userId,
      orgId,
    );
  }

  /**
   * Record a manual payment for an existing payment
   * Gap: Issue 1 - Payment Execution Handlers (P0)
   */
  @Post(':id/record-manual')
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  @HttpCode(201)
  async recordManualPayment(
    @Param('id') paymentId: string,
    @Body() body: { amount: number; paymentDate: string; notes?: string; paymentMethod?: string },
    @Request() req: AuthenticatedRequest,
    @OrgId() orgId: string,
  ) {
    await this.auditLogService.log(
      `Manual payment recorded for payment ${paymentId}: amount=${body.amount}, method=${body.paymentMethod || 'MANUAL'}`,
    );
    return this.paymentsService.recordManualPayment(
      parseInt(paymentId),
      body.amount,
      new Date(body.paymentDate),
      body.notes,
      body.paymentMethod || 'MANUAL',
      req.user.userId,
      orgId,
    );
  }

  // ========== END NEW ENDPOINTS ==========

  @Get('delinquency/legal-tracker/:leaseId')
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  async getDelinquencyLegalTracker(
    @Param('leaseId') leaseId: string,
    @Request() req: AuthenticatedRequest,
    @OrgId() orgId: string,
  ) {
    const result = await this.paymentsService.getDelinquencyLegalTracker(leaseId, orgId);
    await (this.prisma as any).telemetryEvent.create({
      data: {
        eventName: 'notice_trail_opened',
        userId: req.user.userId,
        orgId,
        entityId: leaseId,
        domain: 'payments',
        outcome: 'success',
        metadata: {}
      }
    });
    return result;
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

  // ========== GAP REMEDIATION - Issue 7: Rent Reminder Automation ==========

  /**
   * Process rent reminders for upcoming due dates
   * Gap: Issue 7 - Rent Reminder Automation (P1)
   */
  @Post('reminders/process')
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  @HttpCode(200)
  async processRentReminders(
    @Body() body: { daysBeforeDue?: number },
    @OrgId() orgId: string,
  ) {
    const { RentReminderService } = await import('./rent-reminder.service');
    const reminderService = new RentReminderService(this.prisma);
    return reminderService.processRentReminders(body.daysBeforeDue || 7);
  }

  /**
   * Send reminder for specific payment
   * Gap: Issue 7 - Rent Reminder Automation (P1)
   */
  @Post(':id/send-reminder')
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  @HttpCode(200)
  async sendRentReminder(
    @Param('id') paymentId: string,
    @Body() body: { message?: string },
    @OrgId() orgId: string,
  ) {
    const { RentReminderService } = await import('./rent-reminder.service');
    const reminderService = new RentReminderService(this.prisma);
    return reminderService.sendReminder(parseInt(paymentId), body.message);
  }

  /**
   * Suppress/snooze reminder for payment
   * Gap: Issue 7 - Rent Reminder Automation (P1)
   */
  @Post(':id/suppress-reminder')
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  @HttpCode(200)
  async suppressReminder(
    @Param('id') paymentId: string,
    @Body() body: { days?: number },
    @OrgId() orgId: string,
  ) {
    const { RentReminderService } = await import('./rent-reminder.service');
    const reminderService = new RentReminderService(this.prisma);
    return reminderService.suppressReminder(parseInt(paymentId), body.days || 7);
  }

  // ========== END REMINDER ENDPOINTS ==========
}
