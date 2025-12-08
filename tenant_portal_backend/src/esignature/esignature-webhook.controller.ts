import { Body, Controller, HttpCode, Post, UsePipes, ValidationPipe } from '@nestjs/common';
import { ProviderWebhookDto } from './dto/provider-webhook.dto';
import { EsignatureService } from './esignature.service';

@Controller('webhooks/esignature')
export class EsignatureWebhookController {
  constructor(private readonly esignatureService: EsignatureService) {}

  @Post()
  @HttpCode(200)
  @UsePipes(new ValidationPipe({
    whitelist: true, // Allow extra properties from DocuSign
    forbidNonWhitelisted: false, // Don't reject extra properties
    transform: true,
  }))
  async handleWebhook(@Body() dto: ProviderWebhookDto) {
    await this.esignatureService.handleProviderWebhook(dto);
    return { received: true };
  }
}
