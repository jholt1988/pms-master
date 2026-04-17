/**
 * E2E Test Suite - Maintenance Request → Assignment
 * Tests: Issue 6 - Maintenance Emergency Dispatch
 * 
 * Coverage:
 * - POST /maintenance/:id/assign-vendor
 * - POST /maintenance/:id/notify-tenant
 * - POST /maintenance/:id/notify-owner
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { PrismaService } from '../src/prisma/prisma.service';
import { MaintenanceModule } from '../src/maintenance/maintenance.module';
import { AuthModule } from '../src/auth/auth.module';
import * as request from 'supertest';

const TEST_MAINTENANCE_ID = 'maintenance-test-001';
const TEST_VENDOR_ID = 'vendor-test-001';
const TEST_ORG_ID = 'org-test-001';

describe('Maintenance Request → Assignment Flow (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [MaintenanceModule, AuthModule],
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

  describe('POST /maintenance/:id/assign-vendor', () => {
    it('should assign vendor to maintenance request', async () => {
      const response = await request(app.getHttpServer())
        .post(`/maintenance/${TEST_MAINTENANCE_ID}/assign-vendor`)
        .set('Authorization', authToken)
        .set('X-Org-Id', TEST_ORG_ID)
        .send({
          vendorId: TEST_VENDOR_ID,
          notes: 'Urgent repair - priority',
        })
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('vendorId');
      expect(response.body).toHaveProperty('status', 'ASSIGNED');
    });

    it('should return 400 for missing vendorId', async () => {
      await request(app.getHttpServer())
        .post(`/maintenance/${TEST_MAINTENANCE_ID}/assign-vendor`)
        .set('Authorization', authToken)
        .set('X-Org-Id', TEST_ORG_ID)
        .send({})
        .expect(400);
    });
  });

  describe('POST /maintenance/:id/notify-tenant', () => {
    it('should notify tenant about maintenance update', async () => {
      const response = await request(app.getHttpServer())
        .post(`/maintenance/${TEST_MAINTENANCE_ID}/notify-tenant`)
        .set('Authorization', authToken)
        .set('X-Org-Id', TEST_ORG_ID)
        .send({
          message: 'A technician has been dispatched to your unit.',
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Tenant notification sent');
    });
  });

  describe('POST /maintenance/:id/notify-owner', () => {
    it('should notify owner about maintenance update', async () => {
      const response = await request(app.getHttpServer())
        .post(`/maintenance/${TEST_MAINTENANCE_ID}/notify-owner`)
        .set('Authorization', authToken)
        .set('X-Org-Id', TEST_ORG_ID)
        .send({
          message: 'Emergency repair dispatched for unit 101.',
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Owner notification sent');
    });
  });

  describe('Integration: Full Dispatch Flow', () => {
    it('should complete vendor assignment → notifications', async () => {
      // Step 1: Assign vendor
      const assignResponse = await request(app.getHttpServer())
        .post(`/maintenance/${TEST_MAINTENANCE_ID}/assign-vendor`)
        .set('Authorization', authToken)
        .set('X-Org-Id', TEST_ORG_ID)
        .send({
          vendorId: TEST_VENDOR_ID,
        });

      expect(assignResponse.body.status).toBe('ASSIGNED');

      // Step 2: Notify tenant
      const tenantResponse = await request(app.getHttpServer())
        .post(`/maintenance/${TEST_MAINTENANCE_ID}/notify-tenant`)
        .set('Authorization', authToken)
        .set('X-Org-Id', TEST_ORG_ID)
        .send({
          message: 'Technician on the way!',
        });

      expect(tenantResponse.body.success).toBe(true);

      // Step 3: Notify owner
      const ownerResponse = await request(app.getHttpServer())
        .post(`/maintenance/${TEST_MAINTENANCE_ID}/notify-owner`)
        .set('Authorization', authToken)
        .set('X-Org-Id', TEST_ORG_ID)
        .send({
          message: 'Repair in progress',
        });

      expect(ownerResponse.body.success).toBe(true);
    });
  });
});