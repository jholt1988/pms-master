import axios from 'axios';
import { RentOptimizationService } from '../src/rent-optimization/rent-optimization.service';

describe('RentOptimizationService Property OS v1.6 confidence validation', () => {
  const mockPrisma = {} as any;

  const unit = {
    id: 'U-1',
    bedrooms: 2,
    bathrooms: 1,
    squareFeet: 900,
    hasParking: true,
    hasLaundry: false,
    hasHvac: true,
    isFurnished: false,
    petsAllowed: true,
    floor: 2,
    lease: { rentAmount: 1200 },
    property: {
      type: 'APARTMENT',
      address: '123 Main St',
      city: 'Wichita',
      state: 'KS',
      zipCode: '67202',
      hasPool: false,
      hasGym: false,
      yearBuilt: 2001,
    },
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('rejects invalid v1.6 confidence payload', async () => {
    const service = new RentOptimizationService(mockPrisma);

    jest.spyOn(axios, 'post').mockResolvedValue({
      data: {
        unit_id: 'U-1',
        current_rent: 1200,
        recommended_rent: 1250,
        confidence_interval_low: 1200,
        confidence_interval_high: 1300,
        confidence_score: 0.8,
        factors: [],
        market_comparables: [],
        reasoning: 'test',
        model_version: '1.6',
        market_trend: 'stable',
        confidence: {
          overall: 0.9,
          evidence: 0.5,
          drift: 0.5,
          unit_richness: 0.5,
          // reversal_adjustment intentionally missing
        },
      },
    } as any);

    await expect((service as any).callMLService(unit)).rejects.toBeDefined();
  });

  it('accepts valid v1.6 confidence payload', async () => {
    const service = new RentOptimizationService(mockPrisma);

    jest.spyOn(axios, 'post').mockResolvedValue({
      data: {
        unit_id: 'U-1',
        current_rent: 1200,
        recommended_rent: 1250,
        confidence_interval_low: 1200,
        confidence_interval_high: 1300,
        confidence_score: 0.8,
        factors: [],
        market_comparables: [],
        reasoning: 'test',
        model_version: '1.6',
        market_trend: 'stable',
        confidence: {
          overall: 0.2,
          evidence: 0.5,
          drift: 0.8,
          unit_richness: 0.5,
          reversal_adjustment: {
            as_of: '2026-03-01T00:00:00Z',
            half_life_days: 30,
            disruption_score: 0.2,
            penalty_evidence: 0.8,
            penalty_drift: 0.9,
            penalty_unit_richness: 0.9,
            applied: true,
            event_count_considered: 1,
            amount_ratio_considered: 0.1,
            sys: 0.2,
          },
        },
      },
    } as any);

    const out = await (service as any).callMLService(unit);
    expect(out.recommendedRent).toBe(1250);
    expect(out.modelVersion).toBe('1.6');
  });
});
