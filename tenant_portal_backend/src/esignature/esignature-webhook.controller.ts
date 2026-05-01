import { Body, Controller, Headers, HttpCode, Post, Req, UsePipes, ValidationPipe } from '@nestjs/common';
import { Request } from 'express';
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
  async handleWebhook(
    @Body() dto: ProviderWebhookDto,
    @Headers('x-docusign-signature-1') signature: string | undefined,
    @Req() req: Request & { rawBody?: Buffer },
  ) {
    this.esignatureService.assertValidWebhookSignature(req.rawBody ?? Buffer.from(JSON.stringify(req.body ?? {})), signature);
    await this.esignatureService.handleProviderWebhook(dto);
    return { received: true };
  }
}
