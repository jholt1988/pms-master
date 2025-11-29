/**
 * Rent Optimization Service
 * Provides rent recommendations using AI/ML models with backend API integration
 */

import { RentRecommendation, AIServiceResponse, AIServiceError } from '../types';
import { aiServicesConfig } from '../config';
import { apiFetch } from '../../../../services/apiClient';

// API base URL
const API_BASE = '/rent-recommendations';

// Get auth token from localStorage
const getAuthToken = (): string | null => {
  return localStorage.getItem('token');
};

// Mock data for fallback when API is unavailable
const MOCK_RECOMMENDATIONS: Record<string, RentRecommendation> = {
  '1': {
    unitId: '1',
    currentRent: 1200,
    recommendedRent: 1285,
    confidenceInterval: {
      low: 1250,
      high: 1320,
    },
    factors: [
      {
        name: 'Market Trend',
        impact: 5.2,
        description: 'Local market rents increased 5.2% in the past 6 months',
      },
      {
        name: 'Seasonal Demand',
        impact: 2.1,
        description: 'Spring season shows 2.1% higher demand',
      },
      {
        name: 'Unit Amenities',
        impact: 1.5,
        description: 'In-unit laundry adds premium value',
      },
      {
        name: 'Lease Duration',
        impact: -1.7,
        description: 'Long-term tenant discount applied',
      },
    ],
    marketComparables: [
      {
        address: '123 Oak Street, Unit 4B',
        distance: 0.3,
        bedrooms: 2,
        bathrooms: 1,
        sqft: 850,
        rent: 1295,
        listingDate: '2024-01-15',
        similarity: 0.92,
      },
      {
        address: '456 Maple Ave, Apt 2',
        distance: 0.5,
        bedrooms: 2,
        bathrooms: 1,
        sqft: 820,
        rent: 1275,
        listingDate: '2024-01-20',
        similarity: 0.88,
      },
      {
        address: '789 Pine Road, Unit 3',
        distance: 0.7,
        bedrooms: 2,
        bathrooms: 1,
        sqft: 900,
        rent: 1310,
        listingDate: '2024-01-10',
        similarity: 0.85,
      },
    ],
    modelVersion: 'mock-v1.0',
    generatedAt: new Date().toISOString(),
    status: 'pending',
    reasoning: 'Based on market analysis, your unit is currently underpriced by 7.1%. The recommended increase aligns with market trends while maintaining competitiveness.',
  },
  '2': {
    unitId: '2',
    currentRent: 950,
    recommendedRent: 975,
    confidenceInterval: {
      low: 960,
      high: 990,
    },
    factors: [
      {
        name: 'Market Trend',
        impact: 2.6,
        description: 'Studio apartments showing moderate growth',
      },
      {
        name: 'Location Premium',
        impact: 1.2,
        description: 'Proximity to public transit adds value',
      },
      {
        name: 'Unit Condition',
        impact: -0.5,
        description: 'Recent maintenance issues noted',
      },
    ],
    marketComparables: [
      {
        address: '321 Downtown Blvd, Studio 12',
        distance: 0.4,
        bedrooms: 0,
        bathrooms: 1,
        sqft: 520,
        rent: 985,
        listingDate: '2024-01-18',
        similarity: 0.90,
      },
      {
        address: '654 Center St, Unit A',
        distance: 0.6,
        bedrooms: 0,
        bathrooms: 1,
        sqft: 500,
        rent: 970,
        listingDate: '2024-01-22',
        similarity: 0.87,
      },
    ],
    modelVersion: 'mock-v1.0',
    generatedAt: new Date().toISOString(),
    status: 'pending',
    reasoning: 'Studio market remains stable. Modest 2.6% increase recommended to stay competitive while covering maintenance costs.',
  },
  '3': {
    unitId: '3',
    currentRent: 1850,
    recommendedRent: 1925,
    confidenceInterval: {
      low: 1890,
      high: 1960,
    },
    factors: [
      {
        name: 'Market Trend',
        impact: 4.1,
        description: 'Premium 3-bedroom units in high demand',
      },
      {
        name: 'Renovation Impact',
        impact: 2.5,
        description: 'Recent kitchen upgrade adds significant value',
      },
      {
        name: 'Parking Included',
        impact: 1.8,
        description: 'Two parking spaces command premium',
      },
      {
        name: 'HOA Fees',
        impact: -4.3,
        description: 'Increased HOA fees reduce competitiveness',
      },
    ],
    marketComparables: [
      {
        address: '111 Luxury Lane, Penthouse',
        distance: 0.8,
        bedrooms: 3,
        bathrooms: 2,
        sqft: 1350,
        rent: 1950,
        listingDate: '2024-01-12',
        similarity: 0.91,
      },
      {
        address: '222 Elite Drive, Unit 5',
        distance: 1.0,
        bedrooms: 3,
        bathrooms: 2,
        sqft: 1300,
        rent: 1900,
        listingDate: '2024-01-16',
        similarity: 0.89,
      },
      {
        address: '333 Prestige Pkwy, Apt 8',
        distance: 0.9,
        bedrooms: 3,
        bathrooms: 2,
        sqft: 1400,
        rent: 1975,
        listingDate: '2024-01-14',
        similarity: 0.93,
      },
    ],
    modelVersion: 'mock-v1.0',
    generatedAt: new Date().toISOString(),
    status: 'pending',
    reasoning: 'Recent renovations justify 4.1% increase. Premium market showing strong demand despite HOA fee increases.',
  },
};

