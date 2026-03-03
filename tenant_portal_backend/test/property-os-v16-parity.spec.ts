import { Test } from '@nestjs/testing';
import { PropertyOsService } from '../src/property-os/property-os.service';
import { PropertyOsModule } from '../src/property-os/property-os.module';
import * as fs from 'fs';
import * as path from 'path';

describe('Property OS v1.6 Parity Tests', () => {
  let propertyOsService: PropertyOsService;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [PropertyOsModule],
    }).compile();

    propertyOsService = moduleFixture.get<PropertyOsService>(PropertyOsService);
  });

  const loadJsonFixture = (fileName: string) => {
    const filePath = path.resolve(
      __dirname,
      '../../tools/reference-engines/property-os-v1.6',
      fileName
    );
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  };

  it('should match the reference output for the sample request', async () => {
    const requestPayload = loadJsonFixture('sample_request.json');
    const expectedResponse = loadJsonFixture('sample_response.json');

    // For now, we are testing the mock implementation in the service.
    // This test will fail until the real logic is implemented.
    // The goal here is to establish the test framework.
    const actualResult = await propertyOsService.runV16Analysis(requestPayload);

    // Using .toMatchObject() to allow for extra fields if necessary,
    // and .toBeCloseTo() for floating point comparisons.
    expect(actualResult.confidence.overall).toBeCloseTo(expectedResponse.confidence.overall, 5);
    expect(actualResult.confidence.evidence).toBeCloseTo(expectedResponse.confidence.evidence, 5);
    expect(actualResult.confidence.drift).toBeCloseTo(expectedResponse.confidence.drift, 5);
    expect(actualResult.confidence.unit_richness).toBeCloseTo(expectedResponse.confidence.unit_richness, 5);
    
    // Check reversal adjustment with some tolerance
    const actualReversal = actualResult.confidence.reversal_adjustment;
    const expectedReversal = expectedResponse.confidence.reversal_adjustment;
    expect(actualReversal.disruption_score).toBeCloseTo(expectedReversal.disruption_score, 5);
    expect(actualReversal.penalty_evidence).toBeCloseTo(expectedReversal.penalty_evidence, 5);
  });
});
