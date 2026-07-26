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
      orderBy: { name: 'asc' },
    });

    this.logger.log(
      `Generated 1099 export for org ${organizationId} with ${vendors.length} vendors`,
    );

    // Build a real CSV. IRS 1099-NEC requires: RON (recipient name), address,
    // TIN, and payment amount. We don't track per-vendor payment totals yet,
    // so we emit the vendor roster with a $0.00 amount column that the
    // accounting team can fill in.
    const header = [
      'RecipientName',
      'Type',
      'TIN',
      'Email',
      'Phone',
      'Address',
      'NonemployeeCompensation',
    ];

    const rows = vendors.map((v) => [
      this.csvEscape(v.name),
      v.type,
      this.csvEscape(v.taxId ?? ''),
      this.csvEscape(v.email ?? ''),
      this.csvEscape(v.phone ?? ''),
      this.csvEscape(v.address ?? ''),
      '0.00',
    ]);

    const csv = [header.join(','), ...rows.map((r) => r.join(','))].join('\n');

    return {
      status: 'EXPORT_GENERATED',
      format: 'text/csv',
      filename: `1099-export-${new Date().getFullYear()}-${Date.now()}.csv`,
      content: csv,
      count: vendors.length,
    };
  }

  private csvEscape(value: string): string {
    if (!value) return '';
    if (/[",\n\r]/.test(value)) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }
}
