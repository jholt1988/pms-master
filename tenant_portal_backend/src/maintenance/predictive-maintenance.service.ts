import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { MaintenanceRiskLevel } from '@prisma/client';
import axios from 'axios';

/** Minimal shape used by the pure aggregation helper (also matches Prisma rows). */
interface RiskSnapshotLike {
  assetId: number;
  riskLevel: string;
  category: string;
  drivers?: unknown;
}

@Injectable()
export class PredictiveMaintenanceService {
  private readonly logger = new Logger(PredictiveMaintenanceService.name);
  private readonly ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://ml-service:3010';

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Run daily scanning cron job at 3:00 AM to calculate assets health and failure predictions
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async handleDailyAssetScan() {
    this.logger.log('Starting daily predictive maintenance asset scan...');
    await this.scanAssetsAndPredict();
  }

  async scanAssetsAndPredict(orgId?: string) {
    const assets = await this.prisma.maintenanceAsset.findMany({
      where: orgId ? { property: { organizationId: orgId } } : undefined,
      include: {
        property: true,
        unit: true,
      },
    });

    this.logger.log(`Scanning ${assets.length} assets for predictive maintenance alerts...`);
    const alertsGenerated = [];
    let snapshotsCreated = 0;

    for (const asset of assets) {
      try {
        // Compute age in years (default to 3 years if installDate is missing)
        const installDate = asset.installDate ? new Date(asset.installDate) : new Date();
        if (!asset.installDate) {
          installDate.setFullYear(installDate.getFullYear() - 3); // assume 3 years old
        }
        const ageYears = Math.max(0.1, (Date.now() - installDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25));

        // Count minor repairs from database requests for this asset
        const minorRepairsCount = await this.prisma.maintenanceRequest.count({
          where: {
            assetId: asset.id,
            status: 'COMPLETED',
          },
        });

        // Compute simulated run hours based on age and asset type
        const baselineHoursPerYear = asset.category === 'HVAC' ? 1500 : 500;
        const runHours = ageYears * baselineHoursPerYear;

        // Check if under warranty
        const hasWarranty = asset.warrantyExpiresAt ? new Date(asset.warrantyExpiresAt) > new Date() : false;

        // Call Python ML service
        const requestBody = {
          asset_id: asset.id.toString(),
          category: asset.category,
          age_years: Number(ageYears.toFixed(2)),
          minor_repairs_count: minorRepairsCount,
          run_hours: Number(runHours.toFixed(1)),
          has_warranty: hasWarranty,
        };

        const response = await axios.post(
          `${this.ML_SERVICE_URL}/predict/maintenance-rul`,
          requestBody,
          {
            timeout: 5000,
            headers: { 'Content-Type': 'application/json' },
          }
        );

        const rulData = response.data;
        const failureProb = Number(rulData.failure_probability_30d ?? 0);

        // Persist a per-asset risk snapshot on every scan. This is the data
        // foundation for the risk-summary API, 30-day trend, and MED->HIGH
        // alerting (#9-14). Wrapped so a snapshot write can't abort the scan.
        try {
          await this.prisma.maintenanceRiskSnapshot.create({
            data: {
              assetId: asset.id,
              organizationId: asset.property.organizationId,
              category: asset.category,
              riskLevel: this.computeRiskLevel(failureProb),
              failureProbability30d: failureProb,
              remainingUsefulLifeDays: rulData.remaining_useful_life_days ?? null,
              confidence: this.computeConfidence({
                hasInstallDate: !!asset.installDate,
                minorRepairsCount,
                hasWarrantyInfo: !!asset.warrantyExpiresAt,
              }),
              drivers: this.computeDrivers({
                ageYears,
                minorRepairsCount,
                runHours,
                hasWarranty,
                category: asset.category,
              }),
              dataQualityFlags: this.computeDataQualityFlags({
                hasInstallDate: !!asset.installDate,
                minorRepairsCount,
              }),
              recommendedAction: rulData.recommended_action ?? null,
            },
          });
          snapshotsCreated++;
        } catch (snapshotError) {
          this.logger.error(
            `Failed to persist risk snapshot for asset ${asset.id}: ${snapshotError}`,
          );
        }

        // Create ActionIntent alert if failure probability is high (> 70% in 30 days)
        if (rulData.failure_probability_30d >= 0.70) {
          // Check if pending alert already exists to prevent duplicate ActionIntents
          const existingIntent = await (this.prisma as any).actionIntent.findFirst({
            where: {
              type: 'PREVENTIVE_MAINTENANCE_ALERT',
              status: 'PENDING',
              organizationId: asset.property.organizationId,
            },
          });

          const alreadyHasAlert = existingIntent ? 
            (existingIntent.metadata as any)?.assetId === asset.id : false;

          if (!alreadyHasAlert) {
            const description = `Asset ${asset.name} (${asset.category}) has a ${Math.round(rulData.failure_probability_30d * 100)}% failure risk within 30 days. Projected RUL: ${rulData.remaining_useful_life_days} days.`;
            
            const intent = await (this.prisma as any).actionIntent.create({
              data: {
                organizationId: asset.property.organizationId,
                type: 'PREVENTIVE_MAINTENANCE_ALERT',
                description,
                status: 'PENDING',
                priority: rulData.failure_probability_30d >= 0.90 ? 'HIGH' : 'MEDIUM',
                metadata: {
                  assetId: asset.id,
                  assetName: asset.name,
                  category: asset.category,
                  propertyId: asset.propertyId,
                  unitId: asset.unitId,
                  remainingLifeDays: rulData.remaining_useful_life_days,
                  failureProbability: rulData.failure_probability_30d,
                  recommendedAction: rulData.recommended_action,
                },
              },
            });
            alertsGenerated.push(intent);
          }
        }
      } catch (error) {
        this.logger.error(`Failed to analyze predictive maintenance for asset ${asset.id}: ${error}`);
      }
    }

    return {
      scannedCount: assets.length,
      snapshotsCreated,
      alertsGeneratedCount: alertsGenerated.length,
      alerts: alertsGenerated,
    };
  }

