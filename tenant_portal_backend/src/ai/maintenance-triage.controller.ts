import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { MaintenanceTriageService } from './maintenance-triage.service';

@Controller('ai/maintenance-triage')
@UseGuards(AuthGuard('jwt'))
export class MaintenanceTriageController {
  constructor(private readonly service: MaintenanceTriageService) {}

  @Post()
  triage(@Body() body: { tenantId: string; description: string; propertyContext?: string }) {
    return this.service.triage(body.tenantId, body.description, body.propertyContext);
  }
}
