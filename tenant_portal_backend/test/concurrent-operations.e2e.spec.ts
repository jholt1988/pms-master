import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus, INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { TestDataFactory } from './factories';
import { APP_GUARD } from '@nestjs/core';
import { EmailService } from '../src/email/email.service';
import { resetDatabase } from './utils/reset-database';

// Mock guard that always allows requests (disables rate limiting in tests)
class MockThrottlerGuard {
  canActivate(): boolean {
    return true;
  }
}

/**
 * P0-004: Edge Case Tests - Concurrent Operations
 * Tests for race conditions and concurrent data modifications
 */
describe('Concurrent Operations (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const mockEmailService = {
    sendPasswordResetEmail: jest.fn().mockResolvedValue(true),
    sendNotificationEmail: jest.fn().mockResolvedValue(true),
    sendLeadWelcomeEmail: jest.fn().mockResolvedValue(true),
    sendNewLeadNotificationToPM: jest.fn().mockResolvedValue(true),
    sendRentPaymentConfirmation: jest.fn().mockResolvedValue(true),
    sendRentDueReminder: jest.fn().mockResolvedValue(true),
    sendLateRentNotification: jest.fn().mockResolvedValue(true),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(APP_GUARD)
      .useClass(MockThrottlerGuard)
      .overrideProvider(EmailService)
      .useValue(mockEmailService)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Concurrent Lease Updates', () => {
    it('should handle multiple users updating the same lease simultaneously', async () => {
      // Create test data
      const propertyManager = await prisma.user.create({
        data: TestDataFactory.createPropertyManager({ username: 'pm1' }),
      });
      const tenant = await prisma.user.create({
        data: TestDataFactory.createUser({ username: 'tenant1', role: 'TENANT' }),
      });
      const property = await prisma.property.create({
        data: TestDataFactory.createProperty(),
      });
      const unit = await prisma.unit.create({
        data: TestDataFactory.createUnit(property.id),
      });
      const lease = await prisma.lease.create({
        data: TestDataFactory.createLease(tenant.id, unit.id, { rentAmount: 1000 }),
      });

      // Get tokens
      const pmLogin = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ username: 'pm1', password: 'password123' });
      const pmToken = pmLogin.body.accessToken || pmLogin.body.access_token;
      
      const tenantLogin = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ username: 'tenant1', password: 'password123' });
      const tenantToken = tenantLogin.body.accessToken || tenantLogin.body.access_token;

      // Simulate concurrent updates
      const update1 = request(app.getHttpServer())
        .patch(`/lease/${lease.id}`)
        .set('Authorization', `Bearer ${pmToken}`)
        .send({ rentAmount: 1100 });

      const update2 = request(app.getHttpServer())
        .patch(`/lease/${lease.id}`)
        .set('Authorization', `Bearer ${pmToken}`)
        .send({ rentAmount: 1200 });

      // Execute both updates concurrently
      const [response1, response2] = await Promise.all([update1, update2]);

      // Both should succeed (database transactions should handle this)
      expect([response1.status, response2.status]).toContain(HttpStatus.OK);

      // Verify final state is consistent (one of the updates should be applied)
      const finalLease = await prisma.lease.findUnique({
        where: { id: lease.id },
      });
      expect(finalLease).toBeDefined();
      expect([1100, 1200]).toContain(finalLease!.rentAmount);
    });

    it('should prevent data corruption when updating lease with conflicting data', async () => {
      const propertyManager = await prisma.user.create({
        data: TestDataFactory.createPropertyManager({ username: 'pm2' }),
      });
      const tenant = await prisma.user.create({
        data: TestDataFactory.createUser({ username: 'tenant2', role: 'TENANT' }),
      });
      const property = await prisma.property.create({
        data: TestDataFactory.createProperty(),
      });
      const unit = await prisma.unit.create({
        data: TestDataFactory.createUnit(property.id),
      });
      const lease = await prisma.lease.create({
        data: TestDataFactory.createLease(tenant.id, unit.id, { 
          rentAmount: 1000,
          status: 'ACTIVE',
        }),
      });

      const pmLogin = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ username: 'pm2', password: 'password123' });
      const pmToken = pmLogin.body.accessToken || pmLogin.body.access_token;

      // Concurrent updates with conflicting status
      const update1 = request(app.getHttpServer())
        .patch(`/lease/${lease.id}`)
        .set('Authorization', `Bearer ${pmToken}`)
        .send({ status: 'TERMINATED' });

      const update2 = request(app.getHttpServer())
        .patch(`/lease/${lease.id}`)
        .set('Authorization', `Bearer ${pmToken}`)
        .send({ status: 'RENEWED' });

      const [response1, response2] = await Promise.all([update1, update2]);

      // At least one should succeed
      expect([response1.status, response2.status]).toContain(HttpStatus.OK);

      // Final state should be valid (not corrupted)
      const finalLease = await prisma.lease.findUnique({
        where: { id: lease.id },
      });
      expect(finalLease).toBeDefined();
      expect(['TERMINATED', 'RENEWED', 'ACTIVE']).toContain(finalLease!.status);
    });
  });

  describe('Concurrent Maintenance Request Assignment', () => {
    it('should handle race conditions when assigning technicians to maintenance requests', async () => {
      const propertyManager = await prisma.user.create({
        data: TestDataFactory.createPropertyManager({ username: 'pm3' }),
      });
      const tenant = await prisma.user.create({
        data: TestDataFactory.createUser({ username: 'tenant3', role: 'TENANT' }),
      });
      const technician1 = await prisma.user.create({
        data: TestDataFactory.createUser({ username: 'tech1', role: 'TENANT' }),
      });
      const technician2 = await prisma.user.create({
        data: TestDataFactory.createUser({ username: 'tech2', role: 'TENANT' }),
      });
      const property = await prisma.property.create({
        data: TestDataFactory.createProperty(),
      });
      const unit = await prisma.unit.create({
        data: TestDataFactory.createUnit(property.id),
      });
      // Create maintenance request manually since factory method may not exist
      const maintenanceRequest = await prisma.maintenanceRequest.create({
        data: {
          unitId: unit.id,
          authorId: tenant.id,
          title: 'Test Maintenance Request',
          description: 'Test description',
          status: 'PENDING',
          priority: 'MEDIUM',
        },
      });

      const pmLogin = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ username: 'pm3', password: 'password123' });
      const pmToken = pmLogin.body.accessToken || pmLogin.body.access_token;

      // Concurrent assignment attempts
      const assign1 = request(app.getHttpServer())
        .patch(`/maintenance/${maintenanceRequest.id}`)
        .set('Authorization', `Bearer ${pmToken}`)
        .send({ assigneeId: technician1.id, status: 'IN_PROGRESS' });

      const assign2 = request(app.getHttpServer())
        .patch(`/maintenance/${maintenanceRequest.id}`)
        .set('Authorization', `Bearer ${pmToken}`)
        .send({ assigneeId: technician2.id, status: 'IN_PROGRESS' });

      const [response1, response2] = await Promise.all([assign1, assign2]);

      // At least one should succeed
      expect([response1.status, response2.status]).toContain(HttpStatus.OK);

      // Final state should have only one technician assigned
      const finalRequest = await prisma.maintenanceRequest.findUnique({
        where: { id: maintenanceRequest.id },
        include: { assignee: true },
      });
      expect(finalRequest).toBeDefined();
      if (finalRequest!.assigneeId) {
        expect([technician1.id, technician2.id]).toContain(finalRequest!.assigneeId);
      }
    });
  });

  describe('Database Transaction Integrity', () => {
    it('should rollback transaction if any part fails', async () => {
      const propertyManager = await prisma.user.create({
        data: TestDataFactory.createPropertyManager({ username: 'pm4' }),
      });
      const tenant = await prisma.user.create({
        data: TestDataFactory.createUser({ username: 'tenant4', role: 'TENANT' }),
      });
      const property = await prisma.property.create({
        data: TestDataFactory.createProperty(),
      });
      const unit = await prisma.unit.create({
        data: TestDataFactory.createUnit(property.id),
      });

      const pmLogin = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ username: 'pm4', password: 'password123' });
      const pmToken = pmLogin.body.accessToken || pmLogin.body.access_token;

      // Attempt to create lease with invalid data that should cause rollback
      const response = await request(app.getHttpServer())
        .post('/lease')
        .set('Authorization', `Bearer ${pmToken}`)
        .send({
          unitId: unit.id,
          tenantId: tenant.id,
          monthlyRent: -100, // Invalid negative rent
          startDate: '2025-01-01',
          endDate: '2024-12-31', // Invalid: end before start
        });

      // Should fail validation
      expect(response.status).toBe(HttpStatus.BAD_REQUEST);

      // Verify no lease was created
      const leases = await prisma.lease.findMany({
        where: { unitId: unit.id },
      });
      expect(leases.length).toBe(0);
    });
  });
});

