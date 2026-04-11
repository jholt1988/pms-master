import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SmartDevicesService {
  private readonly logger = new Logger(SmartDevicesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async registerDevice(data: {
    propertyId: string;
    unitId?: string;
    provider: string;
    deviceType: string;
    providerId: string;
    name: string;
  }) {
    return this.prisma.smartDevice.create({
      data,
    });
  }

  async getDevices(propertyId: string, unitId?: string) {
    return this.prisma.smartDevice.findMany({
      where: {
        propertyId,
        unitId: unitId || undefined,
      },
    });
  }

  async generateAccessCode(data: {
    deviceId: string;
    propertyId: string;
    unitId?: string;
    code: string;
    name: string;
    startsAt?: Date;
    endsAt?: Date;
  }) {
    this.logger.log(`Generating access code for device ${data.deviceId} via provider API...`);
    // Simulated API call to provider (e.g. SmartRent / Brivo)
    
    return this.prisma.accessCode.create({
      data: {
        deviceId: data.deviceId,
        propertyId: data.propertyId,
        unitId: data.unitId,
        code: data.code,
        name: data.name,
        startsAt: data.startsAt,
        endsAt: data.endsAt,
        status: 'ACTIVE',
      },
    });
  }

  async getAccessCodes(deviceId: string) {
    return this.prisma.accessCode.findMany({
      where: { deviceId },
    });
  }
}
