import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { AIPaymentService } from './ai-payment.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { PaymentMethodsController } from './payment-methods.controller';
import { PaymentMethodsService } from './payment-methods.service';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [PaymentsController, PaymentMethodsController],
  providers: [PaymentsService, PaymentMethodsService, AIPaymentService],
  exports: [PaymentsService, PaymentMethodsService, AIPaymentService],
})
export class PaymentsModule {}