  // --- Risk scoring helpers (rules-based v1; documented for a future ML model) ---

  /** Bucket the 30-day failure probability into a risk level. */
  private computeRiskLevel(failureProbability: number): MaintenanceRiskLevel {
    if (failureProbability >= 0.7) return MaintenanceRiskLevel.HIGH;
    if (failureProbability >= 0.4) return MaintenanceRiskLevel.MEDIUM;
    return MaintenanceRiskLevel.LOW;
  }

  /**
   * Rules-based confidence (0-1) driven by input-data completeness. Documented
   * so a future ML model can replace it: base 0.4, +0.25 install date known,
   * +0.20 has service history, +0.15 warranty status known.
   */
  private computeConfidence(input: {
    hasInstallDate: boolean;
    minorRepairsCount: number;
    hasWarrantyInfo: boolean;
  }): number {
    let c = 0.4;
    if (input.hasInstallDate) c += 0.25;
    if (input.minorRepairsCount > 0) c += 0.2;
    if (input.hasWarrantyInfo) c += 0.15;
    return Math.min(1, Number(c.toFixed(2)));
  }

  /** Derive the top (up to 3) risk drivers from the scan inputs. */
  private computeDrivers(input: {
    ageYears: number;
    minorRepairsCount: number;
    runHours: number;
    hasWarranty: boolean;
    category: string;
  }): Array<{ code: string; label: string; weight: number }> {
    const drivers: Array<{ code: string; label: string; weight: number }> = [];
    if (input.ageYears >= 10) {
      drivers.push({ code: 'AGING_ASSET', label: `Aging asset (~${Math.round(input.ageYears)} yrs)`, weight: Math.min(1, input.ageYears / 20) });
    } else if (input.ageYears >= 5) {
      drivers.push({ code: 'MODERATE_AGE', label: `Moderate age (~${Math.round(input.ageYears)} yrs)`, weight: input.ageYears / 20 });
    }
    if (input.minorRepairsCount >= 3) {
      drivers.push({ code: 'FREQUENT_REPAIRS', label: `${input.minorRepairsCount} prior repairs`, weight: Math.min(1, input.minorRepairsCount / 6) });
    }
    if (!input.hasWarranty) {
      drivers.push({ code: 'OUT_OF_WARRANTY', label: 'Out of warranty', weight: 0.4 });
    }
    const runThreshold = input.category === 'HVAC' ? 12000 : 4000;
    if (input.runHours >= runThreshold) {
      drivers.push({ code: 'HIGH_RUNTIME', label: `High runtime (~${Math.round(input.runHours)}h)`, weight: Math.min(1, input.runHours / (runThreshold * 2)) });
    }
    return drivers.sort((a, b) => b.weight - a.weight).slice(0, 3);
  }

  /** Data-quality flags that reduce confidence in the risk score. */
  private computeDataQualityFlags(input: {
    hasInstallDate: boolean;
    minorRepairsCount: number;
  }): string[] {
    const flags: string[] = [];
    if (!input.hasInstallDate) flags.push('MISSING_INSTALL_DATE');
    if (input.minorRepairsCount === 0) flags.push('NO_SERVICE_HISTORY');
    else if (input.minorRepairsCount < 3) flags.push('LOW_REQUEST_VOLUME');
    return flags;
  }

