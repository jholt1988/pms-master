import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentMethodDto } from './dto/create-payment-method.dto';

@Injectable()
export class PaymentMethodsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: number, dto: CreatePaymentMethodDto) {
    return this.prisma.paymentMethod.create({
      data: {
        user: { connect: { id: userId } },
        type: dto.type,
        provider: dto.provider,
        providerCustomerId: dto.providerCustomerId,
        providerPaymentMethodId: dto.providerPaymentMethodId,
        last4: dto.last4,
        brand: dto.brand,
        expMonth: dto.expMonth,
        expYear: dto.expYear,
      },
    });
  }

  async listForUser(userId: number) {
    return this.prisma.paymentMethod.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async remove(userId: number, id: number) {
    const method = await this.prisma.paymentMethod.findUnique({ where: { id } });
    if (!method || method.userId !== userId) {
      throw new NotFoundException('Payment method not found');
    }

    await this.prisma.paymentMethod.delete({ where: { id } });
    return { id, deleted: true };
  }
}
