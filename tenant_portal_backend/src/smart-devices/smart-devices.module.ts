import { Module } from '@nestjs/common';
import { SmartDevicesController } from './smart-devices.controller';
import { SmartDevicesService } from './smart-devices.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SmartDevicesController],
  providers: [SmartDevicesService],
  exports: [SmartDevicesService],
})
export class SmartDevicesModule {}
