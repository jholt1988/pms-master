import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DecisionsModule } from '../decisions/decisions.module';
import { AiGatewayController } from './ai-gateway.controller';
import { AiGatewayService } from './ai-gateway.service';

@Module({
  imports: [ConfigModule, DecisionsModule],
  controllers: [AiGatewayController],
  providers: [AiGatewayService],
  exports: [AiGatewayService],
})
export class AiGatewayModule {}
