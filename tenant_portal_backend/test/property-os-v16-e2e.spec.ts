import request from 'supertest';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PropertyOsModule } from '../src/property-os/property-os.module';
import { RolesGuard } from '../src/auth/roles.guard';
import { SecurityEventsService } from '../src/security-events/security-events.service';
import * as fs from 'fs';
import * as path from 'path';

describe('Property OS v1.6 Endpoint (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.ALLOW_NO_DB = 'true';

    const moduleFixture = await Test.createTestingModule({
      imports: [PropertyOsModule],
    })
      .overrideProvider(SecurityEventsService)
      .useValue({ logEvent: jest.fn().mockResolvedValue(undefined) })
      // The controller is guarded by AuthGuard('jwt') + RolesGuard. These
      // tests exercise the handler's payload-validation logic in isolation,
      // so allow authenticated access through stubbed guards (a real
      // request would carry a JWT; auth itself is covered by auth.* specs).
      .overrideGuard(AuthGuard('jwt'))
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  const getSamplePayload = () => {
    const samplePath = path.resolve(
      __dirname,
      '../../tools/reference-engines/property-os-v1.6/sample_response.json'
    );
    const sample = JSON.parse(fs.readFileSync(samplePath, 'utf8'));
    return { confidence: sample.confidence };
  };

  it('accepts a valid v1.6 confidence payload', () => {
    const payload = getSamplePayload();
    return request(app.getHttpServer())
      .post('/property-os/v16/analyze')
      .send(payload)
      .expect(201)
      .expect((res) => {
        expect(res.body.status).toBe('success');
        expect(res.body.confidence).toBeDefined();
        expect(res.body.confidence.reversal_adjustment).toBeDefined();
      });
  });

  it('rejects payload missing confidence', () => {
    return request(app.getHttpServer())
      .post('/property-os/v16/analyze')
      .send({})
      .expect(400);
  });

  it('rejects payloads that violate confidence invariants', () => {
    const payload = {
      confidence: {
        overall: 0.99,
        evidence: 0.5,
        drift: 0.5,
        unit_richness: 0.5,
      },
    };

    return request(app.getHttpServer())
      .post('/property-os/v16/analyze')
      .send(payload)
      .expect(400);
  });
});
