import OpenAI from 'openai';
import {
  UserLocation,
  InventoryItem,
  EstimateResult,
  createLaborCostTool,
  createMaterialCostTool,
  createDepreciationTool,
  createLifetimeTool,
  EstimateToolHandler,
} from './estimate-tools';

export class EnhancedEstimateAgent {
  private openai: OpenAI;
  private toolHandler: EstimateToolHandler;

  constructor(
    private userLocation: UserLocation,
    apiKey: string = process.env.OPENAI_API_KEY || ''
  ) {
    if (!apiKey) {
      throw new Error('OpenAI API key is required');
    }

    this.openai = new OpenAI({ apiKey });
    this.toolHandler = new EstimateToolHandler(userLocation);
  }

  /**
   * Generate comprehensive repair estimate from inventory items
   * Follows 6-step process: labor rates → material costs → depreciation → condition adjustments → original cost → lifetime analysis
   */
  async generateEstimate(inventoryItems: InventoryItem[]): Promise<EstimateResult> {
    const tools = [
      createLaborCostTool(this.userLocation),
      createMaterialCostTool(this.userLocation),
      createDepreciationTool(),
      createLifetimeTool(),
    ];

    const systemPrompt = `You are an enhanced property repair estimator following a precise 6-step process:

1. Search average per-hour labor rates by trade (${this.userLocation.city}, ${this.userLocation.region})
2. Search current material prices
3. Calculate average per-year depreciation for each item
4. Adjust for condition status with incremental penalties
5. Return to original cost basis
6. Search and return average lifetime of each item

For each inventory item, you must:
- Determine if repair or replacement is more cost-effective
- Calculate accurate labor and material costs
- Apply depreciation and condition adjustments
- Provide detailed repair instructions
- Return comprehensive cost breakdown

CRITICAL: Return ONLY valid JSON in this exact format:
{
  "estimate_summary": {
    "total_labor_cost": number,
    "total_material_cost": number,
    "total_project_cost": number,
    "items_to_repair": number,
    "items_to_replace": number
  },
  "line_items": [
    {
      "item_description": "string",
      "location": "string",
      "category": "string",
      "action_type": "repair|replace",
      "labor_hours": number,
      "labor_rate_per_hour": number,
      "labor_cost": number,
      "material_cost": number,
      "total_cost": number,
      "original_cost": number,
      "depreciated_value": number,
      "depreciation_rate_per_year": number,
      "condition_adjustment_percent": number,
      "average_lifetime_years": number,
      "estimated_age_years": number,
      "repair_instructions": ["step1", "step2"],
      "notes": "string"
    }
  ]
}

NO markdown formatting, NO code blocks, NO explanatory text - ONLY the JSON object.`;

    const userPrompt = `Generate detailed repair estimate for these property items:

${inventoryItems.map((item, index) => `
Item ${index + 1}:
- Description: ${item.item_description}
- Location: ${item.location}
- Category: ${item.category}
- Condition: ${item.condition}
- Age: ${item.estimated_age_years || 'Unknown'} years
- Action Needed: ${item.action_needed}
- Notes: ${item.notes || 'None'}
`).join('\n')}

Property Location: ${this.userLocation.city}, ${this.userLocation.region}, ${this.userLocation.country}

Process each item through all 6 steps and return the complete JSON estimate.`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        tools,
        tool_choice: 'auto',
        max_tokens: 4000,
        temperature: 0.1,
      });

      // Handle tool calls if any
      const message = completion.choices[0].message;
      if (message.tool_calls) {
        await this.handleToolCalls(message.tool_calls);
      }

      // Extract and parse the JSON response
      let responseContent = message.content;
      if (!responseContent) {
        throw new Error('No response content received from OpenAI');
      }

      // Clean up response - remove any markdown formatting
      responseContent = responseContent.replace(/```json\n?|\n?```/g, '').trim();

      // Parse the JSON response
      const estimateResult: EstimateResult = JSON.parse(responseContent);

      // Validate the response structure
      this.validateEstimateResult(estimateResult);

      // Calculate totals and ensure consistency
      this.recalculateTotals(estimateResult);

      return estimateResult;
    } catch (error) {
      console.error('Error generating estimate:', error);
      
      // Return a fallback estimate if AI fails
      return this.generateFallbackEstimate(inventoryItems);
    }
  }

  /**
   * Handle tool calls from OpenAI
   */
  private async handleToolCalls(toolCalls: any[]): Promise<void> {
    for (const toolCall of toolCalls) {
      const { name, arguments: args } = toolCall.function;
      const parsedArgs = JSON.parse(args);

      try {
        let result;
        switch (name) {
          case 'calculate_labor_cost':
            result = await this.toolHandler.handleLaborCost(parsedArgs);
            break;
          case 'calculate_material_cost':
            result = await this.toolHandler.handleMaterialCost(parsedArgs);
            break;
          case 'calculate_depreciation':
            result = await this.toolHandler.handleDepreciation(parsedArgs);
            break;
          case 'analyze_lifetime':
            result = await this.toolHandler.handleLifetimeAnalysis(parsedArgs);
            break;
          default:
            console.warn(`Unknown tool call: ${name}`);
            continue;
        }

        // Tool results would normally be sent back to OpenAI in a multi-turn conversation
        // For now, we'll log them for debugging
        console.log(`Tool ${name} result:`, result);
      } catch (error) {
        console.error(`Error executing tool ${name}:`, error);
      }
    }
  }

  /**
   * Validate estimate result structure
   */
  private validateEstimateResult(result: EstimateResult): void {
    if (!result.estimate_summary || !result.line_items) {
      throw new Error('Invalid estimate result structure');
    }

    if (!Array.isArray(result.line_items)) {
      throw new Error('Line items must be an array');
    }

    // Validate required fields in summary
    const summary = result.estimate_summary;
    const requiredSummaryFields = [
      'total_labor_cost',
      'total_material_cost',
      'total_project_cost',
      'items_to_repair',
      'items_to_replace',
    ];

    for (const field of requiredSummaryFields) {
      if (typeof summary[field as keyof typeof summary] !== 'number') {
        throw new Error(`Missing or invalid summary field: ${field}`);
      }
    }

    // Validate line items
    for (const item of result.line_items) {
      const requiredFields = [
        'item_description',
        'location',
        'category',
        'action_type',
        'labor_cost',
        'material_cost',
        'total_cost',
      ];

      for (const field of requiredFields) {
        if (item[field as keyof typeof item] === undefined || item[field as keyof typeof item] === null) {
          throw new Error(`Missing line item field: ${field}`);
        }
      }
    }
  }

  /**
   * Recalculate totals to ensure consistency
   */
  private recalculateTotals(result: EstimateResult): void {
    let totalLaborCost = 0;
    let totalMaterialCost = 0;
    let totalProjectCost = 0;
    let itemsToRepair = 0;
    let itemsToReplace = 0;

    for (const item of result.line_items) {
      totalLaborCost += item.labor_cost || 0;
      totalMaterialCost += item.material_cost || 0;
      totalProjectCost += item.total_cost || 0;

      if (item.action_type === 'repair') {
        itemsToRepair++;
      } else if (item.action_type === 'replace') {
        itemsToReplace++;
      }

      // Ensure total_cost equals labor_cost + material_cost
      item.total_cost = (item.labor_cost || 0) + (item.material_cost || 0);
    }

    // Update summary with calculated totals
    result.estimate_summary.total_labor_cost = Math.round(totalLaborCost * 100) / 100;
    result.estimate_summary.total_material_cost = Math.round(totalMaterialCost * 100) / 100;
    result.estimate_summary.total_project_cost = Math.round(totalProjectCost * 100) / 100;
    result.estimate_summary.items_to_repair = itemsToRepair;
    result.estimate_summary.items_to_replace = itemsToReplace;
  }

  /**
   * Generate fallback estimate if AI fails
   */
  private generateFallbackEstimate(inventoryItems: InventoryItem[]): EstimateResult {
    const lineItems = inventoryItems.map((item, index) => {
      // Basic fallback cost estimation
      const baseLaborCost = item.action_needed === 'replace' ? 200 : 100;
      const baseMaterialCost = item.action_needed === 'replace' ? 300 : 100;
      
      return {
        item_description: item.item_description,
        location: item.location,
        category: item.category,
        action_type: item.action_needed,
        labor_hours: item.action_needed === 'replace' ? 4 : 2,
        labor_rate_per_hour: 75,
        labor_cost: baseLaborCost,
        material_cost: baseMaterialCost,
        total_cost: baseLaborCost + baseMaterialCost,
        original_cost: 500,
        depreciated_value: 300,
        depreciation_rate_per_year: 0.10,
        condition_adjustment_percent: 0.20,
        average_lifetime_years: 15,
        estimated_age_years: item.estimated_age_years || 5,
        repair_instructions: [`Assess ${item.item_description}`, `Perform ${item.action_needed} work`],
        notes: 'Fallback estimate - manual review recommended',
      };
    });

    const totalLaborCost = lineItems.reduce((sum, item) => sum + item.labor_cost, 0);
    const totalMaterialCost = lineItems.reduce((sum, item) => sum + item.material_cost, 0);
    const itemsToRepair = lineItems.filter(item => item.action_type === 'repair').length;
    const itemsToReplace = lineItems.filter(item => item.action_type === 'replace').length;

    return {
      estimate_summary: {
        total_labor_cost: totalLaborCost,
        total_material_cost: totalMaterialCost,
        total_project_cost: totalLaborCost + totalMaterialCost,
        items_to_repair: itemsToRepair,
        items_to_replace: itemsToReplace,
      },
      line_items: lineItems,
    };
  }
}

/**
 * Factory function to create estimate agent
 */
export function createEnhancedEstimateAgent(userLocation: UserLocation): EnhancedEstimateAgent {
  return new EnhancedEstimateAgent(userLocation);
}