import { BadRequestException, Controller, Headers, HttpCode, Logger, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { Public } from '../auth/public.decorator';
import { QuickBooksMinimalService } from './quickbooks-minimal.service';

@Controller('webhooks/quickbooks')
@Public()
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
    try {
      const result = await this.quickBooksService.handleWebhook(rawBody, signature, req.body);
      this.logger.log(`QuickBooks webhook processed (${result.eventKey})`);
      return { received: true, deduped: result.deduped };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (/signature|verifier|missing intuit-signature/i.test(message)) {
        throw new BadRequestException('Invalid QuickBooks webhook signature');
      }
      throw error;
    }
  }
}
