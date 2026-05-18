import { Controller, Headers, HttpCode, Logger, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { QuickBooksMinimalService } from './quickbooks-minimal.service';

@Controller('webhooks/quickbooks')
export class QuickBooksWebhookController {
  private readonly logger = new Logger(QuickBooksWebhookController.name);

  constructor(private readonly quickBooksService: QuickBooksMinimalService) {}

  @Post()
  @HttpCode(200)
  async handleWebhook(
    @Req() req: Request & { rawBody?: Buffer },
    @Headers('intuit-signature') signature: string | undefined,
  ) {
    const rawBody = req.rawBody ?? Buffer.from(JSON.stringify(req.body ?? {}));
    const result = await this.quickBooksService.handleWebhook(rawBody, signature, req.body);
    this.logger.log(`QuickBooks webhook processed (${result.eventKey})`);
    return { received: true, deduped: result.deduped };
  }
}

