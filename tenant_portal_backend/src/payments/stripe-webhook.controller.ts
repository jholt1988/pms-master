import { Controller, Post, Req, Res, Headers, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import { StripeService } from './stripe.service';

@Controller('webhooks/stripe')
export class StripeWebhookController {
  private readonly logger = new Logger(StripeWebhookController.name);

  constructor(private readonly stripeService: StripeService) {}

  @Post()
  async handleWebhook(
    @Req() req: Request & { rawBody?: Buffer },
    @Res() res: Response,
    @Headers('stripe-signature') signature: string,
  ) {
    if (!signature) {
      this.logger.error('Missing Stripe signature header');
      return res.status(400).send('Missing Stripe signature');
    }

    const payload = req.rawBody ?? Buffer.from(JSON.stringify(req.body ?? {}));

    try {
      const result = await this.stripeService.handleWebhook(signature, payload);
      this.logger.log(`Webhook processed successfully (${result.eventId})`);
      return res.status(200).json({ ok: true, ...result });
    } catch (error) {
      this.logger.error('Webhook processing failed:', error);
      return res.status(400).send('Webhook processing failed');
    }
  }
}