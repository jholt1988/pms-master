import OpenAI from 'openai';

// Trade-specific depreciation rates (per year)
export const DEPRECIATION_RATES = {
  hvac: 0.12,          // 12% per year
  plumbing: 0.08,      // 8% per year
  electrical: 0.10,    // 10% per year
  flooring: 0.15,      // 15% per year
  locksmith: 0.10,     // 10% per year
  painter: 0.20,       // 20% per year
  carpentry: 0.08,     // 8% per year
  roofing: 0.05,       // 5% per year
  fencing: 0.10,       // 10% per year
  landscaping: 0.25,   // 25% per year
  pest_control: 1.0,   // 100% (annual service)
  foundation: 0.02,    // 2% per year
  general: 0.10,       // 10% per year (default)
};

// Condition-based adjustment factors
export const CONDITION_ADJUSTMENTS = {
  EXCELLENT: 0.00,     // 0% additional cost
  GOOD: 0.15,          // 15% additional cost
  FAIR: 0.30,          // 30% additional cost
  POOR: 0.45,          // 45% additional cost
  DAMAGED: 0.60,       // 60% additional cost
  NON_FUNCTIONAL: 0.75, // 75% additional cost
};

// Average lifetime by category (years)
export const AVERAGE_LIFETIMES = {
  hvac: 15,
  plumbing: 20,
  electrical: 30,
  flooring: 10,
  appliances: 12,
  roofing: 25,
  windows: 20,
  doors: 25,
  painting: 5,
  landscaping: 3,
  general: 15,
};

export interface UserLocation {
  city: string;
  region: string;
  country: string;
}

export interface InventoryItem {
  item_description: string;
  location: string;
  category: string;
  condition: string;
  estimated_age_years?: number;
  action_needed: 'repair' | 'replace';
  notes?: string;
}

export interface EstimateResult {
  estimate_summary: {
    total_labor_cost: number;
    total_material_cost: number;
    total_project_cost: number;
    items_to_repair: number;
    items_to_replace: number;
  };
  line_items: Array<{
    item_description: string;
    location: string;
    category: string;
    action_type: 'repair' | 'replace';
    labor_hours: number;
    labor_rate_per_hour: number;
    labor_cost: number;
    material_cost: number;
    total_cost: number;
    original_cost?: number;
    depreciated_value?: number;
    depreciation_rate_per_year?: number;
    condition_adjustment_percent?: number;
    average_lifetime_years?: number;
    estimated_age_years?: number;
    repair_instructions?: string[];
    notes?: string;
  }>;
}

/**
 * Labor Cost Tool - Calculate trade-specific labor rates
 */
export function createLaborCostTool(userLocation: UserLocation) {
  return {
    type: 'function' as const,
    function: {
      name: 'calculate_labor_cost',
      description: 'Calculate labor costs for specific trades in the user location',
      parameters: {
        type: 'object',
        properties: {
          trade_category: {
            type: 'string',
            description: 'Trade category (hvac, plumbing, electrical, etc.)',
            enum: Object.keys(DEPRECIATION_RATES),
          },
          hours_required: {
            type: 'number',
            description: 'Estimated hours required for the work',
          },
          complexity: {
            type: 'string',
            description: 'Work complexity level',
            enum: ['simple', 'moderate', 'complex'],
          },
        },
        required: ['trade_category', 'hours_required'],
      },
    },
  };
}

/**
 * Material Cost Tool - Estimate current material pricing
 */
export function createMaterialCostTool(userLocation: UserLocation) {
  return {
    type: 'function' as const,
    function: {
      name: 'calculate_material_cost',
      description: 'Calculate material costs for repair/replacement items',
      parameters: {
        type: 'object',
        properties: {
          item_type: {
            type: 'string',
            description: 'Type of item/material needed',
          },
          quantity: {
            type: 'number',
            description: 'Quantity or units needed',
          },
          quality_grade: {
            type: 'string',
            description: 'Quality grade of materials',
            enum: ['basic', 'standard', 'premium'],
          },
          item_size: {
            type: 'string',
            description: 'Size or dimensions if applicable',
          },
        },
        required: ['item_type', 'quantity'],
      },
    },
  };
}

