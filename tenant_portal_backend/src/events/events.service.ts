import { Injectable, Inject, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(
    @Inject('RABBITMQ_CLIENT') private readonly client: ClientProxy,
  ) {}

  emitPaymentSuccess(paymentId: string | number, leaseId: string | number, amount: number) {
    this.logger.log(`Emitting Payment Success Event for ${paymentId}`);
    try {
      this.client.emit('payment.success', { paymentId, leaseId, amount, timestamp: new Date() });
    } catch (err) {
      this.logger.error(`Failed to emit event: ${err}`);
    }
  }

  emitPaymentFailure(paymentId: string | number, leaseId: string | number, error: string) {
    this.logger.error(`Emitting Payment Failure Event for ${paymentId}`);
    try {
      this.client.emit('payment.failure', { paymentId, leaseId, error, timestamp: new Date() });
    } catch (err) {
      this.logger.error(`Failed to emit event: ${err}`);
    }
  }
}
