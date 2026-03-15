import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import Stripe from 'stripe';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

export interface CreateStripeCustomerDto {
  email: string;
  name: string;
  userId: string;
}

export interface ProcessPaymentDto {
  amount: number; // in dollars
  currency?: string;
  customerId: string;
  paymentMethodId: string;
  description?: string;
  metadata?: Record<string, string>;
  connectedAccountId?: string;
  applicationFeeAmountCents?: number;
}

export interface SetupPaymentMethodDto {
  customerId: string;
  paymentMethodId: string;
}

export interface CreateCheckoutSessionDto {
  amount: number;
  customerId: string;
  successUrl: string;
  cancelUrl: string;
  description?: string;
  metadata?: Record<string, string>;
}

export interface CreateConnectedAccountDto {
  organizationId: string;
  email?: string;
  country?: string;
  businessType?: 'individual' | 'company';
}

export interface ConnectedAccountStatus {
  accountId: string;
  onboardingStatus: 'NOT_STARTED' | 'PENDING' | 'IN_REVIEW' | 'COMPLETED' | 'RESTRICTED';
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  capabilities?: Record<string, unknown>;
}

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private readonly stripe?: Stripe;
  private isStripeDisabled =
    process.env.DISABLE_STRIPE === 'true' || process.env.NODE_ENV === 'test';

  constructor(private readonly prisma: PrismaService) {
    // In development we want the backend to boot even if Stripe isn’t configured yet.
    // Treat missing STRIPE_SECRET_KEY as "Stripe disabled" instead of a hard crash.
    if (!this.isStripeDisabled && !process.env.STRIPE_SECRET_KEY) {
      this.isStripeDisabled = true;
      this.logger.warn('STRIPE_SECRET_KEY not set; disabling Stripe integration for this run.');
    }

    if (!this.isStripeDisabled) {
      this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
        apiVersion: '2025-10-29.clover',
        typescript: true,
      });
      this.logger.log('Stripe service initialized');
    } else {
      this.logger.log('Stripe integration disabled; using mock implementations for tests.');
    }
  }

  /**
   * Create a Stripe customer and save reference in database
   */
  async createCustomer(dto: CreateStripeCustomerDto): Promise<Stripe.Customer> {
    const existingUser = await this.prisma.user.findUnique({
      where: { id: dto.userId },
      select: { stripeCustomerId: true },
    });

    if (this.isStripeDisabled) {
      const customerId = existingUser?.stripeCustomerId ?? this.createMockCustomerId(dto.userId);
      const customer = this.createMockCustomer(customerId, dto);
      if (!existingUser?.stripeCustomerId) {
        await this.prisma.user.update({
          where: { id: dto.userId },
          data: { stripeCustomerId: customer.id },
        });
      }
      return customer;
    }

    if (existingUser?.stripeCustomerId) {
      this.logger.warn(
        `User ${dto.userId} already has Stripe customer ${existingUser.stripeCustomerId}`,
      );
      return (await this.stripe!.customers.retrieve(existingUser.stripeCustomerId)) as Stripe.Customer;
    }

    const customer = await this.stripe!.customers.create({
      email: dto.email,
      name: dto.name,
      metadata: {
        userId: dto.userId.toString(),
      },
    });

    await this.prisma.user.update({
      where: { id: dto.userId },
      data: { stripeCustomerId: customer.id },
    });

    this.logger.log(`Created Stripe customer ${customer.id} for user ${dto.userId}`);
    return customer;
  }

  /**
   * Save a payment method to a customer
   */
  async savePaymentMethod(dto: SetupPaymentMethodDto): Promise<Stripe.PaymentMethod> {
    if (this.isStripeDisabled) {
      const id = dto.paymentMethodId ?? `mock_pm_${dto.customerId}`;
      return this.createMockPaymentMethod(id, dto.customerId);
    }

    try {
      const paymentMethod = await this.stripe!.paymentMethods.attach(dto.paymentMethodId, {
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
    if (this.isStripeDisabled) {
      return {
        id: `mock_pi_${dto.customerId}`,
        object: 'payment_intent',
        amount: Math.round(dto.amount * 100),
        currency: dto.currency || 'usd',
        customer: dto.customerId,
        payment_method: dto.paymentMethodId,
        status: 'succeeded',
        metadata: dto.metadata || {},
        description: dto.description,
        client_secret: 'mock_secret',
      } as Stripe.PaymentIntent;
    }

    try {
      const paymentIntent = await this.stripe!.paymentIntents.create({
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
        ...(dto.connectedAccountId
          ? {
              transfer_data: { destination: dto.connectedAccountId },
              ...(typeof dto.applicationFeeAmountCents === 'number'
                ? { application_fee_amount: dto.applicationFeeAmountCents }
                : {}),
            }
          : {}),
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

  async createCheckoutSession(dto: CreateCheckoutSessionDto): Promise<{ checkoutUrl: string; sessionId: string }> {
    const amountCents = Math.max(50, Math.round(dto.amount * 100));

    if (this.isStripeDisabled) {
      const sessionId = `mock_cs_${Date.now()}`;
      return {
        sessionId,
        checkoutUrl: `${dto.successUrl}${dto.successUrl.includes('?') ? '&' : '?'}mock_stripe_session=${sessionId}`,
      };
    }

    try {
      const session = await this.stripe!.checkout.sessions.create({
        mode: 'payment',
        customer: dto.customerId,
        success_url: dto.successUrl,
        cancel_url: dto.cancelUrl,
        client_reference_id: dto.metadata?.invoiceId,
        metadata: dto.metadata ?? {},
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: 'usd',
              unit_amount: amountCents,
              product_data: {
                name: dto.description ?? 'Invoice payment',
              },
            },
          },
        ],
      });

      if (!session.url) {
        throw new Error('Stripe checkout session did not return a URL');
      }

      return { checkoutUrl: session.url, sessionId: session.id };
    } catch (error) {
      this.logger.error('Failed to create checkout session', error as Error);
      throw new BadRequestException('Unable to start Stripe checkout session');
    }
  }

  /**
   * Create a setup intent for saving payment methods
   */
  async createSetupIntent(customerId: string): Promise<Stripe.SetupIntent> {
    if (this.isStripeDisabled) {
      return {
        id: `mock_setup_${customerId}`,
        object: 'setup_intent',
        status: 'requires_confirmation',
        usage: 'off_session',
        customer: customerId,
        payment_method_types: ['card'],
        client_secret: `seti_mock_${customerId}_secret`,
      } as Stripe.SetupIntent;
    }

    try {
      const setupIntent = await this.stripe!.setupIntents.create({
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
    if (this.isStripeDisabled) {
      return [];
    }

    try {
      const paymentMethods = await this.stripe!.paymentMethods.list({
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
  async handleWebhook(signature: string, payload: Buffer): Promise<{ eventId: string; deduped: boolean; organizationId?: string }> {
    if (this.isStripeDisabled) {
      // In disabled mode we can't verify signatures, but keep endpoint non-fatal.
      return { eventId: `mock_${Date.now()}`, deduped: false };
    }

    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      throw new Error('STRIPE_WEBHOOK_SECRET environment variable is required');
    }

    let event: Stripe.Event;

    try {
      event = this.stripe!.webhooks.constructEvent(
        payload,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET,
      );
    } catch (error) {
      this.logger.error(`Webhook signature verification failed:`, error);
      throw new BadRequestException('Invalid webhook signature');
    }

    const stripeAccountId = (event as any).account as string | undefined;
    const metadataOrgId = (event.data?.object as any)?.metadata?.organizationId as string | undefined;

    let organizationId: string | undefined;
    if (metadataOrgId) {
      organizationId = metadataOrgId;
    } else if (stripeAccountId) {
      const org = await this.prisma.organization.findFirst({
        where: { stripeConnectedAccountId: stripeAccountId },
        select: { id: true },
      });
      organizationId = org?.id;
    }

    // Atomic idempotency guard: reserve event ID before side effects.
    try {
      await this.prisma.stripeWebhookEvent.create({
        data: {
          eventId: event.id,
          eventType: event.type,
          stripeAccountId,
          organizationId,
          payload: event as any,
        },
      });
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        const existing = await this.prisma.stripeWebhookEvent.findUnique({
          where: { eventId: event.id },
          select: { organizationId: true },
        });
        this.logger.log(`Ignoring duplicate Stripe event ${event.id}`);
        return { eventId: event.id, deduped: true, organizationId: existing?.organizationId ?? undefined };
      }
      throw error;
    }

    this.logger.log(`Received Stripe webhook: ${event.type}`);

    switch (event.type) {
      case 'payment_intent.succeeded':
        await this.handlePaymentSuccess(event.data.object as Stripe.PaymentIntent, event.id);
        break;
      case 'payment_intent.payment_failed':
        await this.handlePaymentFailure(event.data.object as Stripe.PaymentIntent);
        break;
      case 'account.updated': {
        const account = event.data.object as Stripe.Account;
        const org = await this.prisma.organization.findFirst({
          where: { stripeConnectedAccountId: account.id },
          select: { id: true },
        });
        if (org) {
          organizationId = org.id;
          await this.prisma.organization.update({
            where: { id: org.id },
            data: {
              stripeOnboardingStatus:
                account.charges_enabled && account.payouts_enabled
                  ? 'COMPLETED'
                  : account.details_submitted
                  ? 'PENDING'
                  : 'NOT_STARTED',
              stripeChargesEnabled: Boolean(account.charges_enabled),
              stripePayoutsEnabled: Boolean(account.payouts_enabled),
              stripeDetailsSubmitted: Boolean(account.details_submitted),
              stripeCapabilities: (account.capabilities as any) ?? undefined,
              stripeLastOnboardingCheckAt: new Date(),
            },
          });
        }
        break;
      }
      default:
        this.logger.log(`Unhandled webhook event type: ${event.type}`);
    }

    return { eventId: event.id, deduped: false, organizationId };
  }

  private async handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent, sourceEventId: string): Promise<void> {
    try {
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

        const metadata = (paymentIntent.metadata ?? {}) as Record<string, string>;
        const organizationId = metadata.organizationId || undefined;
        const leaseId = metadata.leaseId || undefined;
        const platformFeeMinor =
          typeof paymentIntent.application_fee_amount === 'number'
            ? paymentIntent.application_fee_amount
            : Number(metadata.platform_fee_minor ?? 0) || 0;
        const grossAmountMinor = Number(paymentIntent.amount ?? Math.round(Number(payment.amount) * 100));
        const netAmountMinor = Math.max(0, grossAmountMinor - platformFeeMinor);

        let tierSnapshot: Record<string, unknown> | undefined;
        try {
          tierSnapshot = metadata.tier_snapshot ? JSON.parse(metadata.tier_snapshot) : undefined;
        } catch {
          tierSnapshot = undefined;
        }

        try {
          await this.prisma.paymentLedgerEntry.create({
            data: {
              paymentId: payment.id,
              organizationId,
              leaseId,
              sourceEventId,
              currency: paymentIntent.currency ?? 'usd',
              grossAmountMinor,
              platformFeeMinor,
              netAmountMinor,
              tierSnapshot: tierSnapshot as any,
            },
          });
        } catch (error) {
          if (!this.isUniqueConstraintError(error)) {
            throw error;
          }
        }

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

  async createConnectedAccount(dto: CreateConnectedAccountDto): Promise<{ accountId: string }> {
    if (this.isStripeDisabled) {
      return { accountId: `mock_acct_${dto.organizationId.slice(0, 8)}` };
    }

    const account = await this.stripe!.accounts.create({
      type: 'express',
      country: dto.country ?? 'US',
      email: dto.email,
      business_type: dto.businessType ?? 'company',
      metadata: {
        organizationId: dto.organizationId,
      },
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    });

    return { accountId: account.id };
  }

  async createConnectedAccountOnboardingLink(params: {
    accountId: string;
    refreshUrl: string;
    returnUrl: string;
  }): Promise<{ url: string; expiresAt?: number }> {
    if (this.isStripeDisabled) {
      return {
        url: `${params.returnUrl}?mock_onboarding=1&account=${params.accountId}`,
      };
    }

    const link = await this.stripe!.accountLinks.create({
      account: params.accountId,
      refresh_url: params.refreshUrl,
      return_url: params.returnUrl,
      type: 'account_onboarding',
    });

    return { url: link.url, expiresAt: link.expires_at };
  }

  async getConnectedAccountStatus(accountId: string): Promise<ConnectedAccountStatus> {
    if (this.isStripeDisabled) {
      return {
        accountId,
        onboardingStatus: 'PENDING',
        chargesEnabled: false,
        payoutsEnabled: false,
        detailsSubmitted: false,
        capabilities: { card_payments: 'inactive', transfers: 'inactive' },
      };
    }

    const account = await this.stripe!.accounts.retrieve(accountId);
    const requirements = (account as any).requirements;
    const disabledReason = requirements?.disabled_reason as string | undefined;

    let onboardingStatus: ConnectedAccountStatus['onboardingStatus'] = 'NOT_STARTED';
    if (account.details_submitted) onboardingStatus = 'PENDING';
    if (disabledReason?.includes('under_review')) onboardingStatus = 'IN_REVIEW';
    if (account.charges_enabled && account.payouts_enabled) onboardingStatus = 'COMPLETED';
    if (disabledReason) onboardingStatus = 'RESTRICTED';

    return {
      accountId: account.id,
      onboardingStatus,
      chargesEnabled: Boolean(account.charges_enabled),
      payoutsEnabled: Boolean(account.payouts_enabled),
      detailsSubmitted: Boolean(account.details_submitted),
      capabilities: account.capabilities as Record<string, unknown>,
    };
  }

  /**
   * Get Stripe customer by user ID
   */
  async getCustomerByUserId(userId: string): Promise<string | null> {
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
    if (this.isStripeDisabled) {
      return {
        id: `mock_refund_${paymentIntentId}`,
        object: 'refund',
        amount: amount ? Math.round(amount * 100) : undefined,
        currency: 'usd',
        payment_intent: paymentIntentId,
        status: 'succeeded',
      } as Stripe.Refund;
    }

    try {
      const refund = await this.stripe!.refunds.create({
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

  private createMockCustomerId(userId: string) {
    return `mock_cus_${userId}`;
  }

  private createMockCustomer(customerId: string, dto: CreateStripeCustomerDto): Stripe.Customer {
    return {
      id: customerId,
      object: 'customer',
      email: dto.email,
      name: dto.name,
      metadata: {
        userId: dto.userId.toString(),
      },
      created: Math.floor(Date.now() / 1000),
      livemode: false,
      balance: 0,
      currency: 'usd',
      default_source: null,
      invoice_prefix: 'TEST',
      invoice_settings: { default_payment_method: null },
      description: `Mock customer for user ${dto.userId}`,
      address: null,
      phone: null,
      shipping: null,
      preferred_locales: [],
      delinquent: false,
      default_payment_method: null,
      sources: { object: 'list', data: [], has_more: false, total_count: 0, url: '' } as any,
      tax_ids: { object: 'list', data: [], has_more: false, total_count: 0, url: '' } as any,
      subscriptions: { object: 'list', data: [], has_more: false, total_count: 0, url: '' } as any,
    } as unknown as Stripe.Customer;
  }

  private createMockPaymentMethod(id: string, customerId: string): Stripe.PaymentMethod {
    return {
      id,
      object: 'payment_method',
      customer: customerId,
      type: 'card',
      card: {
        brand: 'Visa',
        last4: '4242',
        exp_month: 12,
        exp_year: 2030,
      },
    } as Stripe.PaymentMethod;
  }

  private isUniqueConstraintError(error: unknown): boolean {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return error.code === 'P2002';
    }

    return Boolean(
      error &&
        typeof error === 'object' &&
        'code' in error &&
        (error as { code?: unknown }).code === 'P2002',
    );
  }
}
