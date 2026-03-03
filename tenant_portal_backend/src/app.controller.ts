
import { BadRequestException, Body, Controller, Get, Post } from '@nestjs/common';
import { AppService } from './app.service';
import { assertConfidenceV16Invariants, validateConfidenceV16 } from './property-os/v16-contract';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Post('property-os/v16/validate-confidence')
  validatePropertyOsV16Confidence(@Body() body: unknown) {
    try {
      const confidence = validateConfidenceV16(body);
      assertConfidenceV16Invariants(confidence);
      return { valid: true, confidence };
    } catch (error: any) {
      throw new BadRequestException({
        valid: false,
        message: error?.message ?? 'Invalid Property OS v1.6 confidence payload',
      });
    }
  }

  @Post('property-os/v16/validate-response')
  validatePropertyOsV16Response(@Body() body: any) {
    try {
      const confidence = validateConfidenceV16(body?.confidence);
      assertConfidenceV16Invariants(confidence);
      return {
        valid: true,
        model_version: body?.model_version,
        unit_id: body?.unit_id,
        cycle_id: body?.cycle_id,
        confidence,
      };
    } catch (error: any) {
      throw new BadRequestException({
        valid: false,
        message: error?.message ?? 'Invalid Property OS v1.6 response payload',
      });
    }
  }
}
