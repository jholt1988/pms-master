
import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { PaymentMethodsController } from './payment-methods.controller';
import { PaymentMethodsService } from './payment-methods.service';
import { StripeService } from './stripe.service';
import { StripeWebhookController } from './stripe-webhook.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PaymentsController, PaymentMethodsController, StripeWebhookController],
  providers: [PaymentsService, PaymentMethodsService, StripeService],
  exports: [PaymentsService, PaymentMethodsService, StripeService],
})
export class PaymentsModule {}

