import { Controller, Get, Post, Body, Param, UseGuards, Query } from '@nestjs/common';
import { SmartDevicesService } from './smart-devices.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('smart-devices')
@UseGuards(AuthGuard('jwt'))
export class SmartDevicesController {
  constructor(private readonly smartDevicesService: SmartDevicesService) {}

  @Post()
  async registerDevice(@Body() body: any) {
    return this.smartDevicesService.registerDevice(body);
  }

  @Get()
  async getDevices(@Query('propertyId') propertyId: string, @Query('unitId') unitId?: string) {
    return this.smartDevicesService.getDevices(propertyId, unitId);
  }

  @Post(':deviceId/access-codes')
  async generateAccessCode(@Param('deviceId') deviceId: string, @Body() body: any) {
    return this.smartDevicesService.generateAccessCode({
      ...body,
      deviceId,
    });
  }

  @Get(':deviceId/access-codes')
  async getAccessCodes(@Param('deviceId') deviceId: string) {
    return this.smartDevicesService.getAccessCodes(deviceId);
  }
}
