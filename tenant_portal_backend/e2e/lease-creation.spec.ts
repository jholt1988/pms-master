/**
 * E2E Test Suite - Lease Creation Flow
 * Tests: Issue 3 - Lease Signing Flow
 * 
 * Coverage:
 * - POST /leases/:id/generate-document
 * - POST /leases/:id/send-for-signature  
 * - State transitions documented
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { PrismaService } from '../src/prisma/prisma.service';
import { LeaseModule } from '../src/lease/lease.module';
import { AuthModule } from '../src/auth/auth.module';
import * as request from 'supertest';

// Test configuration
const TEST_LEASE_ID = '550e8400-e29b-41d4-a716-446655440001';
const TEST_ORG_ID = 'org-test-001';

describe('Lease Creation Flow (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [LeaseModule, AuthModule],
    })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);
    
    // Get auth token for tests
    authToken = 'Bearer test-token'; // Would be real token in e2e
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /leases/:id/generate-document', () => {
    it('should generate lease document', async () => {
      const response = await request(app.getHttpServer())
        .post(`/leases/${TEST_LEASE_ID}/generate-document`)
        .set('Authorization', authToken)
        .set('X-Org-Id', TEST_ORG_ID)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('leaseId');
      expect(response.body).toHaveProperty('documentUrl');
      expect(response.body).toHaveProperty('status', 'GENERATED');
    });

    it('should return 401 without auth', async () => {
      await request(app.getHttpServer())
        .post(`/leases/${TEST_LEASE_ID}/generate-document`)
        .expect(401);
    });

    it('should return 404 for non-existent lease', async () => {
      await request(app.getHttpServer())
        .post('/leases/non-existent-id/generate-document')
        .set('Authorization', authToken)
        .set('X-Org-Id', TEST_ORG_ID)
        .expect(404);
    });
  });

  describe('POST /leases/:id/send-for-signature', () => {
    it('should send lease for signature', async () => {
      const response = await request(app.getHttpServer())
        .post(`/leases/${TEST_LEASE_ID}/send-for-signature`)
        .set('Authorization', authToken)
        .set('X-Org-Id', TEST_ORG_ID)
        .send({
          signerEmail: 'tenant@test.com',
          signerName: 'Test Tenant',
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('status', 'SENT_FOR_SIGNATURE');
      expect(response.body).toHaveProperty('signerEmail');
      expect(response.body).toHaveProperty('sentAt');
    });

    it('should accept optional signer details', async () => {
      const response = await request(app.getHttpServer())
        .post(`/leases/${TEST_LEASE_ID}/send-for-signature`)
        .set('Authorization', authToken)
        .set('X-Org-Id', TEST_ORG_ID)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
    });
  });

  describe('Integration: Full Lease Creation Flow', () => {
    it('should complete full lease → document → signature flow', async () => {
      // Step 1: Generate document
      const docResponse = await request(app.getHttpServer())
        .post(`/leases/${TEST_LEASE_ID}/generate-document`)
        .set('Authorization', authToken)
        .set('X-Org-Id', TEST_ORG_ID);

      expect(docResponse.body.status).toBe('GENERATED');

      // Step 2: Send for signature
      const signResponse = await request(app.getHttpServer())
        .post(`/leases/${TEST_LEASE_ID}/send-for-signature`)
        .set('Authorization', authToken)
        .set('X-Org-Id', TEST_ORG_ID);

      expect(signResponse.body.status).toBe('SENT_FOR_SIGNATURE');
      expect(signResponse.body).toHaveProperty('expiresAt');
    });
  });
});