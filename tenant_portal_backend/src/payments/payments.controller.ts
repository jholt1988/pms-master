import { BadRequestException, Controller, Get, Post, Body, UseGuards, Request, Query } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PaymentsService } from './payments.service';
import { Invoice, Payment, Role } from '@prisma/client';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { Request as ExpressRequest } from 'express';

type AuthenticatedRequest = ExpressRequest & {
  user: {
    userId: number;
    role: Role;
  };
};

@Controller('payments')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('invoices')
  @Roles(Role.PROPERTY_MANAGER)
  async createInvoice(@Body() body: CreateInvoiceDto): Promise<Invoice> {
    return this.paymentsService.createInvoice(body);
  }

  @Get('invoices')
  @Roles(Role.PROPERTY_MANAGER, Role.TENANT)
  async getInvoices(
    @Request() req: AuthenticatedRequest,
    @Query('leaseId') leaseId?: string,
  ): Promise<Invoice[]> {
    const parsedLeaseId = leaseId === undefined ? undefined : Number(leaseId);
    if (leaseId !== undefined && Number.isNaN(parsedLeaseId)) {
      throw new BadRequestException('leaseId must be a number');
    }
    return this.paymentsService.getInvoicesForUser(req.user.userId, req.user.role, parsedLeaseId);
  }

  @Post()
  @Roles(Role.PROPERTY_MANAGER)
  async createPayment(@Body() body: CreatePaymentDto): Promise<Payment> {
    return this.paymentsService.createPayment(body);
  }

  @Get()
  @Roles(Role.PROPERTY_MANAGER, Role.TENANT)
  async getPayments(
    @Request() req: AuthenticatedRequest,
    @Query('leaseId') leaseId?: string,
  ): Promise<Payment[]> {
    const parsedLeaseId = leaseId === undefined ? undefined : Number(leaseId);
    if (leaseId !== undefined && Number.isNaN(parsedLeaseId)) {
      throw new BadRequestException('leaseId must be a number');
    }
    return this.paymentsService.getPaymentsForUser(req.user.userId, req.user.role, parsedLeaseId);
  }
}
