import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RentRecommendationStatus } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import axios from 'axios';
import { ApiException } from '../common/errors';
import { ErrorCode } from '../common/errors/error-codes.enum';

interface MLPredictionRequest {
  unit_id: string;
  property_type: string;
  bedrooms: number;
  bathrooms: number;
  square_feet: number;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  current_rent: number;
  has_parking: boolean;
  has_laundry: boolean;
  has_pool: boolean;
  has_gym: boolean;
  has_hvac: boolean;
  is_furnished: boolean;
  pets_allowed: boolean;
  year_built?: number;
  floor_number?: number;
}

interface MLPredictionResponse {
  unit_id: string;
  current_rent: number;
  recommended_rent: number;
  confidence_interval_low: number;
  confidence_interval_high: number;
  confidence_score: number;
  factors: Array<{
    name: string;
    impact_percentage: number;
    description: string;
  }>;
  market_comparables: Array<{
    address: string;
    rent: number;
    bedrooms: number;
    bathrooms: number;
    square_feet: number;
    distance_miles: number;
    similarity_score: number;
  }>;
  reasoning: string;
  model_version: string;
  market_trend: string;
  seasonality_factor?: number;
}

@Injectable()
export class RentOptimizationService {
  private readonly logger = new Logger(RentOptimizationService.name);
  private readonly ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';
  private readonly USE_ML_SERVICE = process.env.USE_ML_SERVICE === 'true';
  
  constructor(private prisma: PrismaService) {
    this.logger.log(`RentOptimizationService initialized. ML Service URL: ${this.ML_SERVICE_URL}, USE_ML_SERVICE: ${this.USE_ML_SERVICE}`);
  }

  private recommendationScope(orgId?: string): Prisma.RentRecommendationWhereInput | undefined {
    if (!orgId) {
      return undefined;
    }
    return { unit: { property: { organizationId: orgId } } };
  }

  private async assertUnitInOrg(unitId: number, orgId?: string) {
    if (!orgId) return;
    const unit = await this.prisma.unit.findFirst({
      where: { id: unitId, property: { organizationId: orgId } },
      select: { id: true },
    });
    if (!unit) {
      throw ApiException.forbidden(
        ErrorCode.AUTH_FORBIDDEN,
        'Unit is not accessible for this organization',
        { unitId: String(unitId) },
      );
    }
  }

  async createRecommendation(data: MLPredictionResponse) {
    const { unit_id, recommended_rent, confidence_interval_low, confidence_interval_high, factors, market_comparables, model_version, reasoning } = data;

    const unitId = this.parseNumericId(unit_id, 'unit');
    const unitIdLabel = String(unitId);
    const unit = await this.prisma.unit.findUnique({
      where: { id: unitId },
      include: { lease: true },
    }) as Prisma.UnitGetPayload<{ include: { lease: true } }>;

    if (!unit) {
      throw ApiException.notFound(
        ErrorCode.UNIT_NOT_FOUND,
        `Unit with ID ${unitIdLabel} not found`,
        { unitId: unitIdLabel },
      );
    }
    
    // Create the rent recommendation using unchecked input
    return this.prisma.rentRecommendation.create({
      data: {
        id: `${unitIdLabel}-${Date.now().toString()}`,
        unit: { connect: { id: unitId } },
        currentRent: unit.lease?.rentAmount || 0,
        recommendedRent: recommended_rent,
        confidenceIntervalLow: confidence_interval_low,
        confidenceIntervalHigh: confidence_interval_high,
        factors: factors as any,
        marketComparables: market_comparables as any,
        modelVersion: model_version,
        reasoning,
        status: RentRecommendationStatus.PENDING,
      },
    });
  }

  async getAllRecommendations(orgId?: string) {
    return this.prisma.rentRecommendation.findMany({
      where: this.recommendationScope(orgId),
      include: {
        unit: {
          include: {
            property: true,
            lease: true,
          },
        },
        acceptedBy: {
          select: {
            id: true,
            username: true,
          },
        },
        rejectedBy: {
          select: {
            id: true,
            username: true,
          },
        },
      },
      orderBy: {
        generatedAt: 'desc',
      },
    });
  }

