import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class VendorPortalService {
  constructor(private readonly prisma: PrismaService) {}

  async getWorkOrders(vendorId: string) {
    return this.prisma.maintenanceRequest.findMany({ take: 50 });
  }

  async acceptWorkOrder(requestId: string, vendorId: string) {
    return { ok: true, requestId, vendorId };
  }

  async completeWorkOrder(requestId: string, note?: string) {
    return { ok: true, requestId, note };
  }
}
