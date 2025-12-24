import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentMethodDto } from './dto/create-payment-method.dto';
import { StripeService } from './stripe.service';

@Injectable()
export class PaymentMethodsService {
  private readonly logger = new Logger(PaymentMethodsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripeService: StripeService,
  ) { }

  async create(userId: string, dto: CreatePaymentMethodDto) {
    // 1. Get or Create Stripe Customer
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    let stripeCustomerId = user.stripeCustomerId;

    if (!stripeCustomerId) {
      this.logger.log(`User ${userId} does not have a Stripe customer ID. Creating one...`);
      const customer = await this.stripeService.createCustomer({
        userId,
        email: user.email || `user${userId}@example.com`,
        name: `${user.firstName} ${user.lastName}`.trim() || user.username,
      });
      stripeCustomerId = customer.id;
    }

    // 2. Attach Payment Method to Stripe Customer (if it's a Stripe method)
    let cardDetails = {
      last4: dto.last4,
      brand: dto.brand,
      expMonth: dto.expMonth,
      expYear: dto.expYear,
    };

    if (dto.provider === 'STRIPE' && dto.providerPaymentMethodId) {
      try {
        const stripeMethod = await this.stripeService.savePaymentMethod({
          customerId: stripeCustomerId,
          paymentMethodId: dto.providerPaymentMethodId,
        });

        // 3. Extract verified details from Stripe response
        if (stripeMethod.card) {
          cardDetails = {
            last4: stripeMethod.card.last4,
            brand: stripeMethod.card.brand,
            expMonth: stripeMethod.card.exp_month,
            expYear: stripeMethod.card.exp_year,
          };
        }
      } catch (error) {
        this.logger.error(`Failed to attach Stripe payment method for user ${userId}`, error);
        throw new BadRequestException('Failed to process payment method with provider');
      }
    }

    // 4. Save to Database
    return this.prisma.paymentMethod.create({
      data: {
        user: { connect: { id: userId } },
        type: dto.type,
        provider: dto.provider,
        providerCustomerId: stripeCustomerId,
        providerPaymentMethodId: dto.providerPaymentMethodId,
        last4: cardDetails.last4,
        brand: cardDetails.brand,
        expMonth: cardDetails.expMonth,
        expYear: cardDetails.expYear,
      },
    });
  }

  async listForUser(userId: string) {
    return this.prisma.paymentMethod.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async remove(userId: string, id: number) {
    const method = await this.prisma.paymentMethod.findUnique({ where: { id } });
    if (!method || method.userId !== userId) {
      throw new NotFoundException('Payment method not found');
    }

    // Optional: Detach from Stripe if needed, but for now just deleting from DB reference
    // Ideally we should call stripe.paymentMethods.detach(method.providerPaymentMethodId)

    await this.prisma.paymentMethod.delete({ where: { id } });
    return { id, deleted: true };
  }
}
