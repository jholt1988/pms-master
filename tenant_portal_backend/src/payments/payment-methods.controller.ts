import { Body, Controller, Delete, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { PaymentMethodsService } from './payment-methods.service';
import { CreatePaymentMethodDto } from './dto/create-payment-method.dto';
import { Request } from 'express';

interface AuthenticatedRequest extends Request {
  user: {
    userId: number;
  };
}

@Controller('payment-methods')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class PaymentMethodsController {
  constructor(private readonly paymentMethodsService: PaymentMethodsService) {}

  @Get()
  async list(@Req() req: AuthenticatedRequest) {
    return this.paymentMethodsService.listForUser(req.user.userId);
  }

  @Post()
  async create(@Body() dto: CreatePaymentMethodDto, @Req() req: AuthenticatedRequest) {
    return this.paymentMethodsService.create(req.user.userId, dto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.paymentMethodsService.remove(req.user.userId, Number(id));
  }
}
