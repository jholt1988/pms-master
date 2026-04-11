import { Module } from '@nestjs/common';
import { MoveOrchestrationController } from './move-orchestration.controller';
import { MoveOrchestrationService } from './move-orchestration.service';
import { PrismaModule } from '../prisma/prisma.module';
import { SmartDevicesModule } from '../smart-devices/smart-devices.module';

@Module({
  imports: [PrismaModule, SmartDevicesModule],
  controllers: [MoveOrchestrationController],
  providers: [MoveOrchestrationService],
  exports: [MoveOrchestrationService],
})
export class MoveOrchestrationModule {}
