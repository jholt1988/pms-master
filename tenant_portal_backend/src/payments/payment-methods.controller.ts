import { Body, Controller, Delete, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { OrgContextGuard } from '../common/org-context/org-context.guard';
import { PaymentMethodsService } from './payment-methods.service';
import { CreatePaymentMethodDto } from './dto/create-payment-method.dto';
import { Request } from 'express';
import { AuditLogService } from '../shared/audit-log.service';

interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
  };
}

@Controller('payments/payment-methods')
@UseGuards(AuthGuard('jwt'), RolesGuard, OrgContextGuard)
export class PaymentMethodsController {
  constructor(
    private readonly paymentMethodsService: PaymentMethodsService,
    private readonly auditLogService: AuditLogService,
  ) {}

  @Get()
  async list(@Req() req: AuthenticatedRequest) {
    return this.paymentMethodsService.listForUser(req.user.userId);
  }

  @Post()
  async create(@Body() dto: CreatePaymentMethodDto, @Req() req: AuthenticatedRequest) {
    const method = await this.paymentMethodsService.create(req.user.userId, dto);
    await this.auditLogService.record({
      actorId: req.user.userId,
      module: 'payments',
      action: 'CREATE_PAYMENT_METHOD',
      entityType: 'paymentMethod',
      entityId: method?.id,
      result: 'SUCCESS',
      metadata: { type: dto.type },
    });
    return method;
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const result = await this.paymentMethodsService.remove(req.user.userId, Number(id));
    await this.auditLogService.record({
      actorId: req.user.userId,
      module: 'payments',
      action: 'DELETE_PAYMENT_METHOD',
      entityType: 'paymentMethod',
      entityId: Number(id),
      result: 'SUCCESS',
    });
    return result;
  }
}
