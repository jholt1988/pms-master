import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { DecisionsModule } from '../decisions/decisions.module';
import { AiGatewayController } from './ai-gateway.controller';
import { AiUsageController } from './ai-usage.controller';
import { AiGatewayService } from './ai-gateway.service';
import { AiExplainabilityInterceptor } from './ai-explainability.interceptor';
import { AIProviderService } from '../ai-provider';

@Module({
  imports: [ConfigModule, DecisionsModule],
  controllers: [AiGatewayController, AiUsageController],
  providers: [
    AiGatewayService,
    {
      provide: APP_INTERCEPTOR,
      useClass: AiExplainabilityInterceptor,
    },
    AIProviderService,  
  ],
  exports: [AiGatewayService],
})
export class AiGatewayModule {}
