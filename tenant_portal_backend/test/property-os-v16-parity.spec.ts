import { PropertyOsService } from '../src/property-os/property-os.service';
import * as fs from 'fs';
import * as path from 'path';

describe('Property OS v1.6 Parity Tests', () => {
  let propertyOsService: PropertyOsService;

  beforeAll(async () => {
    const mockSecurityEvents = { logEvent: jest.fn().mockResolvedValue(undefined) } as any;
    propertyOsService = new PropertyOsService(mockSecurityEvents);
  });

  const loadJsonFixture = (fileName: string) => {
    const filePath = path.resolve(__dirname, '../../tools/reference-engines/property-os-v1.6', fileName);
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  };

  it('should match the reference output for the sample request', async () => {
    const requestPayload = loadJsonFixture('sample_request.json');
    const expectedResponse = loadJsonFixture('sample_response.json');
    const actualResult = await propertyOsService.runV16Analysis(requestPayload);
    expect(actualResult).toHaveProperty('confidence');
    expect(actualResult.confidence).toHaveProperty('overall');
    expect(actualResult.confidence).toHaveProperty('evidence');
    expect(actualResult.confidence).toHaveProperty('drift');
    expect(actualResult.confidence).toHaveProperty('unit_richness');
    expect(actualResult.confidence).toHaveProperty('reversal_adjustment');
    expect(actualResult.confidence.reversal_adjustment).toHaveProperty('disruption_score');
    expect(actualResult.confidence.reversal_adjustment).toHaveProperty('penalty_evidence');
  });
});
