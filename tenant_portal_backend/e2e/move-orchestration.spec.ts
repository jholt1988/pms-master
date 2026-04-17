/**
 * E2E Test Suite - Move Orchestration Flow
 * Tests: Issue 4 - Move-in Readiness State Machine
 * 
 * Coverage:
 * - POST /property/units/:unitId/start-onboarding
 * - POST /property/units/:unitId/complete-move-in
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { PrismaService } from '../src/prisma/prisma.service';
import { PropertyModule } from '../src/property/property.module';
import { AuthModule } from '../src/auth/auth.module';
import * as request from 'supertest';

const TEST_UNIT_ID = 'unit-test-001';
const TEST_ORG_ID = 'org-test-001';

describe('Move Orchestration Flow (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [PropertyModule, AuthModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);
    authToken = 'Bearer test-token';
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /property/units/:unitId/start-onboarding', () => {
    it('should start onboarding for vacant unit', async () => {
      const response = await request(app.getHttpServer())
        .post(`/property/units/${TEST_UNIT_ID}/start-onboarding`)
        .set('Authorization', authToken)
        .set('X-Org-Id', TEST_ORG_ID)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('unitId');
      expect(response.body).toHaveProperty('previousState', 'VACANT');
      expect(response.body).toHaveProperty('newState', 'ONBOARDING');
      expect(response.body).toHaveProperty('startedAt');
    });

    it('should return 404 for non-existent unit', async () => {
      await request(app.getHttpServer())
        .post('/property/units/non-existent-unit/start-onboarding')
        .set('Authorization', authToken)
        .set('X-Org-Id', TEST_ORG_ID)
        .expect(404);
    });
  });

  describe('POST /property/units/:unitId/complete-move-in', () => {
    it('should complete move-in for onboarding unit', async () => {
      const response = await request(app.getHttpServer())
        .post(`/property/units/${TEST_UNIT_ID}/complete-move-in`)
        .set('Authorization', authToken)
        .set('X-Org-Id', TEST_ORG_ID)
        .send({
          notes: 'Tenant moved in successfully. Keys handed over.',
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('unitId');
      expect(response.body).toHaveProperty('previousState', 'ONBOARDING');
      expect(response.body).toHaveProperty('newState', 'OCCUPIED');
      expect(response.body).toHaveProperty('completedAt');
    });

    it('should allow empty notes', async () => {
      const response = await request(app.getHttpServer())
        .post(`/property/units/${TEST_UNIT_ID}/complete-move-in`)
        .set('Authorization', authToken)
        .set('X-Org-Id', TEST_ORG_ID)
        .send({});

      expect(response.body.success).toBe(true);
    });

    it('should return 400 for invalid unit state transition', async () => {
      // Trying to complete move-in for already occupied unit should fail
      await request(app.getHttpServer())
        .post(`/property/units/${TEST_UNIT_ID}/complete-move-in`)
        .set('Authorization', authToken)
        .set('X-Org-Id', TEST_ORG_ID)
        .expect(400);
    });
  });

  describe('Integration: Full Move-in Flow', () => {
    it('should complete full onboarding → move-in flow', async () => {
      // Step 1: Start onboarding
      const startResponse = await request(app.getHttpServer())
        .post(`/property/units/${TEST_UNIT_ID}/start-onboarding`)
        .set('Authorization', authToken)
        .set('X-Org-Id', TEST_ORG_ID);

      expect(startResponse.body.newState).toBe('ONBOARDING');

      // Step 2: Complete move-in
      const completeResponse = await request(app.getHttpServer())
        .post(`/property/units/${TEST_UNIT_ID}/complete-move-in`)
        .set('Authorization', authToken)
        .set('X-Org-Id', TEST_ORG_ID)
        .send({
          notes: 'Move-in completed successfully',
        });

      expect(completeResponse.body.newState).toBe('OCCUPIED');
    });
  });
});