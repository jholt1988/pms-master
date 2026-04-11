import { Injectable, Inject, Logger, Optional } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { PrometheusService } from '../metrics/prometheus.service';

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(
    @Inject('RABBITMQ_CLIENT') private readonly client: ClientProxy,
    @Optional() private readonly prometheus?: PrometheusService,
  ) {}

  private trackEvent(eventName: string, success: boolean) {
    if (!this.prometheus) return;
    this.prometheus.eventBusPublished.inc({ event_name: eventName });
    if (success) {
      this.prometheus.eventBusProcessed.inc({ event_name: eventName });
    } else {
      this.prometheus.eventBusErrors.inc({ event_name: eventName });
    }
  }

  emitPaymentSuccess(paymentId: string | number, leaseId: string | number, amount: number) {
    this.logger.log(`Emitting Payment Success Event for ${paymentId}`);
    try {
      this.client.emit('payment.success', { paymentId, leaseId, amount, timestamp: new Date() });
      this.trackEvent('payment.success', true);
    } catch (err) {
      this.logger.error(`Failed to emit event: ${err}`);
      this.trackEvent('payment.success', false);
    }
  }

  emitPaymentFailure(paymentId: string | number, leaseId: string | number, error: string) {
    this.logger.error(`Emitting Payment Failure Event for ${paymentId}`);
    try {
      this.client.emit('payment.failure', { paymentId, leaseId, error, timestamp: new Date() });
      this.trackEvent('payment.failure', true);
    } catch (err) {
      this.logger.error(`Failed to emit event: ${err}`);
      this.trackEvent('payment.failure', false);
    }
  }
}
