// src/feed/dev.controller.ts
import { Controller, Post, Body } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Controller('api/dev/seed')
export class DevSeedController {
  constructor(private eventEmitter: EventEmitter2) {}

  @Post('payment-delinquent')
  async seedDelinquentPayment(@Body() body: any) {
    const payload = {
      paymentId: body.paymentId || 'test-payment-uuid-1234',
      tenantId: body.tenantId || 'test-tenant-uuid-5678',
      amount: body.amount || 1500.00,
      daysOverdue: body.daysOverdue || 5,
      confidence: 0.95 // High confidence for ledger data
    };

    // Fire the event exactly as the real PMRE service would
    this.eventEmitter.emit('payment.delinquent', payload);

    return { 
      success: true, 
      message: 'Event emitted. Check PostgreSQL FeedItem table.',
      payload 
    };
  }
}