/**
 * Depreciation Tool - Calculate depreciated value
 */
export function createDepreciationTool() {
  return {
    type: 'function' as const,
    function: {
      name: 'calculate_depreciation',
      description: 'Calculate depreciated value based on age and category',
      parameters: {
        type: 'object',
        properties: {
          original_cost: {
            type: 'number',
            description: 'Original purchase/installation cost',
          },
          current_age_years: {
            type: 'number',
            description: 'Current age of the item in years',
          },
          category: {
            type: 'string',
            description: 'Item category for depreciation rate',
            enum: Object.keys(DEPRECIATION_RATES),
          },
          condition: {
            type: 'string',
            description: 'Current condition of the item',
            enum: Object.keys(CONDITION_ADJUSTMENTS),
          },
        },
        required: ['original_cost', 'current_age_years', 'category', 'condition'],
      },
    },
  };
}

/**
 * Lifetime Analysis Tool - Determine expected lifetime and replacement timing
 */
export function createLifetimeTool() {
  return {
    type: 'function' as const,
    function: {
      name: 'analyze_lifetime',
      description: 'Analyze expected lifetime and determine repair vs replace decision',
      parameters: {
        type: 'object',
        properties: {
          category: {
            type: 'string',
            description: 'Item category',
            enum: Object.keys(AVERAGE_LIFETIMES),
          },
          current_age_years: {
            type: 'number',
            description: 'Current age in years',
          },
          condition: {
            type: 'string',
            description: 'Current condition',
            enum: Object.keys(CONDITION_ADJUSTMENTS),
          },
          repair_cost: {
            type: 'number',
            description: 'Estimated repair cost',
          },
          replacement_cost: {
            type: 'number',
            description: 'Estimated replacement cost',
          },
        },
        required: ['category', 'current_age_years', 'condition', 'repair_cost', 'replacement_cost'],
      },
    },
  };
}

/**
 * Tool execution handlers
 */
export class EstimateToolHandler {
  constructor(private userLocation: UserLocation) {}

  async handleLaborCost(args: any): Promise<any> {
    const { trade_category, hours_required, complexity = 'moderate' } = args;
    
    // Base rates for different trades (will be adjusted by location and complexity)
    const baseRates = {
      hvac: 85,
      plumbing: 75,
      electrical: 80,
      carpentry: 65,
      painter: 45,
      roofing: 70,
      flooring: 55,
      landscaping: 35,
      general: 60,
    };

    const complexityMultipliers = {
      simple: 0.8,
      moderate: 1.0,
      complex: 1.3,
    };

    const baseRate = baseRates[trade_category as keyof typeof baseRates] || baseRates.general;
    const locationMultiplier = 1.0; // Could be enhanced with real location data
    const complexityMultiplier = complexityMultipliers[complexity as keyof typeof complexityMultipliers];

    const hourlyRate = baseRate * locationMultiplier * complexityMultiplier;
    const totalCost = hourlyRate * hours_required;

    return {
      hourly_rate: Math.round(hourlyRate * 100) / 100,
      total_labor_cost: Math.round(totalCost * 100) / 100,
      hours: hours_required,
      trade: trade_category,
      complexity,
      location: `${this.userLocation.city}, ${this.userLocation.region}`,
    };
  }

