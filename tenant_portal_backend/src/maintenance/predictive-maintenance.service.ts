import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';

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
      alertsGeneratedCount: alertsGenerated.length,
      alerts: alertsGenerated,
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
