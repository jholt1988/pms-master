import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
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
    // Default off. On is a stub: missing URL or key throws, and a live
    // sandbox call is not implemented. No vendor host is hardcoded.
    if (this.seamSandboxEnabled()) {
      this.requireSeamSandboxConfig();
      throw new ServiceUnavailableException(
        'SEAM_SANDBOX is enabled, but the sandbox client is not implemented. No lock API was called.',
      );
    }

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

  /** Explicit true/1/yes/on only. Unset and every other value stay off. */
  private seamSandboxEnabled(): boolean {
    const raw = (process.env.SEAM_SANDBOX ?? '').trim().toLowerCase();
    return raw === 'true' || raw === '1' || raw === 'yes' || raw === 'on';
  }

  /**
   * Flag-on path must not fall through to a vendor or a local write when
   * the sandbox URL or key is absent. Values are never logged.
   */
  private requireSeamSandboxConfig(): void {
    const missing: string[] = [];
    if (!(process.env.SEAM_API_URL ?? '').trim()) missing.push('SEAM_API_URL');
    if (!(process.env.SEAM_API_KEY ?? '').trim()) missing.push('SEAM_API_KEY');
    if (missing.length === 0) return;

    const label = missing.join(' and ');
    throw new ServiceUnavailableException(
      `SEAM_SANDBOX is enabled but ${label} is missing. Refusing to call a lock vendor or write an access code.`,
    );
  }

  async getAccessCodes(deviceId: string) {
    return this.prisma.accessCode.findMany({
      where: { deviceId },
    });
  }
}