  async handleMaterialCost(args: any): Promise<any> {
    const { item_type, quantity, quality_grade = 'standard', item_size } = args;
    
    // Base material costs (per unit) - simplified for demo
    const baseCosts = {
      'paint': 35,
      'toilet': 200,
      'faucet': 150,
      'flooring_sqft': 8,
      'electrical_outlet': 25,
      'light_fixture': 80,
      'cabinet_door': 45,
      'appliance_refrigerator': 800,
      'hvac_filter': 25,
      'door': 250,
      'window': 400,
    };

    const qualityMultipliers = {
      basic: 0.7,
      standard: 1.0,
      premium: 1.5,
    };

    // Try to match item type or use a default
    const matchedType = Object.keys(baseCosts).find(key => 
      item_type.toLowerCase().includes(key.replace('_', ' '))
    );
    
    const baseCost = matchedType ? baseCosts[matchedType as keyof typeof baseCosts] : 100;
    const qualityMultiplier = qualityMultipliers[quality_grade as keyof typeof qualityMultipliers];
    
    const unitCost = baseCost * qualityMultiplier;
    const totalCost = unitCost * quantity;

    return {
      unit_cost: Math.round(unitCost * 100) / 100,
      total_material_cost: Math.round(totalCost * 100) / 100,
      quantity,
      quality_grade,
      item_type,
      size: item_size,
    };
  }

  async handleDepreciation(args: any): Promise<any> {
    const { original_cost, current_age_years, category, condition } = args;
    
    const depreciationRate = DEPRECIATION_RATES[category as keyof typeof DEPRECIATION_RATES] || DEPRECIATION_RATES.general;
    const conditionAdjustment = CONDITION_ADJUSTMENTS[condition as keyof typeof CONDITION_ADJUSTMENTS] || 0;
    
    // Calculate straight-line depreciation
    const depreciationAmount = original_cost * depreciationRate * current_age_years;
    const depreciatedValue = Math.max(0, original_cost - depreciationAmount);
    
    // Apply condition adjustment
    const conditionAdjustedValue = depreciatedValue * (1 - conditionAdjustment);
    
    return {
      original_cost,
      depreciated_value: Math.round(depreciatedValue * 100) / 100,
      condition_adjusted_value: Math.round(conditionAdjustedValue * 100) / 100,
      depreciation_rate_per_year: depreciationRate,
      condition_adjustment_percent: conditionAdjustment,
      years_depreciated: current_age_years,
      remaining_value_percent: Math.round((conditionAdjustedValue / original_cost) * 100),
    };
  }

  async handleLifetimeAnalysis(args: any): Promise<any> {
    const { category, current_age_years, condition, repair_cost, replacement_cost } = args;
    
    const averageLifetime = AVERAGE_LIFETIMES[category as keyof typeof AVERAGE_LIFETIMES] || AVERAGE_LIFETIMES.general;
    const remainingLifeYears = Math.max(0, averageLifetime - current_age_years);
    const lifePercentRemaining = remainingLifeYears / averageLifetime;
    
    // Decision logic: repair vs replace
    const costEffectivenessRatio = repair_cost / replacement_cost;
    const conditionFactor = CONDITION_ADJUSTMENTS[condition as keyof typeof CONDITION_ADJUSTMENTS] || 0;
    
    // Recommend replacement if:
    // - Item is past 80% of its lifetime AND repair cost > 40% of replacement cost
    // - Item is in poor/damaged condition AND repair cost > 60% of replacement cost
    // - Repair cost > 75% of replacement cost regardless of age
    
    let recommendation = 'repair';
    let reasoning = 'Cost-effective repair option';
    
    if (costEffectivenessRatio > 0.75) {
      recommendation = 'replace';
      reasoning = 'Repair cost too high relative to replacement';
    } else if (lifePercentRemaining < 0.2 && costEffectivenessRatio > 0.4) {
      recommendation = 'replace';
      reasoning = 'Item near end of life, replacement more cost-effective';
    } else if (conditionFactor > 0.45 && costEffectivenessRatio > 0.6) {
      recommendation = 'replace';
      reasoning = 'Poor condition makes repair less cost-effective';
    }
    
    return {
      recommendation,
      reasoning,
      average_lifetime_years: averageLifetime,
      current_age_years,
      remaining_life_years: remainingLifeYears,
      life_percent_remaining: Math.round(lifePercentRemaining * 100),
      cost_effectiveness_ratio: Math.round(costEffectivenessRatio * 100) / 100,
      repair_cost,
      replacement_cost,
    };
  }
}