import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class VendorsService {
  private readonly logger = new Logger(VendorsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(organizationId: string, data: any) {
    return this.prisma.vendor.create({
      data: {
        organizationId,
        name: data.name,
        taxId: data.taxId,
        type: data.type,
        email: data.email,
        phone: data.phone,
      }
    });
  }

  async findAll(organizationId: string) {
    return this.prisma.vendor.findMany({
      where: { organizationId },
      include: { compliances: true }
    });
  }

  async generate1099Export(organizationId: string) {
    // Collect all vendors and their payments for 1099-NEC tracking
    const vendors = await this.prisma.vendor.findMany({
      where: { organizationId, type: 'CONTRACTOR' }
    });
    
    // In a real scenario, this would aggregate BookkeepingTransactions or Payments
    // for each vendor and export as a CSV or integrate directly with Tax1099
    this.logger.log(`Generated 1099 export for org ${organizationId} with ${vendors.length} vendors`);
    
    return {
      status: 'EXPORT_GENERATED',
      url: 'https://example.com/exports/1099.csv',
      count: vendors.length
    };
  }
}
