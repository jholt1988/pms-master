import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Invoice, Payment, Role } from '@prisma/client';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

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

  async createPayment(dto: CreatePaymentDto): Promise<Payment> {
    const lease = await this.prisma.lease.findUnique({
      where: { id: dto.leaseId },
      include: { tenant: true },
    });

    if (!lease || !lease.tenantId) {
      throw new BadRequestException('Lease must exist and have an assigned tenant');
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
}


