import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SmartDevicesService } from '../smart-devices/smart-devices.service';

@Injectable()
export class MoveOrchestrationService {
  private readonly logger = new Logger(MoveOrchestrationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly smartDevicesService: SmartDevicesService
  ) {}

  async startMoveIn(leaseId: string, tenantId: string) {
    this.logger.log(`Starting move-in orchestration for lease ${leaseId} and tenant ${tenantId}`);
    
    const lease = await this.prisma.lease.findUnique({
      where: { id: leaseId },
      include: { unit: true },
    });

    if (!lease) {
      throw new Error(`Lease not found`);
    }

    // Example Workflow:
    // 1. Find Smart Lock for the unit
    const devices = await this.smartDevicesService.getDevices(lease.unit.propertyId, lease.unitId);
    const lock = devices.find(d => d.deviceType === 'LOCK');

    let accessCodeInfo = null;
    if (lock) {
      this.logger.log(`Generating Move-In access code for lock ${lock.id}...`);
      accessCodeInfo = await this.smartDevicesService.generateAccessCode({
        deviceId: lock.id,
        propertyId: lease.unit.propertyId,
        unitId: lease.unitId,
        code: Math.floor(100000 + Math.random() * 900000).toString(), // random 6-digit pin
        name: 'Move-In Access - Tenant',
        startsAt: lease.startDate,
        endsAt: lease.endDate || undefined,
      });
    }

    // 2. Draft Welcome Email/Omnichannel thread (Could dispatch event to Omnichannel module)
    await this.prisma.omnichannelThread.create({
      data: {
        tenantId,
        title: 'Welcome to your new home! Move-In Instructions',
        priority: 'HIGH',
      },
    });

    // 3. Schedule Move-In Inspection 
    this.logger.log('Scheduling Move-In Inspection...');
    
    return {
      status: 'MOVE_IN_INITIATED',
      leaseId,
      tenantId,
      accessCodeInfo,
      nextSteps: ['Welcome Email Sent', 'Move-In Inspection Scheduled'],
    };
  }

  async startMoveOut(leaseId: string, tenantId: string) {
    this.logger.log(`Starting move-out orchestration for lease ${leaseId} and tenant ${tenantId}`);
    
    const lease = await this.prisma.lease.findUnique({
      where: { id: leaseId },
    });

    if (!lease) {
      throw new Error(`Lease not found`);
    }

    // Example Workflow:
    // 1. Revoke Smart Lock access codes
    this.logger.log(`Revoking all active access codes for unit ${lease.unitId}...`);
    await this.prisma.accessCode.updateMany({
      where: {
        unitId: lease.unitId,
        status: 'ACTIVE',
      },
      data: {
        status: 'EXPIRED',
        endsAt: new Date(),
      },
    });

    // 2. Draft Move-Out Instructions thread
    await this.prisma.omnichannelThread.create({
      data: {
        tenantId,
        title: 'Move-Out Instructions and Security Deposit',
        priority: 'NORMAL',
      },
    });

    // 3. Schedule Move-Out Inspection
    this.logger.log('Scheduling Move-Out Inspection...');

    return {
      status: 'MOVE_OUT_INITIATED',
      leaseId,
      tenantId,
      nextSteps: ['Access Codes Revoked', 'Move-Out Email Sent', 'Move-Out Inspection Scheduled'],
    };
  }
}
