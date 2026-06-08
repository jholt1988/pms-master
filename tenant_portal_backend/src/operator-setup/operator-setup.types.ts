export interface OperatorSetupSummary {
  generatedAt: string;
  metrics: {
    properties: number;
    units: number;
    vacantUnits: number;
    listedUnits: number;
    unitsMissingDetails: number;
    propertiesMissingAddress: number;
  };
  properties: Array<{
    id: string;
    name: string;
    address: string | null;
    city: string | null;
    state: string | null;
    unitCount: number;
    vacantUnits: number;
    listedUnits: number;
    setupWarnings: string[];
  }>;
}
