// apps/api/src/inspections/dto/estimate-result.dto.ts
export class ActuarialEstimateDto {
  inspectionId: string;
  totalEstimatedCost: number;
  riskScore: number; // 0-100
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  lineItems: Array<{
    category: string;
    cost: number;
    description: string;
  }>;
}