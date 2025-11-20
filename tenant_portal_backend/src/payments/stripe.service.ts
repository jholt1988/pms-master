import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import Stripe from 'stripe';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateStripeCustomerDto {
  email: string;
  name: string;
  userId: number;
}

export interface ProcessPaymentDto {
  amount: number; // in dollars
  currency?: string;
  customerId: string;
  paymentMethodId: string;
  description?: string;
  metadata?: Record<string, string>;
}

export interface SetupPaymentMethodDto {
  customerId: string;
  paymentMethodId: string;
}

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private readonly stripe: Stripe;

  constructor(private readonly prisma: PrismaService) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY environment variable is required');
    }

    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-10-29.clover',
      typescript: true,
    });

    this.logger.log('Stripe service initialized');
  }

  /**
   * Create a Stripe customer and save reference in database
   */
  async createCustomer(dto: CreateStripeCustomerDto): Promise<Stripe.Customer> {
    try {
      // Check if user already has a Stripe customer
      const existingUser = await this.prisma.user.findUnique({
        where: { id: dto.userId },
        select: { stripeCustomerId: true },
      });

      if (existingUser?.stripeCustomerId) {
        this.logger.warn(`User ${dto.userId} already has Stripe customer ${existingUser.stripeCustomerId}`);
        return await this.stripe.customers.retrieve(existingUser.stripeCustomerId) as Stripe.Customer;
      }

      // Create Stripe customer
      const customer = await this.stripe.customers.create({
        email: dto.email,
        name: dto.name,
        metadata: {
          userId: dto.userId.toString(),
        },
      });

      // Update user with Stripe customer ID
      await this.prisma.user.update({
        where: { id: dto.userId },
        data: { stripeCustomerId: customer.id },
      });

      this.logger.log(`Created Stripe customer ${customer.id} for user ${dto.userId}`);
      return customer;
    } catch (error) {
      this.logger.error(`Failed to create Stripe customer for user ${dto.userId}:`, error);
      throw new BadRequestException('Failed to create payment customer');
    }
  }

  /**
   * Save a payment method to a customer
   */
  async savePaymentMethod(dto: SetupPaymentMethodDto): Promise<Stripe.PaymentMethod> {
    try {
      const paymentMethod = await this.stripe.paymentMethods.attach(dto.paymentMethodId, {
        customer: dto.customerId,
      });

      this.logger.log(`Attached payment method ${dto.paymentMethodId} to customer ${dto.customerId}`);
      return paymentMethod;
    } catch (error) {
      this.logger.error(`Failed to attach payment method ${dto.paymentMethodId}:`, error);
      throw new BadRequestException('Failed to save payment method');
    }
  }

  /**
   * Process a payment
   */
  async processPayment(dto: ProcessPaymentDto): Promise<Stripe.PaymentIntent> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(dto.amount * 100), // Convert to cents
        currency: dto.currency || 'usd',
        customer: dto.customerId,
        payment_method: dto.paymentMethodId,
        description: dto.description,
        metadata: dto.metadata || {},
        confirm: true,
        automatic_payment_methods: {
          enabled: true,
          allow_redirects: 'never',
        },
      });

      this.logger.log(`Created payment intent ${paymentIntent.id} for $${dto.amount}`);
      return paymentIntent;
    } catch (error) {
      this.logger.error(`Payment failed for customer ${dto.customerId}:`, error);
      
      if (error instanceof Stripe.errors.StripeCardError) {
        throw new BadRequestException(`Payment failed: ${error.message}`);
      }
      
      throw new BadRequestException('Payment processing failed');
    }
  }

  /**
   * Create a setup intent for saving payment methods
   */
  async createSetupIntent(customerId: string): Promise<Stripe.SetupIntent> {
    try {
      const setupIntent = await this.stripe.setupIntents.create({
        customer: customerId,
        payment_method_types: ['card'],
        usage: 'off_session',
      });

      return setupIntent;
    } catch (error) {
      this.logger.error(`Failed to create setup intent for customer ${customerId}:`, error);
      throw new BadRequestException('Failed to setup payment method');
    }
  }

  /**
   * List customer's payment methods
   */
  async listPaymentMethods(customerId: string): Promise<Stripe.PaymentMethod[]> {
    try {
      const paymentMethods = await this.stripe.paymentMethods.list({
        customer: customerId,
        type: 'card',
      });

      return paymentMethods.data;
    } catch (error) {
      this.logger.error(`Failed to list payment methods for customer ${customerId}:`, error);
      throw new BadRequestException('Failed to retrieve payment methods');
    }
  }

  /**
   * Handle Stripe webhooks
   */
  async handleWebhook(signature: string, payload: Buffer): Promise<void> {
    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      throw new Error('STRIPE_WEBHOOK_SECRET environment variable is required');
    }

    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET,
      );
    } catch (error) {
      this.logger.error(`Webhook signature verification failed:`, error);
      throw new BadRequestException('Invalid webhook signature');
    }

    this.logger.log(`Received Stripe webhook: ${event.type}`);

    switch (event.type) {
      case 'payment_intent.succeeded':
        await this.handlePaymentSuccess(event.data.object as Stripe.PaymentIntent);
        break;
      case 'payment_intent.payment_failed':
        await this.handlePaymentFailure(event.data.object as Stripe.PaymentIntent);
        break;
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        // Handle subscription events if needed
        break;
      default:
        this.logger.log(`Unhandled webhook event type: ${event.type}`);
    }
  }

  private async handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    try {
      // Find the payment record and update it
      const payment = await this.prisma.payment.findFirst({
        where: { externalId: paymentIntent.id },
      });

      if (payment) {
        await this.prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: 'COMPLETED',
            paymentDate: new Date(),
          },
        });

        this.logger.log(`Updated payment ${payment.id} to COMPLETED`);
      } else {
        this.logger.warn(`No payment found for PaymentIntent ${paymentIntent.id}`);
      }
    } catch (error) {
      this.logger.error(`Failed to handle payment success for ${paymentIntent.id}:`, error);
    }
  }

  private async handlePaymentFailure(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    try {
      const payment = await this.prisma.payment.findFirst({
        where: { externalId: paymentIntent.id },
      });

      if (payment) {
        await this.prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: 'FAILED',
          },
        });

        this.logger.log(`Updated payment ${payment.id} to FAILED`);
      }
    } catch (error) {
      this.logger.error(`Failed to handle payment failure for ${paymentIntent.id}:`, error);
    }
  }

  /**
   * Get Stripe customer by user ID
   */
  async getCustomerByUserId(userId: number): Promise<string | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { stripeCustomerId: true },
    });

    return user?.stripeCustomerId || null;
  }

  /**
   * Refund a payment
   */
  async refundPayment(paymentIntentId: string, amount?: number): Promise<Stripe.Refund> {
    try {
      const refund = await this.stripe.refunds.create({
        payment_intent: paymentIntentId,
        amount: amount ? Math.round(amount * 100) : undefined, // Convert to cents if specified
      });

      this.logger.log(`Created refund ${refund.id} for payment ${paymentIntentId}`);
      return refund;
    } catch (error) {
      this.logger.error(`Failed to refund payment ${paymentIntentId}:`, error);
      throw new BadRequestException('Refund failed');
    }
  }
}