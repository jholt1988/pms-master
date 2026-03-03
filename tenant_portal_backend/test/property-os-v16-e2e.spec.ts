import * as request from 'supertest';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import * as fs from 'fs';
import * as path from 'path';

describe('Property OS v1.6 Endpoint (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const getSamplePayload = (overrides = {}) => {
    const samplePath = path.resolve(
      __dirname,
      '../../tools/reference-engines/property-os-v1.6/sample_response.json'
    );
    const sample = JSON.parse(fs.readFileSync(samplePath, 'utf8'));
    
    // The sample response itself is the payload for our endpoint
    const payload = { confidence: sample.confidence };

    // Apply any overrides for testing invalid cases
    if (overrides.confidence) {
      payload.confidence = { ...payload.confidence, ...overrides.confidence };
    }

    return payload;
  };

  it('should accept a valid v1.6 confidence payload', () => {
    const payload = getSamplePayload();
    return request(app.getHttpServer())
      .post('/property-os/v16/analyze')
      .send(payload)
      .expect(201)
      .expect((res) => {
        expect(res.body.status).toBe('success');
        expect(res.body.message).toContain('Data validated');
        expect(res.body.receivedConfidence).toBeDefined();
      });
  });

  it('should reject a payload with a missing confidence object', () => {
    return request(app.getHttpServer())
      .post('/property-os/v16/analyze')
      .send({})
      .expect(400)
      .expect((res) => {
        expect(res.body.message).toContain('Missing required "confidence" property');
      });
  });

  it('should reject a payload that violates the v1.6 schema (e.g., missing reversal_adjustment)', () => {
    const payload = getSamplePayload();
    delete (payload.confidence as any).reversal_adjustment;
    
    return request(app.getHttpServer())
      .post('/property-os/v16/analyze')
      .send(payload)
      .expect(400)
      .expect((res) => {
        expect(res.body.message).toContain('Property OS v1.6 Contract Violation');
      });
  });

  it('should reject a payload that violates the mathematical invariants', () => {
    // This payload has a valid shape but breaks the overall = evidence * drift * unit_richness rule
    const invalidConfidence = {
      overall: 0.99, // Should be 0.5 * 0.5 * 0.5 = 0.125
      evidence: 0.5,
      drift: 0.5,
      unit_richness: 0.5,
      reversal_adjustment: getSamplePayload().confidence.reversal_adjustment,
    };
    const payload = { confidence: invalidConfidence };

    return request(app.getHttpServer())
      .post('/property-os/v16/analyze')
      .send(payload)
      .expect(400)
      .expect((res) => {
        expect(res.body.message).toContain('Invalid confidence invariant');
      });
  });
});
