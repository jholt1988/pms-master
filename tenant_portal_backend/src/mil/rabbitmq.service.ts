import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqp-connection-manager';
import { ConfirmChannel } from 'amqplib';

@Injectable()
export class RabbitMQService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitMQService.name);
  private connection: amqp.AmqpConnectionManager;
  private channelWrapper: amqp.ChannelWrapper;
  public readonly EXCHANGE_NAME = 'property_os_events';

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const url = this.configService.get<string>('RABBITMQ_URL', 'amqp://localhost');
    this.connection = amqp.connect([url]);

    this.connection.on('connect', () => {
      this.logger.log('Connected to RabbitMQ!');
    });

    this.connection.on('disconnect', (err) => {
      this.logger.log('Disconnected from RabbitMQ.', err);
    });

    this.channelWrapper = this.connection.createChannel({
      json: true,
      setup: (channel: ConfirmChannel) => {
        // Assert a topic exchange for broad event fan-out across microservices
        return channel.assertExchange(this.EXCHANGE_NAME, 'topic', { durable: true });
      },
    });
  }

  async onModuleDestroy() {
    await this.channelWrapper?.close();
    await this.connection?.close();
  }

  /**
   * Publishes an intent or event to the property_os_events exchange
   * @param routingKey E.g., 'ledger.updated', 'payment.initiated'
   * @param payload The JSON serializable event data
   */
  async publishIntent(routingKey: string, payload: any): Promise<void> {
    try {
      if (!this.channelWrapper) {
        this.logger.warn(`RabbitMQ not initialized, skipping publish for ${routingKey}`);
        return;
      }
      
      this.logger.log(`Publishing intent: ${routingKey}`);
      await this.channelWrapper.publish(this.EXCHANGE_NAME, routingKey, payload, {
        persistent: true,
      });
    } catch (error) {
      this.logger.error(`Failed to publish intent ${routingKey}`, error);
    }
  }
}
