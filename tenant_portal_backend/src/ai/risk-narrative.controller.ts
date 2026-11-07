import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RiskNarrativeService, RiskNarrativeInput } from './risk-narrative.service';

@Controller('ai/risk-narrative')
@UseGuards(AuthGuard('jwt'))
export class RiskNarrativeController {
  constructor(private readonly service: RiskNarrativeService) {}

  @Post()
  narrate(@Body() body: { tenantId: string } & RiskNarrativeInput) {
    const { tenantId, ...input } = body;
    return this.service.narrate(tenantId, input);
  }
}
