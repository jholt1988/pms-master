import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ProviderWebhookDto } from './dto/provider-webhook.dto';
import { EsignatureService } from './esignature.service';

@Controller('webhooks/esignature')
export class EsignatureWebhookController {
  constructor(private readonly esignatureService: EsignatureService) {}

  @Post()
  @HttpCode(200)
  async handleWebhook(@Body() dto: ProviderWebhookDto) {
    await this.esignatureService.handleProviderWebhook(dto);
    return { received: true };
  }
}
