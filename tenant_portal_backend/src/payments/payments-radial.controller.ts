// Story 5: Detect Overdue Rent (Worker)
// Story 6: Send Late Payment Notice
// POST /payments/:id/send-notice
// Dependencies: Story 4 | Estimate: Small

import { Controller, Post, Param, Body, UseGuards, NotFoundException, BadRequestException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import { PrismaService } from '../../prisma/prisma.service';

interface SendNoticeDto {
  noticeType?: 'FIRST' | 'FINAL' | 'LEGAL';
  message?: string;
}

@Controller('payments')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class PaymentsRadialController {
  constructor(private readonly prisma: PrismaService) {}

  @Post(':id/send-notice')
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  async sendNotice(
    @Param('id') id: string,
    @Body() dto: SendNoticeDto,
  ) {
    const paymentId = parseInt(id, 10);

    // Find payment
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { tenant: true, lease: true },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    // Check if overdue
    const isOverdue = payment.paymentDate < new Date() && payment.status !== 'PAID';
    if (!isOverdue) {
      throw new BadRequestException('Payment is not overdue');
    }

    // Create notice
    const notice = await this.prisma.notice.create({
      data: {
        paymentId,
        noticeType: dto.noticeType || 'FIRST',
        message: dto.message || 'Payment is overdue. Please pay immediately.',
        sentAt: new Date(),
      },
    });

    // Resolve any overdue decision
    await this.prisma.decision.updateMany({
      where: {
        type: 'PAYMENT_OVERDUE',
        entityId: String(paymentId),
        resolved: false,
      },
      data: {
        resolved: true,
        resolvedAt: new Date(),
      },
    });

    console.log('[RADIAL] PaymentNoticeSent:', paymentId);

    return {
      id: notice.id,
      paymentId,
      noticeType: notice.noticeType,
      sentAt: notice.sentAt,
    };
  }
}

// Story 5: Overdue Detection Worker (cron)
@Controller('payments')
export class OverdueDetectionWorker {
  constructor(private readonly prisma: PrismaService) {}

  async detectOverduePayments() {
    const now = new Date();

    // Find unpaid overdue payments
    const overduePayments = await this.prisma.payment.findMany({
      where: {
        paymentDate: { lt: now },
        status: { not: 'PAID' },
      },
    });

    for (const payment of overduePayments) {
      // Check if decision already exists
      const existingDecision = await this.prisma.decision.findFirst({
        where: {
          type: 'PAYMENT_OVERDUE',
          entityId: String(payment.id),
          resolved: false,
        },
      });

      if (!existingDecision) {
        // Create decision
        await this.prisma.decision.create({
          data: {
            type: 'PAYMENT_OVERDUE',
            domain: 'payments',
            entityId: String(payment.id),
            title: `Tenant overdue - $${payment.amount}`,
            urgency: 'high',
            priority: 80,
            context: { paymentId: payment.id },
          },
        });

        console.log('[RADIAL] PaymentOverdueDecision:', payment.id);
      }
    }

    return { detected: overduePayments.length };
  }
}