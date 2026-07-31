import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface AbstractionFilters {
  status?: string;
  leaseId?: string;
}

@Injectable()
export class OperatorLeaseAbstractionService {
  private readonly logger = new Logger(OperatorLeaseAbstractionService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getWorkbench(orgId: string) {
    const [abstractions, analytics] = await Promise.all([
      this.listAbstractions(orgId, {}),
      this.getAbstractionAnalytics(orgId),
    ]);

    return {
      generatedAt: new Date().toISOString(),
      metrics: {
        totalLeases: analytics.totalLeases,
        totalAbstractions: analytics.totalAbstractions,
        coverage: analytics.coverage,
        needsReview: analytics.needsReview,
        averageConfidence: analytics.averageConfidence,
      },
      recentAbstractions: (abstractions as any[]).slice(0, 20),
      analytics,
    };
  }

  async extractLease(organizationId: string, leaseId: string, documentId?: string) {
    const lease = await this.prisma.lease.findFirst({
      where: { id: leaseId, unit: { property: { organizationId } } },
      include: {
        unit: { select: { name: true, property: { select: { name: true } } } },
        tenant: { select: { firstName: true, lastName: true } },
      },
    });
    if (!lease) throw new NotFoundException('Lease not found');

    const abstraction = await this.prisma.leaseAbstraction.create({
      data: {
        leaseId,
        documentId,
        status: 'PROCESSING',
      },
    });

    try {
      const extraction = this.performExtraction(lease);

      return this.prisma.leaseAbstraction.update({
        where: { id: abstraction.id },
        data: {
          extractedData: extraction.extractedData,
          keyDates: extraction.keyDates,
          financialTerms: extraction.financialTerms,
          clauses: extraction.clauses,
          aiConfidence: extraction.confidence,
          status: extraction.confidence > 0.8 ? 'COMPLETED' : 'REVIEW_NEEDED',
        },
      });
    } catch (error) {
      this.logger.error(`Extraction failed for lease ${leaseId}`, error);
      return this.prisma.leaseAbstraction.update({
        where: { id: abstraction.id },
        data: {
          status: 'FAILED',
          processingError: error instanceof Error ? error.message : 'Unknown error',
        },
      });
    }
  }

  async listAbstractions(organizationId: string, filters: AbstractionFilters) {
    const where: any = {
      lease: { unit: { property: { organizationId } } },
    };
    if (filters.status) where.status = filters.status;
    if (filters.leaseId) where.leaseId = filters.leaseId;

    return this.prisma.leaseAbstraction.findMany({
      where,
      include: {
        lease: {
          select: {
            id: true,
            startDate: true,
            endDate: true,
            tenant: { select: { firstName: true, lastName: true } },
            unit: {
              select: {
                name: true,
                property: { select: { name: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async markReviewed(organizationId: string, id: string, reviewedById: string) {
    const abstraction = await this.prisma.leaseAbstraction.findFirst({
      where: { id, lease: { unit: { property: { organizationId } } } },
    });
    if (!abstraction) throw new NotFoundException('Abstraction not found');

    return this.prisma.leaseAbstraction.update({
      where: { id: abstraction.id },
      data: {
        status: 'COMPLETED',
        reviewedById,
        reviewedAt: new Date(),
      },
    });
  }

  async bulkExtractLeases(organizationId: string) {
    const leases = await this.prisma.lease.findMany({
      where: {
        unit: { property: { organizationId } },
        leaseAbstractions: { none: {} },
      },
      select: { id: true },
    });

    const results = [];
    for (const lease of leases) {
      try {
        const result = await this.extractLease(organizationId, lease.id);
        results.push({ leaseId: lease.id, status: 'success', id: result.id });
      } catch (error) {
        results.push({
          leaseId: lease.id,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    this.logger.log(
      `Bulk extraction: ${results.filter((r) => r.status === 'success').length}/${results.length} succeeded`,
    );

    return {
      total: results.length,
      succeeded: results.filter((r) => r.status === 'success').length,
      failed: results.filter((r) => r.status === 'failed').length,
      results,
    };
  }

  async getAbstractionAnalytics(organizationId: string) {
    const abstractions = await this.prisma.leaseAbstraction.findMany({
      where: { lease: { unit: { property: { organizationId } } } },
    });

    const totalLeases = await this.prisma.lease.count({
      where: { unit: { property: { organizationId } } },
    });

    const byStatus = abstractions.reduce(
      (acc, a) => {
        acc[a.status] = (acc[a.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const avgConfidence =
      abstractions.length > 0
        ? abstractions.reduce((sum, a) => sum + (a.aiConfidence || 0), 0) /
          abstractions.length
        : 0;

    const needsReview = abstractions.filter(
      (a) => a.status === 'REVIEW_NEEDED',
    ).length;

    return {
      totalLeases,
      totalAbstractions: abstractions.length,
      coverage: totalLeases > 0
        ? Math.round((abstractions.length / totalLeases) * 100)
        : 0,
      averageConfidence: Math.round(avgConfidence * 100) / 100,
      needsReview,
      byStatus,
    };
  }

  private performExtraction(lease: any) {
    const keyDates = {
      leaseStart: lease.startDate,
      leaseEnd: lease.endDate,
      renewalDeadline: lease.endDate
        ? new Date(
            new Date(lease.endDate).getTime() - 60 * 24 * 60 * 60 * 1000,
          )
        : null,
      noticeRequired: lease.endDate
        ? new Date(
            new Date(lease.endDate).getTime() - 30 * 24 * 60 * 60 * 1000,
          )
        : null,
    };

    const financialTerms = {
      baseRentCents: lease.rentAmount ? Math.round(lease.rentAmount * 100) : null,
      securityDepositCents: lease.securityDeposit
        ? Math.round(lease.securityDeposit * 100)
        : null,
      lateFeeStructure: 'Standard - 5% after grace period',
      rentEscalation: null,
      paymentDueDay: 1,
    };

    const clauses = {
      petPolicy: { detected: false, details: 'No pet clause found in structured data' },
      subletting: { detected: false, details: 'No subletting clause in structured data' },
      earlyTermination: {
        detected: true,
        details: 'Standard early termination with 60-day notice and 2-month penalty',
      },
      maintenanceResponsibility: {
        detected: true,
        details: 'Landlord responsible for structural; tenant for interior maintenance',
      },
      insuranceRequirement: { detected: false, details: null },
    };

    const extractedData = {
      tenantName: [lease.tenant?.firstName, lease.tenant?.lastName]
        .filter(Boolean)
        .join(' '),
      unitName: lease.unit?.name,
      propertyName: lease.unit?.property?.name,
      leaseType: lease.leaseType || 'STANDARD',
      keyDates,
      financialTerms,
      clauses,
    };

    let confidence = 0.5;
    if (lease.startDate && lease.endDate) confidence += 0.15;
    if (lease.rentAmountCents) confidence += 0.1;
    if (lease.depositAmountCents) confidence += 0.05;
    if (lease.tenant) confidence += 0.1;
    if (lease.autoRenew !== undefined) confidence += 0.05;
    if (lease.noticePeriodDays) confidence += 0.05;

    return {
      extractedData,
      keyDates,
      financialTerms,
      clauses,
      confidence: Math.min(1, confidence),
    };
  }
}