class RentOptimizationService {
  private cache: Map<string, { data: RentRecommendation; timestamp: number }> = new Map();

  /**
   * Get rent recommendation for a specific unit
   */
  async getRecommendation(unitId: string): Promise<AIServiceResponse<RentRecommendation>> {
    const startTime = Date.now();
    const requestId = `rent-opt-${unitId}-${startTime}`;

    try {
      // Check cache first
      if (aiServicesConfig.rentOptimization.cacheEnabled) {
        const cached = this.getCached(unitId);
        if (cached) {
          return {
            success: true,
            data: cached,
            metadata: {
              requestId,
              timestamp: new Date().toISOString(),
              processingTime: Date.now() - startTime,
              cached: true,
              modelVersion: cached.modelVersion,
            },
          };
        }
      }

      // Try to get from backend API
      const token = getAuthToken();
      if (token) {
        try {
          const data = await apiFetch(`${API_BASE}/unit/${unitId}`, { token });
          
          if (data) {
            // Transform backend response to frontend format
            const recommendation = this.transformBackendResponse(data, unitId);
            
            // Cache the result
            if (aiServicesConfig.rentOptimization.cacheEnabled) {
              this.setCached(unitId, recommendation);
            }

            return {
              success: true,
              data: recommendation,
              metadata: {
                requestId,
                timestamp: new Date().toISOString(),
                processingTime: Date.now() - startTime,
                cached: false,
                modelVersion: recommendation.modelVersion,
              },
            };
          }
        } catch (apiError) {
          console.warn('API call failed, falling back to mock data:', apiError);
        }
      }

      // Fallback to mock data
      const recommendation = await this.getMockRecommendation(unitId);

      if (!recommendation) {
        const error = new Error(`No recommendation available for unit ${unitId}`);
        (error as any).code = 'UNIT_NOT_FOUND';
        (error as any).retryable = false;
        throw error;
      }

      // Cache the result
      if (aiServicesConfig.rentOptimization.cacheEnabled) {
        this.setCached(unitId, recommendation);
      }

      return {
        success: true,
        data: recommendation,
        metadata: {
          requestId,
          timestamp: new Date().toISOString(),
          processingTime: Date.now() - startTime,
          cached: false,
          modelVersion: recommendation.modelVersion,
        },
      };
    } catch (error: any) {
      const aiError: AIServiceError = {
        code: error.code || 'UNKNOWN_ERROR',
        message: error.message || 'Failed to generate rent recommendation',
        details: error.details || {},
        retryable: error.retryable !== false,
      };

      return {
        success: false,
        error: aiError,
        metadata: {
          requestId,
          timestamp: new Date().toISOString(),
          processingTime: Date.now() - startTime,
        },
      };
    }
  }

  /**
   * Get recommendations for all units (batch operation)
   */
  async getRecommendations(unitIds: string[]): Promise<AIServiceResponse<RentRecommendation[]>> {
    const startTime = Date.now();
    const requestId = `rent-opt-batch-${startTime}`;

    try {
      const recommendations = await Promise.all(
        unitIds.map(id => this.getRecommendation(id))
      );

      const successfulRecs = recommendations
        .filter(r => r.success && r.data)
        .map(r => r.data!);

      return {
        success: true,
        data: successfulRecs,
        metadata: {
          requestId,
          timestamp: new Date().toISOString(),
          processingTime: Date.now() - startTime,
          cached: false,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'BATCH_ERROR',
          message: 'Failed to generate batch recommendations',
          retryable: true,
        },
        metadata: {
          requestId,
          timestamp: new Date().toISOString(),
          processingTime: Date.now() - startTime,
        },
      };
    }
  }

