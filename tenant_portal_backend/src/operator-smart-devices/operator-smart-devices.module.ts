import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SmartDevicesModule } from '../smart-devices/smart-devices.module';
import { OperatorSmartDevicesController } from './operator-smart-devices.controller';
import { OperatorSmartDevicesService } from './operator-smart-devices.service';

@Module({
  imports: [PrismaModule, SmartDevicesModule],
  controllers: [OperatorSmartDevicesController],
  providers: [OperatorSmartDevicesService],
  exports: [OperatorSmartDevicesService],
})
export class OperatorSmartDevicesModule {}
