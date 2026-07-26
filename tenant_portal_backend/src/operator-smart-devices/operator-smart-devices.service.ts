import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OperatorSmartDevicesService {
  constructor(private readonly prisma: PrismaService) {}

  async getWorkbench(orgId: string, propertyId?: string, unitId?: string) {
    const where: any = {
      property: { organizationId: orgId },
      ...(propertyId ? { propertyId } : {}),
      ...(unitId ? { unitId } : {}),
    };

    const [devices, accessCodes] = await Promise.all([
      this.prisma.smartDevice.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.accessCode.findMany({
        where: {
          property: { organizationId: orgId },
          ...(propertyId ? { propertyId } : {}),
          ...(unitId ? { unitId } : {}),
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const activeCodes = accessCodes.filter((c) => c.status === 'ACTIVE').length;

    return {
      generatedAt: new Date().toISOString(),
      metrics: {
        totalDevices: devices.length,
        totalAccessCodes: accessCodes.length,
        activeAccessCodes: activeCodes,
      },
      devices: devices.map((device) => ({
        ...device,
        accessCodeCount: accessCodes.filter((c) => c.deviceId === device.id).length,
      })),
    };
  }

  async registerDevice(orgId: string, body: any) {
    const property = await this.prisma.property.findFirst({
      where: { id: body.propertyId, organizationId: orgId },
    });
    if (!property) throw new NotFoundException('Property not found in your organization');

    return this.prisma.smartDevice.create({
      data: {
        propertyId: body.propertyId,
        unitId: body.unitId,
        provider: body.provider,
        deviceType: body.deviceType,
        providerId: body.providerId,
        name: body.name,
      },
    });
  }

  async createAccessCode(orgId: string, deviceId: string, body: any) {
    const device = await this.prisma.smartDevice.findFirst({
      where: { id: deviceId, property: { organizationId: orgId } },
    });
    if (!device) throw new NotFoundException('Device not found in your organization');

    return this.prisma.accessCode.create({
      data: {
        deviceId,
        propertyId: body.propertyId,
        unitId: body.unitId,
        code: body.code,
        name: body.name,
        startsAt: body.startsAt ? new Date(body.startsAt) : undefined,
        endsAt: body.endsAt ? new Date(body.endsAt) : undefined,
        status: 'ACTIVE',
      },
    });
  }

  async getAccessCodes(deviceId: string, orgId: string) {
    const device = await this.prisma.smartDevice.findFirst({
      where: { id: deviceId, property: { organizationId: orgId } },
    });
    if (!device) throw new NotFoundException('Device not found in your organization');

    return this.prisma.accessCode.findMany({
      where: { deviceId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