  /**
   * Get statistics about all recommendations
   */
  async getStats(): Promise<AIServiceResponse<any>> {
    const token = getAuthToken();
    if (!token) {
      throw new Error('Authentication required');
    }

    try {
      const data = await apiFetch(`${API_BASE}/stats`, { token });
      return {
        success: true,
        data,
        metadata: {
          requestId: `stats-${Date.now()}`,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: error.errorCode || 'STATS_ERROR',
          message: error.message || 'Failed to fetch statistics',
          retryable: error.retryable !== false,
        },
        metadata: {
          requestId: `stats-${Date.now()}`,
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  /**
   * Get recent recommendations
   */
  async getRecentRecommendations(limit: number = 10): Promise<AIServiceResponse<RentRecommendation[]>> {
    const token = getAuthToken();
    if (!token) {
      throw new Error('Authentication required');
    }

    try {
      const data = await apiFetch(`${API_BASE}/recent?limit=${limit}`, { token });
      const recommendations = Array.isArray(data) 
        ? data.map((item: any) => this.transformBackendResponse(item, item.unitId?.toString() || ''))
        : [];
      
      return {
        success: true,
        data: recommendations,
        metadata: {
          requestId: `recent-${Date.now()}`,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: error.errorCode || 'RECENT_ERROR',
          message: error.message || 'Failed to fetch recent recommendations',
          retryable: error.retryable !== false,
        },
        metadata: {
          requestId: `recent-${Date.now()}`,
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  /**
   * Get recommendations by status
   */
  async getRecommendationsByStatus(status: 'pending' | 'accepted' | 'rejected'): Promise<AIServiceResponse<RentRecommendation[]>> {
    const token = getAuthToken();
    if (!token) {
      throw new Error('Authentication required');
    }

    try {
      const data = await apiFetch(`${API_BASE}/${status}`, { token });
      const recommendations = Array.isArray(data)
        ? data.map((item: any) => this.transformBackendResponse(item, item.unitId?.toString() || ''))
        : [];
      
      return {
        success: true,
        data: recommendations,
        metadata: {
          requestId: `status-${status}-${Date.now()}`,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: error.errorCode || 'STATUS_ERROR',
          message: error.message || `Failed to fetch ${status} recommendations`,
          retryable: error.retryable !== false,
        },
        metadata: {
          requestId: `status-${status}-${Date.now()}`,
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  /**
   * Get recommendations by property
   */
  async getRecommendationsByProperty(propertyId: number): Promise<AIServiceResponse<RentRecommendation[]>> {
    const token = getAuthToken();
    if (!token) {
      throw new Error('Authentication required');
    }

    try {
      const data = await apiFetch(`${API_BASE}/property/${propertyId}`, { token });
      const recommendations = Array.isArray(data)
        ? data.map((item: any) => this.transformBackendResponse(item, item.unitId?.toString() || ''))
        : [];
      
      return {
        success: true,
        data: recommendations,
        metadata: {
          requestId: `property-${propertyId}-${Date.now()}`,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: error.errorCode || 'PROPERTY_ERROR',
          message: error.message || 'Failed to fetch property recommendations',
          retryable: error.retryable !== false,
        },
        metadata: {
          requestId: `property-${propertyId}-${Date.now()}`,
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  /**
   * Generate recommendations for specific units
   */
  async generateRecommendations(unitIds: number[]): Promise<AIServiceResponse<RentRecommendation[]>> {
    const token = getAuthToken();
    if (!token) {
      throw new Error('Authentication required');
    }

    try {
      const data = await apiFetch(`${API_BASE}/generate`, {
        token,
        method: 'POST',
        body: { unitIds },
      });
      
      const recommendations = Array.isArray(data)
        ? data.map((item: any) => this.transformBackendResponse(item, item.unitId?.toString() || ''))
        : [];
      
      return {
        success: true,
        data: recommendations,
        metadata: {
          requestId: `generate-${Date.now()}`,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: error.errorCode || 'GENERATE_ERROR',
          message: error.message || 'Failed to generate recommendations',
          retryable: error.retryable !== false,
        },
        metadata: {
          requestId: `generate-${Date.now()}`,
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  /**
   * Accept a recommendation
   */
  async acceptRecommendation(recommendationId: string): Promise<AIServiceResponse<any>> {
    const token = getAuthToken();
    if (!token) {
      throw new Error('Authentication required');
    }

    try {
      const data = await apiFetch(`${API_BASE}/${recommendationId}/accept`, {
        token,
        method: 'POST',
      });
      
      return {
        success: true,
        data,
        metadata: {
          requestId: `accept-${recommendationId}-${Date.now()}`,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: error.errorCode || 'ACCEPT_ERROR',
          message: error.message || 'Failed to accept recommendation',
          retryable: error.retryable !== false,
        },
        metadata: {
          requestId: `accept-${recommendationId}-${Date.now()}`,
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  /**
   * Reject a recommendation
   */
  async rejectRecommendation(recommendationId: string): Promise<AIServiceResponse<any>> {
    const token = getAuthToken();
    if (!token) {
      throw new Error('Authentication required');
    }

    try {
      const data = await apiFetch(`${API_BASE}/${recommendationId}/reject`, {
        token,
        method: 'POST',
      });
      
      return {
        success: true,
        data,
        metadata: {
          requestId: `reject-${recommendationId}-${Date.now()}`,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: error.errorCode || 'REJECT_ERROR',
          message: error.message || 'Failed to reject recommendation',
          retryable: error.retryable !== false,
        },
        metadata: {
          requestId: `reject-${recommendationId}-${Date.now()}`,
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  /**
   * Apply a recommendation to the lease (updates actual rent)
   */
  async applyRecommendation(recommendationId: string): Promise<AIServiceResponse<any>> {
    const token = getAuthToken();
    if (!token) {
      throw new Error('Authentication required');
    }

    try {
      const data = await apiFetch(`${API_BASE}/${recommendationId}/apply`, {
        token,
        method: 'POST',
      });
      
      return {
        success: true,
        data,
        metadata: {
          requestId: `apply-${recommendationId}-${Date.now()}`,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: error.errorCode || 'APPLY_ERROR',
          message: error.message || 'Failed to apply recommendation',
          retryable: error.retryable !== false,
        },
        metadata: {
          requestId: `apply-${recommendationId}-${Date.now()}`,
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  /**
   * Update a recommendation
   */
  async updateRecommendation(
    recommendationId: string,
    recommendedRent: number,
    reasoning?: string
  ): Promise<AIServiceResponse<RentRecommendation>> {
    const token = getAuthToken();
    if (!token) {
      throw new Error('Authentication required');
    }

    try {
      const data = await apiFetch(`${API_BASE}/${recommendationId}/update`, {
        token,
        method: 'PUT',
        body: { recommendedRent, reasoning },
      });
      
      const recommendation = this.transformBackendResponse(data, data.unitId?.toString() || '');
      
      return {
        success: true,
        data: recommendation,
        metadata: {
          requestId: `update-${recommendationId}-${Date.now()}`,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: error.errorCode || 'UPDATE_ERROR',
          message: error.message || 'Failed to update recommendation',
          retryable: error.retryable !== false,
        },
        metadata: {
          requestId: `update-${recommendationId}-${Date.now()}`,
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  /**
   * Delete a recommendation
   */
  async deleteRecommendation(recommendationId: string): Promise<AIServiceResponse<any>> {
    const token = getAuthToken();
    if (!token) {
      throw new Error('Authentication required');
    }

    try {
      const data = await apiFetch(`${API_BASE}/${recommendationId}`, {
        token,
        method: 'DELETE',
      });
      
      return {
        success: true,
        data,
        metadata: {
          requestId: `delete-${recommendationId}-${Date.now()}`,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: error.errorCode || 'DELETE_ERROR',
          message: error.message || 'Failed to delete recommendation',
          retryable: error.retryable !== false,
        },
        metadata: {
          requestId: `delete-${recommendationId}-${Date.now()}`,
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  /**
   * Transform backend response to frontend format
   */
  private transformBackendResponse(data: any, unitId: string): RentRecommendation {
    return {
      id: data.id,
      unitId: unitId,
      currentRent: data.currentRent,
      recommendedRent: data.recommendedRent,
      confidenceInterval: {
        low: data.confidenceIntervalLow,
        high: data.confidenceIntervalHigh,
      },
      factors: data.factors || [],
      marketComparables: data.marketComparables || [],
      modelVersion: data.modelVersion || 'backend-v1.0',
      generatedAt: data.generatedAt || new Date().toISOString(),
      status: data.status?.toLowerCase() || 'pending',
      reasoning: data.reasoning,
    };
  }

  /**
   * Mock implementation - replace with actual ML service call
   */
  private async getMockRecommendation(unitId: string): Promise<RentRecommendation | null> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));

    return MOCK_RECOMMENDATIONS[unitId] || null;
  }

  /**
   * Cache management
   */
  private getCached(unitId: string): RentRecommendation | null {
    const cached = this.cache.get(unitId);
    if (!cached) return null;

    const age = Date.now() - cached.timestamp;
    const ttl = aiServicesConfig.rentOptimization.cacheTTL * 1000;

    if (age > ttl) {
      this.cache.delete(unitId);
      return null;
    }

    return cached.data;
  }

  private setCached(unitId: string, data: RentRecommendation): void {
    this.cache.set(unitId, {
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Clear cache (useful for testing)
   */
  clearCache(): void {
    this.cache.clear();
  }
}

// Singleton instance
export const rentOptimizationService = new RentOptimizationService();
export default rentOptimizationService;
