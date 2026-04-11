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
import { EmailModule } from '../email/email.module';
import { OrgContextGuard } from '../common/org-context/org-context.guard';
import { PaymentStrategyRegistry } from './ai/payment-strategy.registry';
import { MilModule } from '../mil/mil.module';
import { PolicyModule } from '../policy/policy.module';

@Module({
  imports: [PrismaModule, ConfigModule, EmailModule, MilModule, PolicyModule],
  controllers: [PaymentMethodsController, PaymentsController],
  providers: [
    PaymentsService,
    PaymentMethodsService,
    AIPaymentService,
    AIPaymentMetricsService,
    StripeService,
    OrgContextGuard,
    PaymentStrategyRegistry,
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