  /**
   * #9 — aggregate the latest per-asset risk snapshots for an org into a summary:
   * counts by level, top categories, top drivers, and a 30-day trend delta.
   */
  async getRiskSummary(orgId?: string) {
    if (!orgId) {
      throw new BadRequestException('Organization context is required for the risk summary');
    }
    const cap = 5000;
    const currentRows = await this.prisma.maintenanceRiskSnapshot.findMany({
      where: { organizationId: orgId },
      orderBy: { scannedAt: 'desc' },
      take: cap,
    });
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const priorRows = await this.prisma.maintenanceRiskSnapshot.findMany({
      where: { organizationId: orgId, scannedAt: { lte: cutoff } },
      orderBy: { scannedAt: 'desc' },
      take: cap,
    });
    return PredictiveMaintenanceService.buildRiskSummary(currentRows, priorRows);
  }

  /** Keep only the most recent snapshot per asset (rows must be scannedAt DESC). */
  private static latestPerAsset<T extends RiskSnapshotLike>(rowsDesc: T[]): T[] {
    const seen = new Set<number>();
    const out: T[] = [];
    for (const r of rowsDesc) {
      if (seen.has(r.assetId)) continue;
      seen.add(r.assetId);
      out.push(r);
    }
    return out;
  }

  /**
   * Pure aggregation over latest-per-asset snapshots. Static + side-effect-free
   * so it is unit-tested without a database. Inputs must be scannedAt DESC.
   */
  static buildRiskSummary(currentRowsDesc: RiskSnapshotLike[], priorRowsDesc: RiskSnapshotLike[]) {
    const latest = PredictiveMaintenanceService.latestPerAsset(currentRowsDesc);
    const prior = PredictiveMaintenanceService.latestPerAsset(priorRowsDesc);

    const byLevel: Record<string, number> = { LOW: 0, MEDIUM: 0, HIGH: 0 };
    const categories: Record<string, { category: string; count: number; high: number }> = {};
    const driverCounts: Record<string, number> = {};

    for (const s of latest) {
      byLevel[s.riskLevel] = (byLevel[s.riskLevel] ?? 0) + 1;
      const cat = (categories[s.category] ??= { category: s.category, count: 0, high: 0 });
      cat.count += 1;
      if (s.riskLevel === 'HIGH') cat.high += 1;
      const drivers = Array.isArray(s.drivers) ? s.drivers : [];
      for (const d of drivers) {
        const code = d && typeof d === 'object' ? (d as { code?: string }).code : undefined;
        if (code) driverCounts[code] = (driverCounts[code] ?? 0) + 1;
      }
    }

    const topCategories = Object.values(categories)
      .sort((a, b) => b.high - a.high || b.count - a.count)
      .slice(0, 5);
    const topDrivers = Object.entries(driverCounts)
      .map(([code, count]) => ({ code, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    const highRiskNow = byLevel.HIGH;
    const highRisk30dAgo = prior.filter((s) => s.riskLevel === 'HIGH').length;

    return {
      totalAssets: latest.length,
      byLevel,
      highRiskCount: highRiskNow,
      topCategories,
      topDrivers,
      trend30d: {
        highRiskNow,
        highRisk30dAgo,
        delta: highRiskNow - highRisk30dAgo,
      },
      generatedAt: new Date().toISOString(),
    };
  }

  async triggerPreventiveTicket(assetId: number, userId: string) {
    const asset = await this.prisma.maintenanceAsset.findUnique({
      where: { id: assetId },
      include: { property: true },
    });

    if (!asset) {
      throw new Error(`Asset with ID ${assetId} not found.`);
    }

    // Generate work order request
    const request = await this.prisma.maintenanceRequest.create({
      data: {
        title: `PREVENTATIVE MAINTENANCE: Schedule overhaul for ${asset.name}`,
        description: `Auto-generated preventative maintenance request for high-risk ${asset.category} unit (Model: ${asset.model || 'Unknown'}, Manufacturer: ${asset.manufacturer || 'Unknown'}). Check filters, lines, electrical bounds, and perform regular tune-up parameters.`,
        status: 'PENDING',
        priority: 'MEDIUM',
        authorId: userId,
        propertyId: asset.propertyId,
        unitId: asset.unitId,
        assetId: asset.id,
      },
    });

    // Resolve matching ActionIntent if it exists
    const matchingIntent = await (this.prisma as any).actionIntent.findFirst({
      where: {
        type: 'PREVENTIVE_MAINTENANCE_ALERT',
        status: 'PENDING',
      },
    });

    if (matchingIntent && (matchingIntent.metadata as any)?.assetId === assetId) {
      await (this.prisma as any).actionIntent.update({
        where: { id: matchingIntent.id },
        data: {
          status: 'RESOLVED',
          resolvedAt: new Date(),
        },
      });
    }

    return request;
  }
}
