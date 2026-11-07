import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ModelGatewayService } from './model-gateway.service';
import { MaintenanceTriageService } from './maintenance-triage.service';
import { MaintenanceTriageController } from './maintenance-triage.controller';
import { RiskNarrativeService } from './risk-narrative.service';
import { RiskNarrativeController } from './risk-narrative.controller';

@Module({
  imports: [ConfigModule],
  providers: [ModelGatewayService, MaintenanceTriageService, RiskNarrativeService],
  controllers: [MaintenanceTriageController, RiskNarrativeController],
  exports: [ModelGatewayService, MaintenanceTriageService, RiskNarrativeService],
})
export class AiModule {}
