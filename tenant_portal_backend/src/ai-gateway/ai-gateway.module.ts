import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { DecisionsModule } from '../decisions/decisions.module';
import { AiGatewayController } from './ai-gateway.controller';
import { AiGatewayService } from './ai-gateway.service';
import { AiExplainabilityInterceptor } from './ai-explainability.interceptor';

@Module({
  imports: [ConfigModule, DecisionsModule],
  controllers: [AiGatewayController],
  providers: [
    AiGatewayService,
    {
      provide: APP_INTERCEPTOR,
      useClass: AiExplainabilityInterceptor,
    },
  ],
  exports: [AiGatewayService],
})
export class AiGatewayModule {}
