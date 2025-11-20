import { Controller, Post, Req, Res, Headers, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import { StripeService } from './stripe.service';

@Controller('webhooks/stripe')
export class StripeWebhookController {
  private readonly logger = new Logger(StripeWebhookController.name);

  constructor(private readonly stripeService: StripeService) {}

  @Post()
  async handleWebhook(
    @Req() req: Request,
    @Res() res: Response,
    @Headers('stripe-signature') signature: string,
  ) {
    if (!signature) {
      this.logger.error('Missing Stripe signature header');
      return res.status(400).send('Missing Stripe signature');
    }

    try {
      await this.stripeService.handleWebhook(signature, req.body);
      this.logger.log('Webhook processed successfully');
      res.status(200).send('OK');
    } catch (error) {
      this.logger.error('Webhook processing failed:', error);
      res.status(400).send('Webhook processing failed');
    }
  }
}