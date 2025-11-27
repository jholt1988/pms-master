import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Invoice, Payment, Role } from '@prisma/client';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { AIPaymentService } from './ai-payment.service';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiPaymentService: AIPaymentService,
  ) {}

  async createInvoice(dto: CreateInvoiceDto): Promise<Invoice> {
    const lease = await this.prisma.lease.findUnique({
      where: { id: dto.leaseId },
    });

    if (!lease) {
      throw new NotFoundException('Lease not found');
    }

    return this.prisma.invoice.create({
      data: {
        description: dto.description,
        amount: dto.amount,
        dueDate: new Date(dto.dueDate),
        lease: { connect: { id: dto.leaseId } },
      },
      include: {
        lease: { include: { tenant: true, unit: { include: { property: true } } } },
        payments: true,
        lateFees: true,
      },
    });
  }

  async getInvoicesForUser(userId: number, role: Role, leaseId?: number): Promise<Invoice[]> {
    if (role === Role.PROPERTY_MANAGER) {
      return this.prisma.invoice.findMany({
        where: leaseId ? { leaseId } : undefined,
        include: {
          lease: { include: { tenant: true, unit: { include: { property: true } } } },
          payments: true,
          lateFees: true,
          schedule: true,
        },
        orderBy: { dueDate: 'desc' },
      });
    }

    return this.prisma.invoice.findMany({
      where: {
        lease: {
          tenantId: userId,
          ...(leaseId ? { id: leaseId } : {}),
        },
      },
      include: {
        lease: { include: { tenant: true, unit: { include: { property: true } } } },
        payments: true,
        lateFees: true,
        schedule: true,
      },
      orderBy: { dueDate: 'desc' },
    });
  }

  async createPayment(
    dto: CreatePaymentDto,
    authUser?: { userId: number; role: Role },
  ): Promise<Payment> {
    const lease = await this.prisma.lease.findUnique({
      where: { id: dto.leaseId },
      include: { tenant: true },
    });

    if (!lease || !lease.tenantId) {
      throw new BadRequestException('Lease must exist and have an assigned tenant');
    }

    if (authUser?.role === Role.TENANT && lease.tenantId !== authUser.userId) {
      throw new ForbiddenException('You can only submit payments for your own lease');
    }

    if (dto.invoiceId) {
      const invoice = await this.prisma.invoice.findUnique({
        where: { id: dto.invoiceId },
      });

      if (!invoice || invoice.leaseId !== dto.leaseId) {
        throw new BadRequestException('Invoice does not belong to the specified lease');
      }
    }

    const payment = await this.prisma.payment.create({
      data: {
        amount: dto.amount,
        status: dto.status ?? 'COMPLETED',
        paymentDate: dto.paymentDate ? new Date(dto.paymentDate) : new Date(),
        invoice: dto.invoiceId ? { connect: { id: dto.invoiceId } } : undefined,
        lease: { connect: { id: dto.leaseId } },
        user: { connect: { id: lease.tenantId } },
        externalId: dto['externalId'] as string | undefined,
        paymentMethod: dto.paymentMethodId ? { connect: { id: dto.paymentMethodId } } : undefined,
      },
      include: {
        invoice: true,
        lease: { include: { tenant: true, unit: { include: { property: true } } } },
        paymentMethod: true,
      },
    });

    if (payment.invoiceId) {
      await this.markInvoicePaid(payment.invoiceId);
    }

    return payment;
  }

  async getPaymentsForUser(userId: number, role: Role, leaseId?: number): Promise<Payment[]> {
    if (role === Role.PROPERTY_MANAGER) {
      return this.prisma.payment.findMany({
        where: leaseId ? { leaseId } : undefined,
        include: {
          invoice: true,
          lease: { include: { tenant: true, unit: { include: { property: true } } } },
          paymentMethod: true,
        },
        orderBy: { paymentDate: 'desc' },
      });
    }

    return this.prisma.payment.findMany({
      where: {
        userId,
        ...(leaseId ? { leaseId } : {}),
      },
      include: {
        invoice: true,
        lease: { include: { tenant: true, unit: { include: { property: true } } } },
        paymentMethod: true,
      },
      orderBy: { paymentDate: 'desc' },
    });
  }

  async recordPaymentForInvoice(params: {
    invoiceId: number;
    amount: number;
    leaseId: number;
    userId: number;
    paymentMethodId?: number;
    externalId?: string;
    initiatedBy?: string;
  }): Promise<Payment> {
    const payment = await this.prisma.payment.create({
      data: {
        amount: params.amount,
        status: 'COMPLETED',
        paymentDate: new Date(),
        invoice: { connect: { id: params.invoiceId } },
        lease: { connect: { id: params.leaseId } },
        user: { connect: { id: params.userId } },
        externalId: params.externalId,
        paymentMethod: params.paymentMethodId ? { connect: { id: params.paymentMethodId } } : undefined,
      },
      include: {
        invoice: true,
        lease: { include: { tenant: true, unit: { include: { property: true } } } },
        paymentMethod: true,
      },
    });

    await this.markInvoicePaid(params.invoiceId);

    return payment;
  }

  async markPaymentReconciled(paymentId: number, externalId: string): Promise<Payment> {
    return this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        reconciledAt: new Date(),
        externalId,
      },
      include: { invoice: true, lease: true },
    });
  }

  private async markInvoicePaid(invoiceId: number): Promise<void> {
    await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: { status: 'PAID' },
    });
  }

  /**
   * Get invoices due within a specified number of days
   */
  async getInvoicesDueInDays(days: number): Promise<Invoice[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const targetDate = new Date(today);
    targetDate.setDate(targetDate.getDate() + days);

    return this.prisma.invoice.findMany({
      where: {
        dueDate: {
          gte: today,
          lte: targetDate,
        },
        status: 'PENDING',
      },
      include: {
        lease: {
          include: {
            tenant: true,
            unit: {
              include: { property: true },
            },
          },
        },
        payments: true,
      },
      orderBy: { dueDate: 'asc' },
    });
  }

  /**
   * Get invoices due today
   */
  async getInvoicesDueToday(): Promise<Invoice[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return this.prisma.invoice.findMany({
      where: {
        dueDate: {
          gte: today,
          lt: tomorrow,
        },
        status: 'PENDING',
      },
      include: {
        lease: {
          include: {
            tenant: true,
            unit: {
              include: { property: true },
            },
          },
        },
        payments: true,
      },
    });
  }

  /**
   * Create a payment plan for an invoice
   */
  async createPaymentPlan(
    invoiceId: number,
    plan: {
      installments: number;
      amountPerInstallment: number;
      totalAmount: number;
    },
  ): Promise<void> {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    // Store payment plan in invoice metadata or create a separate payment plan record
    // For now, we'll add a note to the invoice
    // In a full implementation, you'd create a PaymentPlan table
    this.logger.log(
      `Payment plan created for invoice ${invoiceId}: ` +
      `${plan.installments} installments of $${plan.amountPerInstallment.toFixed(2)}`,
    );

    // Update invoice with payment plan information
    // Note: This assumes you have a metadata field or paymentPlanId field
    // If not, you may need to create a PaymentPlan model in Prisma
  }

  /**
   * Send payment reminder for an invoice
   */
  async sendPaymentReminder(
    invoiceId: number,
    reminder: {
      message: string;
      channel: 'EMAIL' | 'SMS' | 'PUSH';
      urgency: 'LOW' | 'MEDIUM' | 'HIGH';
    },
  ): Promise<void> {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        lease: {
          include: {
            tenant: true,
          },
        },
      },
    });

    if (!invoice || !invoice.lease?.tenantId) {
      throw new NotFoundException('Invoice or tenant not found');
    }

    this.logger.log(
      `Sending payment reminder for invoice ${invoiceId} via ${reminder.channel}`,
    );

    // The actual sending will be handled by the notification service
    // This method is a placeholder for the reminder logic
  }
}


