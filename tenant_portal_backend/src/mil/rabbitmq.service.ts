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

  async publishIntent(routingKey: string, payload: any): Promise<void> {
    if (!this.channelWrapper) {
      this.logger.error(`RabbitMQ not initialized, cannot publish ${routingKey}`);
      throw new Error(`RabbitMQ not initialized — message lost: ${routingKey}`);
    }

    const maxRetries = 3;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        this.logger.log(`Publishing intent: ${routingKey} (attempt ${attempt})`);
        await this.channelWrapper.publish(this.EXCHANGE_NAME, routingKey, payload);
        return;
      } catch (error) {
        this.logger.error(
          `Failed to publish intent ${routingKey} (attempt ${attempt}/${maxRetries})`,
          error,
        );
        if (attempt === maxRetries) {
          throw error;
        }
        await new Promise((r) => setTimeout(r, 1000 * attempt));
      }
    }
  }
}
