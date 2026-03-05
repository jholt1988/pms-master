import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

interface QualityRate {
  count: number;
  rate: number;
}

export interface MaintenanceDataQualityReport {
  generatedAt: string;
  totals: {
    assets: number;
    requests: number;
    completedRequests: number;
    histories: number;
    notes: number;
    photos: number;
  };
  kpis: {
    assetsMissingInstallDate: QualityRate;
    completedRequestsMissingCompletedAt: QualityRate;
    completedAtBeforeCreatedAt: QualityRate;
    requestsMissingPropertyUnitLeaseLinkage: QualityRate;
    historyMissingActor: QualityRate;
  };
}

@Injectable()
export class MaintenanceDataQualityService {
  constructor(private readonly prisma: PrismaService) {}

  async getReport(): Promise<MaintenanceDataQualityReport> {
    const [
      assets,
      requests,
      completedRequests,
      histories,
      notes,
      photos,
      assetsMissingInstallDate,
      completedRequestsMissingCompletedAt,
      completedAtBeforeCreatedAt,
      requestsMissingPropertyUnitLeaseLinkage,
      historyMissingActor,
    ] = await Promise.all([
      this.prisma.maintenanceAsset.count(),
      this.prisma.maintenanceRequest.count(),
      this.prisma.maintenanceRequest.count({ where: { status: 'COMPLETED' } }),
      this.prisma.maintenanceRequestHistory.count(),
      this.prisma.maintenanceNote.count(),
      this.prisma.maintenancePhoto.count(),
      this.prisma.maintenanceAsset.count({ where: { installDate: null } }),
      this.prisma.maintenanceRequest.count({ where: { status: 'COMPLETED', completedAt: null } }),
      Promise.resolve(0),
      this.prisma.maintenanceRequest.count({
        where: {
          OR: [
            { propertyId: null },
            { unitId: null },
            { leaseId: null },
          ],
        },
      }),
      this.prisma.maintenanceRequestHistory.count({ where: { changedById: null } }),
    ]);

    const badCompletedChronology = await this.prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*)::bigint AS count
      FROM "MaintenanceRequest"
      WHERE "completedAt" IS NOT NULL
        AND "completedAt" < "createdAt"
    `;

    const chronologyCount = Number(badCompletedChronology?.[0]?.count ?? 0);

    return {
      generatedAt: new Date().toISOString(),
      totals: {
        assets,
        requests,
        completedRequests,
        histories,
        notes,
        photos,
      },
      kpis: {
        assetsMissingInstallDate: this.toRate(assetsMissingInstallDate, assets),
        completedRequestsMissingCompletedAt: this.toRate(completedRequestsMissingCompletedAt, completedRequests),
        completedAtBeforeCreatedAt: this.toRate(chronologyCount, requests),
        requestsMissingPropertyUnitLeaseLinkage: this.toRate(requestsMissingPropertyUnitLeaseLinkage, requests),
        historyMissingActor: this.toRate(historyMissingActor, histories),
      },
    };
  }

  private toRate(count: number, total: number): QualityRate {
    if (!total) {
      return { count, rate: 0 };
    }
    return {
      count,
      rate: Number((count / total).toFixed(4)),
    };
  }
}
