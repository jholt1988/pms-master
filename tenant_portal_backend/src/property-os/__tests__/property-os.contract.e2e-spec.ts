import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { PropertyOsModule } from '../property-os.module';
import * as fs from 'fs';
import * as path from 'path';

describe('PropertyOsController (v1.6 Contract)', () => {
  let app: INestApplication;
  let validPayload: any;
  let sampleResponse: any;

  beforeAll(async () => {
    // Load sample data from the contracts directory
    const sampleRequestPath = path.join(process.cwd(), 'tools/reference-engines/property-os-v1.6/sample_request.json');
    validPayload = JSON.parse(fs.readFileSync(sampleRequestPath, 'utf8'));

    const sampleResponsePath = path.join(process.cwd(), 'tools/reference-engines/property-os-v1.6/sample_response.json');
    sampleResponse = JSON.parse(fs.readFileSync(sampleResponsePath, 'utf8'));

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [PropertyOsModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('should accept a valid v1.6 payload', () => {
    return request(app.getHttpServer())
      .post('/property-os/v16/analyze')
      .send(validPayload)
      .expect(200)
      .expect((res) => {
        // Check for key properties from the sample response
        expect(res.body).toHaveProperty('status', 'success');
        expect(res.body).toHaveProperty('confidence');
        expect(res.body.confidence).toHaveProperty('reversal_adjustment', sampleResponse.confidence.reversal_adjustment);
      });
  });

  it('should reject a payload with a missing required field (property_id)', () => {
    const invalidPayload = { ...validPayload };
    delete invalidPayload.property_id;

    return request(app.getHttpServer())
      .post('/property-os/v16/analyze')
      .send(invalidPayload)
      .expect(400);
  });

  it('should reject a payload with an invalid data type (direct_cost_usd)', () => {
    const invalidPayload = { ...validPayload, direct_cost_usd: 'not-a-number' };

    return request(app.getHttpServer())
      .post('/property-os/v16/analyze')
      .send(invalidPayload)
      .expect(400);
  });

  // Test for a key invariant
  it('should require confidence.reversal_adjustment in the response', async () => {
      // This test relies on the service implementation honoring the contract.
      // We are checking the shape of the actual response from the endpoint.
      const response = await request(app.getHttpServer())
        .post('/property-os/v16/analyze')
        .send(validPayload);
      
      expect(response.body.confidence).toBeDefined();
      expect(response.body.confidence.reversal_adjustment).toBeDefined();
  });

  afterAll(async () => {
    await app.close();
  });
});
