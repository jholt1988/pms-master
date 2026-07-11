import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { AIPaymentService } from './ai-payment.service';
import { AIPaymentMetricsService } from './ai-payment-metrics.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { PaymentMethodsController } from './payment-methods.controller';
import { PaymentMethodsService } from './payment-methods.service';
import { StripeService } from './stripe.service';
import { StripeWebhookController } from './stripe-webhook.controller';
import { RentReminderService } from './rent-reminder.service';
import { EmailModule } from '../email/email.module';
import { PaymentStrategyRegistry } from './ai/payment-strategy.registry';
import { MilModule } from '../mil/mil.module';
import { PolicyModule } from '../policy/policy.module';
import { BookkeepingModule } from '../bookkeeping/bookkeeping.module';
import { AIProviderService } from '../ai-provider';

@Module({
  imports: [PrismaModule, ConfigModule, EmailModule, MilModule, PolicyModule, BookkeepingModule],
  controllers: [PaymentMethodsController, PaymentsController, StripeWebhookController],
  providers: [
    PaymentsService,
    PaymentMethodsService,
    AIPaymentService,
    AIPaymentMetricsService,
    StripeService,
    RentReminderService,
    PaymentStrategyRegistry,
    AIProviderService,    
  ],
  exports: [
    PaymentsService,
    PaymentMethodsService,
    AIPaymentService,
    AIPaymentMetricsService,
    StripeService,
    PaymentStrategyRegistry,
  ],
})
export class PaymentsModule { }
