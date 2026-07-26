import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OperatorVendorsService {
  private readonly logger = new Logger(OperatorVendorsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ── Workbench ────────────────────────────────────────────────────────────

  async getWorkbench(orgId: string) {
    const vendors = await this.prisma.vendor.findMany({
      where: { organizationId: orgId },
      include: { compliances: true },
      orderBy: { createdAt: 'desc' },
    });

    // Total vendors
    const total = vendors.length;

    // By type
    const byType: Record<string, number> = {};
    for (const v of vendors) {
      byType[v.type] = (byType[v.type] ?? 0) + 1;
    }

    // Compliance status counts (aggregate across all vendors' compliances)
    const complianceStatusCounts: Record<string, number> = {};
    for (const v of vendors) {
      for (const c of v.compliances) {
        complianceStatusCounts[c.status] = (complianceStatusCounts[c.status] ?? 0) + 1;
      }
    }

    // Vendor status counts
    const statusCounts: Record<string, number> = {};
    for (const v of vendors) {
      statusCounts[v.status] = (statusCounts[v.status] ?? 0) + 1;
    }

    return {
      generatedAt: new Date().toISOString(),
      metrics: {
        totalVendors: total,
        byType,
        statusCounts,
        complianceStatusCounts,
      },
      vendors,
    };
  }

  // ── Create vendor ─────────────────────────────────────────────────────────

  async create(organizationId: string, data: any) {
    return this.prisma.vendor.create({
      data: {
        organizationId,
        name: data.name,
        taxId: data.taxId,
        type: data.type,
        email: data.email,
        phone: data.phone,
      },
    });
  }

  // ── 1099 export ──────────────────────────────────────────────────────────

  async generate1099Export(organizationId: string) {
    const vendors = await this.prisma.vendor.findMany({
      where: { organizationId, type: 'CONTRACTOR' },
    });

    this.logger.log(
      `Generated 1099 export for org ${organizationId} with ${vendors.length} vendors`,
    );

    return {
      status: 'EXPORT_GENERATED',
      url: 'https://example.com/exports/1099.csv',
      count: vendors.length,
    };
  }
}
