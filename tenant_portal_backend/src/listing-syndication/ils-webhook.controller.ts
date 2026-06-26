import { Controller, Post, Body, Headers, Logger, HttpCode, UnauthorizedException } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../auth/public.decorator';

@Controller('webhooks/ils')
@Public()
export class IlsWebhookController {
  private readonly logger = new Logger(IlsWebhookController.name);

  @Post('leads')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 1000 } }) // Token Bucket limiting representation
  async handleLeadIngestion(
    @Body() payload: any,
    @Headers('authorization') authHeader: string,
  ) {
    // Boilerplate for ILS Lead Ingestion (e.g. Zillow, Apartments.com)
    if (!authHeader || authHeader !== `Bearer ${process.env.ILS_WEBHOOK_SECRET}`) {
      this.logger.warn('Unauthorized ILS webhook access attempt');
      throw new UnauthorizedException('Invalid API Key');
    }

    this.logger.log(`Received ILS connection payload: ${JSON.stringify(payload)}`);
    
    // Future: queue the lead into RabbitMQ instead of processing synchronously
    // this.eventsService.emit('ils.lead.received', payload);
    
    return { ok: true, status: 'received' };
  }
}