  async getRecommendation(id: string, orgId?: string) {
    const recommendation = await this.prisma.rentRecommendation.findFirst({
      where: {
        id,
        ...(this.recommendationScope(orgId) ?? {}),
      },
      include: {
        unit: {
          include: {
            property: true,
            lease: true,
          },
        },
        acceptedBy: {
          select: {
            id: true,
            username: true,
          },
        },
        rejectedBy: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    if (!recommendation) {
      throw ApiException.notFound(
        ErrorCode.RENT_RECOMMENDATION_NOT_FOUND,
        `Recommendation with ID ${id} not found`,
        { recommendationId: id },
      );
    }

    return recommendation;
  }

  async getRecommendationByUnit(unitId: string | number, orgId?: string) {
    const unitIdNum = this.parseNumericId(unitId, 'unit');
    await this.assertUnitInOrg(unitIdNum, orgId);
    const recommendations = await this.prisma.rentRecommendation.findMany({
      where: {
        unitId: unitIdNum,
        ...(this.recommendationScope(orgId) ?? {}),
      },
      include: {
        unit: {
          include: {
            property: true,
            lease: true,
          },
        },
        acceptedBy: {
          select: {
            id: true,
            username: true,
          },
        },
        rejectedBy: {
          select: {
            id: true,
            username: true,
          },
        },
      },
      orderBy: {
        generatedAt: 'desc',
      },
      take: 1,
    });

    return recommendations[0] || null;
  }

  async generateRecommendations(unitIds: number[], orgId?: string) {
    const results = [];

    for (const unitId of unitIds) {
      const unitIdNumeric = this.parseNumericId(unitId, 'unit');
      const unitIdLabel = String(unitIdNumeric);
      await this.assertUnitInOrg(unitIdNumeric, orgId);
      // Get unit details
      const unit = await this.prisma.unit.findUnique({
        where: { id: unitIdNumeric },
        include: {
          lease: true,
          property: true,
        },
      }) as Prisma.UnitGetPayload<{ include: { lease: true; property: true } }>;

      if (!unit) {
        throw ApiException.notFound(
        ErrorCode.UNIT_NOT_FOUND,
        `Unit with ID ${unitIdLabel} not found`,
        { unitId: unitIdLabel },
      );
      }

      // Get prediction from ML service or fallback to mock
      let predictionData;
      
      if (this.USE_ML_SERVICE) {
        try {
          predictionData = await this.callMLService(unit);
          this.logger.log(`ML service prediction for unit ${unitIdLabel}: $${predictionData.recommendedRent}`);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.warn(`ML service unavailable, using mock data for unit ${unitIdLabel}`, errorMessage);
          predictionData = this.generateMockRecommendation(unit);
        }
      } else {
        predictionData = this.generateMockRecommendation(unit);
      }
        
      // Create recommendation in database
      const recommendation = await this.prisma.rentRecommendation.create({
        data: {
          id: `${unitIdLabel}-${Date.now().toString()}`, // Unique ID
          unit: { connect: { id: unitIdNumeric } },
          currentRent: unit.lease?.rentAmount || 0,
          recommendedRent: predictionData.recommendedRent,
          confidenceIntervalLow: predictionData.confidenceIntervalLow,
          confidenceIntervalHigh: predictionData.confidenceIntervalHigh,
          factors: predictionData.factors as any,
          marketComparables: predictionData.marketComparables as any,
          modelVersion: predictionData.modelVersion,
          reasoning: predictionData.reasoning,
          status: RentRecommendationStatus.PENDING,
        },
        include: {
          unit: {
            include: {
              property: true,
              lease: true,
            },
          },
        },
      });

      results.push(recommendation);
    }

    return results;
  }

  /**
   * Call Python ML microservice for rent prediction
   */
  private async callMLService(unit: any): Promise<any> {
    try {
      // Prepare request payload
      const request: MLPredictionRequest = {
        unit_id: unit.id.toString(),
        property_type: this.mapPropertyType(unit.property?.type || 'APARTMENT'),
        bedrooms: unit.bedrooms || 1,
        bathrooms: unit.bathrooms || 1,
        square_feet: unit.squareFeet || 800,
        address: unit.property?.address || 'Unknown',
        city: unit.property?.city || 'Unknown',
        state: unit.property?.state || 'WA',
        zip_code: unit.property?.zipCode || '00000',
        current_rent: unit.lease?.rentAmount || 1000,
        has_parking: unit.hasParking || false,
        has_laundry: unit.hasLaundry || false,
        has_pool: unit.property?.hasPool || false,
        has_gym: unit.property?.hasGym || false,
        has_hvac: unit.hasHvac || false,
        is_furnished: unit.isFurnished || false,
        pets_allowed: unit.petsAllowed || false,
        year_built: unit.property?.yearBuilt,
        floor_number: unit.floor,
      };

      // Call ML service
      const response = await axios.post<MLPredictionResponse>(
        `${this.ML_SERVICE_URL}/predict`,
        request,
        {
          timeout: 10000, // 10 second timeout
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      // Transform ML response to our format
      return {
        recommendedRent: response.data.recommended_rent,
        confidenceIntervalLow: response.data.confidence_interval_low,
        confidenceIntervalHigh: response.data.confidence_interval_high,
        factors: response.data.factors,
        marketComparables: response.data.market_comparables,
        modelVersion: response.data.model_version,
        reasoning: response.data.reasoning,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error calling ML service: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Map database property type to ML service property type
   */
  private mapPropertyType(type: string): string {
    const typeMap: Record<string, string> = {
      'APARTMENT': 'APARTMENT',
      'HOUSE': 'HOUSE',
      'CONDO': 'CONDO',
      'TOWNHOUSE': 'TOWNHOUSE',
      'STUDIO': 'STUDIO',
    };
    return typeMap[type.toUpperCase()] || 'APARTMENT';
  }

  async acceptRecommendation(id: string, userId: string, orgId?: string) {
    const recommendation = await this.prisma.rentRecommendation.findFirst({
      where: {
        id,
        ...(this.recommendationScope(orgId) ?? {}),
      },
    });

    if (!recommendation) {
      throw ApiException.notFound(
        ErrorCode.RENT_RECOMMENDATION_NOT_FOUND,
        `Recommendation with ID ${id} not found`,
        { recommendationId: id },
      );
    }

    if (recommendation.status !== RentRecommendationStatus.PENDING) {
      throw ApiException.badRequest(
        ErrorCode.RENT_RECOMMENDATION_INVALID_STATUS,
        `Recommendation is already ${recommendation.status.toLowerCase()}. Only pending recommendations can be rejected.`,
        { recommendationId: id, currentStatus: recommendation.status },
      );
    }

    // Update recommendation status
    const updated = await this.prisma.rentRecommendation.update({
      where: { id },
      data: {
        status: RentRecommendationStatus.ACCEPTED,
        acceptedAt: new Date(),
        acceptedById: userId,
      },
      include: {
        unit: {
          include: {
            property: true,
            lease: true,
          },
        },
        acceptedBy: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    // TODO: Update lease rent amount in real implementation
    // await this.prisma.lease.update({
    //   where: { unitId: recommendation.unitId },
    //   data: { rentAmount: recommendation.recommendedRent },
    // });

    return updated;
  }

  async rejectRecommendation(id: string, userId: string, orgId?: string) {
    const recommendation = await this.prisma.rentRecommendation.findFirst({
      where: {
        id,
        ...(this.recommendationScope(orgId) ?? {}),
      },
    });

    if (!recommendation) {
      throw ApiException.notFound(
        ErrorCode.RENT_RECOMMENDATION_NOT_FOUND,
        `Recommendation with ID ${id} not found`,
        { recommendationId: id },
      );
    }

    if (recommendation.status !== RentRecommendationStatus.PENDING) {
      throw ApiException.badRequest(
        ErrorCode.RENT_RECOMMENDATION_INVALID_STATUS,
        `Recommendation is already ${recommendation.status.toLowerCase()}. Only pending recommendations can be rejected.`,
        { recommendationId: id, currentStatus: recommendation.status },
      );
    }

    const updated = await this.prisma.rentRecommendation.update({
      where: { id },
      data: {
        status: RentRecommendationStatus.REJECTED,
        rejectedAt: new Date(),
        rejectedById: userId,
      },
      include: {
        unit: {
          include: {
            property: true,
            lease: true,
          },
        },
        rejectedBy: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    return updated;
  }

  async getStats(orgId?: string) {
    const scope = this.recommendationScope(orgId);
    const [total, pending, accepted, rejected] = await Promise.all([
      this.prisma.rentRecommendation.count({ where: scope }),
      this.prisma.rentRecommendation.count({
        where: { status: RentRecommendationStatus.PENDING, ...(scope ?? {}) },
      }),
      this.prisma.rentRecommendation.count({
        where: { status: RentRecommendationStatus.ACCEPTED, ...(scope ?? {}) },
      }),
      this.prisma.rentRecommendation.count({
        where: { status: RentRecommendationStatus.REJECTED, ...(scope ?? {}) },
      }),
    ]);

    const recommendations = await this.prisma.rentRecommendation.findMany({
      where: scope,
      select: {
        currentRent: true,
        recommendedRent: true,
      },
    });

    const avgConfidence = 0; // Removed confidenceScore field

    // Filter out recommendations with currentRent === 0 to avoid division by zero
    const validIncreaseRecs = recommendations.filter(r => r.currentRent !== 0);
    const avgIncrease = validIncreaseRecs.length > 0
      ? validIncreaseRecs.reduce((sum: number, r: any) => {
          const increase = ((r.recommendedRent - r.currentRent) / r.currentRent) * 100;
          return sum + increase;
        }, 0) / validIncreaseRecs.length
      : 0;

    const totalPotentialIncrease = recommendations.reduce(
      (sum: number, r: any) => sum + (r.recommendedRent - r.currentRent),
      0,
    );

    return {
      total,
      pending,
      accepted,
      rejected,
      avgConfidence: Number(avgConfidence.toFixed(2)),
      avgIncrease: Number(avgIncrease.toFixed(2)),
      totalPotentialIncrease: Number(totalPotentialIncrease.toFixed(2)),
    };
  }

  async getRecentRecommendations(limit: number = 10, orgId?: string) {
    return this.prisma.rentRecommendation.findMany({
      where: this.recommendationScope(orgId),
      include: {
        unit: {
          include: {
            property: true,
            lease: true,
          },
        },
        acceptedBy: {
          select: {
            id: true,
            username: true,
          },
        },
        rejectedBy: {
          select: {
            id: true,
            username: true,
          },
        },
      },
      orderBy: {
        generatedAt: 'desc',
      },
      take: limit,
    });
  }

  async getRecommendationsByStatus(status: string, orgId?: string) {
    const statusEnum = status.toUpperCase() as RentRecommendationStatus;
    
    return this.prisma.rentRecommendation.findMany({
      where: {
        status: statusEnum,
        ...(this.recommendationScope(orgId) ?? {}),
      },
      include: {
        unit: {
          include: {
            property: true,
            lease: true,
          },
        },
        acceptedBy: {
          select: {
            id: true,
            username: true,
          },
        },
        rejectedBy: {
          select: {
            id: true,
            username: true,
          },
        },
      },
      orderBy: {
        generatedAt: 'desc',
      },
    });
  }

  async getRecommendationsByProperty(propertyId: string | number, orgId?: string) {
    const propertyIdNum = this.parseNumericId(propertyId, 'property');
    return this.prisma.rentRecommendation.findMany({
      where: {
        unit: {
          propertyId: propertyIdNum,
          ...(orgId ? { property: { organizationId: orgId } } : {}),
        },
      },
      include: {
        unit: {
          include: {
            property: true,
            lease: true,
          },
        },
        acceptedBy: {
          select: {
            id: true,
            username: true,
          },
        },
        rejectedBy: {
          select: {
            id: true,
            username: true,
          },
        },
      },
      orderBy: {
        generatedAt: 'desc',
      },
    });
  }

  async getComparison(unitId: string | number, orgId?: string) {
    const unitIdNumeric = this.parseNumericId(unitId, 'unit');
    const unitIdLabel = String(unitIdNumeric);
    await this.assertUnitInOrg(unitIdNumeric, orgId);
    const unit = await this.prisma.unit.findUnique({
      where: { id: unitIdNumeric },
      include: {
        property: true,
        lease: true,
      },
    }) as Prisma.UnitGetPayload<{ include: { property: true; lease: true } }>;

    if (!unit) {
      throw ApiException.notFound(
        ErrorCode.UNIT_NOT_FOUND,
        `Unit with ID ${unitIdLabel} not found`,
        { unitId: unitIdLabel },
      );
    }

    const recommendations = await this.prisma.rentRecommendation.findMany({
      where: {
        unitId: unitIdNumeric,
        ...(this.recommendationScope(orgId) ?? {}),
      },
      orderBy: {
        generatedAt: 'desc',
      },
      take: 10,
    });

    const currentRent = unit.lease?.rentAmount || 0;
    const latestRecommendation = recommendations[0];

    // Since lease is one-to-one, we only have the current lease
    const rentHistory = unit.lease ? [{
      startDate: unit.lease.startDate,
      endDate: unit.lease.endDate,
      rent: unit.lease.rentAmount,
    }] : [];

    const recommendationHistory = recommendations.map((rec: any) => ({
      generatedAt: rec.generatedAt,
      currentRent: rec.currentRent,
      recommendedRent: rec.recommendedRent,
      status: rec.status,
    }));

    return {
      unit: {
        id: unit.id,
        name: unit.name,
        property: {
          id: unit.property.id,
          name: unit.property.name,
          address: unit.property.address,
        },
      },
      currentRent,
      latestRecommendation: latestRecommendation ? {
        recommendedRent: latestRecommendation.recommendedRent,
        difference: latestRecommendation.recommendedRent - currentRent,
        percentageChange: currentRent > 0 
          ? ((latestRecommendation.recommendedRent - currentRent) / currentRent) * 100 
          : 0,
        generatedAt: latestRecommendation.generatedAt,
        status: latestRecommendation.status,
      } : null,
      rentHistory,
      recommendationHistory,
    };
  }

  async bulkGenerateByProperty(propertyId: string | number, orgId?: string) {
    const propertyIdNum = this.parseNumericId(propertyId, 'property');
    const propertyIdLabel = String(propertyIdNum);
    const units = await this.prisma.unit.findMany({
      where: {
        propertyId: propertyIdNum,
        ...(orgId ? { property: { organizationId: orgId } } : {}),
      },
      select: { id: true },
    });

    if (units.length === 0) {
      throw ApiException.notFound(
        ErrorCode.UNIT_NOT_FOUND,
        `No units found for property ${propertyIdLabel}`,
        { propertyId: propertyIdLabel },
      );
    }

    const unitIds = units.map((u) => u.id);
    return this.generateRecommendations(unitIds, orgId);
  }

  async bulkGenerateAll(orgId?: string) {
    const units = await this.prisma.unit.findMany({
      where: orgId ? { property: { organizationId: orgId } } : undefined,
      select: { id: true },
    });

    if (units.length === 0) {
      throw ApiException.notFound(
        ErrorCode.UNIT_NOT_FOUND,
        'No units found in the system',
      );
    }

    const unitIds = units.map((u) => u.id);
    this.logger.log(`Generating recommendations for all ${unitIds.length} units`);
    
    return this.generateRecommendations(unitIds, orgId);
  }

  async applyRecommendation(id: string, userId: string, orgId?: string) {
    const recommendation = await this.prisma.rentRecommendation.findFirst({
      where: {
        id,
        ...(this.recommendationScope(orgId) ?? {}),
      },
      include: {
        unit: {
          include: {
            lease: true,
          },
        },
      },
    });

    if (!recommendation) {
      throw ApiException.notFound(
        ErrorCode.RENT_RECOMMENDATION_NOT_FOUND,
        `Recommendation with ID ${id} not found`,
        { recommendationId: id },
      );
    }

    if (recommendation.status !== RentRecommendationStatus.ACCEPTED) {
      throw ApiException.badRequest(
        ErrorCode.RENT_RECOMMENDATION_INVALID_STATUS,
        'Only accepted recommendations can be applied. Please accept the recommendation first.',
        { recommendationId: id, currentStatus: recommendation.status },
      );
    }

    // Update the current lease rent amount
    const currentLease = recommendation.unit.lease;
    if (!currentLease) {
      throw ApiException.badRequest(
        ErrorCode.BUSINESS_PRECONDITION_FAILED,
        'No active lease found for this unit',
        { unitId: recommendation.unitId },
      );
    }

    await this.prisma.lease.update({
      where: { id: currentLease.id },
      data: {
        rentAmount: recommendation.recommendedRent,
      },
    });

    this.logger.log(
      `Applied recommendation ${id}: Updated lease ${currentLease.id} rent from $${recommendation.currentRent} to $${recommendation.recommendedRent}`,
    );

    return {
      success: true,
      message: 'Recommendation applied successfully',
      previousRent: recommendation.currentRent,
      newRent: recommendation.recommendedRent,
      difference: recommendation.recommendedRent - recommendation.currentRent,
      leaseId: currentLease.id,
      unitId: recommendation.unitId,
    };
  }

  async updateRecommendation(id: string, recommendedRent: number, reasoning?: string, orgId?: string) {
    const recommendation = await this.prisma.rentRecommendation.findFirst({
      where: {
        id,
        ...(this.recommendationScope(orgId) ?? {}),
      },
    });

    if (!recommendation) {
      throw ApiException.notFound(
        ErrorCode.RENT_RECOMMENDATION_NOT_FOUND,
        `Recommendation with ID ${id} not found`,
        { recommendationId: id },
      );
    }

    if (recommendation.status !== RentRecommendationStatus.PENDING) {
      throw ApiException.badRequest(
        ErrorCode.RENT_RECOMMENDATION_INVALID_STATUS,
        'Only pending recommendations can be updated',
        { recommendationId: id, currentStatus: recommendation.status },
      );
    }

    if (recommendedRent <= 0) {
      throw ApiException.badRequest(
        ErrorCode.VALIDATION_OUT_OF_RANGE,
        'Recommended rent must be greater than 0',
        { recommendedRent },
      );
    }

    const updated = await this.prisma.rentRecommendation.update({
      where: { id },
      data: {
        recommendedRent,
        reasoning: reasoning || recommendation.reasoning,
        // Recalculate confidence interval based on new recommended rent
        confidenceIntervalLow: Math.round(recommendedRent * 0.97),
        confidenceIntervalHigh: Math.round(recommendedRent * 1.03),
      },
      include: {
        unit: {
          include: {
            property: true,
            lease: true,
          },
        },
      },
    });

    this.logger.log(
      `Updated recommendation ${id}: Rent changed from $${recommendation.recommendedRent} to $${recommendedRent}`,
    );

    return updated;
  }

  async deleteRecommendation(id: string, orgId?: string) {
    const recommendation = await this.prisma.rentRecommendation.findFirst({
      where: {
        id,
        ...(this.recommendationScope(orgId) ?? {}),
      },
    });

    if (!recommendation) {
      throw ApiException.notFound(
        ErrorCode.RENT_RECOMMENDATION_NOT_FOUND,
        `Recommendation with ID ${id} not found`,
        { recommendationId: id },
      );
    }

    if (recommendation.status === RentRecommendationStatus.ACCEPTED) {
      throw ApiException.badRequest(
        ErrorCode.RENT_RECOMMENDATION_CANNOT_DELETE_ACCEPTED,
        'Cannot delete an accepted recommendation. Please reject it first if you want to remove it.',
        { recommendationId: id, currentStatus: recommendation.status },
      );
    }

    await this.prisma.rentRecommendation.delete({
      where: { id },
    });

    this.logger.log(`Deleted recommendation ${id} for unit ${recommendation.unitId}`);

    return {
      success: true,
      message: 'Recommendation deleted successfully',
      deletedId: id,
    };
  }

  // Mock recommendation generation - replace with real ML service
  private generateMockRecommendation(unit: any) {
    const currentRent = unit.lease?.rentAmount || 1000;
    const increase = Math.random() * 0.1 + 0.02; // 2-12% increase
    const recommendedRent = Math.round(currentRent * (1 + increase));

    return {
      recommendedRent,
      confidenceIntervalLow: Math.round(recommendedRent * 0.97),
      confidenceIntervalHigh: Math.round(recommendedRent * 1.03),
      factors: [
        {
          name: 'Market Trend',
          impact_percentage: increase * 50,
          description: `Local market rents increased ${(increase * 100).toFixed(1)}% recently`,
        },
        {
          name: 'Seasonal Demand',
          impact_percentage: 2.1,
          description: 'Current season shows higher demand',
        },
      ],
      marketComparables: [
        {
          address: `${Math.floor(Math.random() * 999)} Nearby St`,
          rent: recommendedRent + Math.floor(Math.random() * 100) - 50,
          bedrooms: 2,
          bathrooms: 1,
          square_feet: 850,
          distance_miles: Math.random() * 2,
          similarity_score: 0.85 + Math.random() * 0.1,
        },
      ],
      modelVersion: '1.0',
      reasoning: `Based on market analysis, this unit could be adjusted by ${(increase * 100).toFixed(1)}% to align with current market conditions.`,
    };
  }

  private parseNumericId(value: string | number, field: string): number {
    const parsed = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(parsed) || Number.isNaN(parsed) || !Number.isInteger(parsed)) {
      throw new BadRequestException(`Invalid ${field} id: ${value}`);
    }
    return parsed;
  }
}
