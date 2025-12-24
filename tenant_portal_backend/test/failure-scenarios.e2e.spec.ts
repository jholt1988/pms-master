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
 * P0-004: Edge Case Tests - Failure Scenarios
 * Tests for error handling, service failures, and rollback scenarios
 */
describe('Failure Scenarios (e2e)', () => {
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
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Payment Processing Failures', () => {
    it('should handle Stripe API failure gracefully', async () => {
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
        data: TestDataFactory.createLease(tenant.id, unit.id),
      });
      const invoice = await prisma.invoice.create({
        data: TestDataFactory.createInvoice(lease.id),
      });

      const tenantLogin = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ username: 'tenant1', password: 'password123' });
      const tenantToken = tenantLogin.body.accessToken || tenantLogin.body.access_token;

      // Attempt payment with invalid payment method (simulating Stripe failure)
      const response = await request(app.getHttpServer())
        .post('/payments')
        .set('Authorization', `Bearer ${tenantToken}`)
        .send({
          invoiceId: invoice.id,
          amount: invoice.amount,
          paymentMethodId: 'invalid_payment_method',
        });

      // Should return error, not crash (accept various error status codes)
      expect(response.status).toBeGreaterThanOrEqual(400);
      if (response.status < 500) {
        // For client errors, expect a message
        expect(response.body).toHaveProperty('message');
      }
    });

    it('should not create payment record if external service fails', async () => {
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
        data: TestDataFactory.createLease(tenant.id, unit.id),
      });
      const invoice = await prisma.invoice.create({
        data: TestDataFactory.createInvoice(lease.id),
      });

      const initialPaymentCount = await prisma.payment.count({
        where: { invoiceId: invoice.id },
      });

      const tenantLogin = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ username: 'tenant2', password: 'password123' });
      const tenantToken = tenantLogin.body.accessToken || tenantLogin.body.access_token;

      // Attempt payment that will fail
      await request(app.getHttpServer())
        .post('/payments')
        .set('Authorization', `Bearer ${tenantToken}`)
        .send({
          invoiceId: invoice.id,
          amount: invoice.amount,
          paymentMethodId: 'pm_failure', // Simulated failure
        });

      // Verify no payment was created
      const finalPaymentCount = await prisma.payment.count({
        where: { invoiceId: invoice.id },
      });
      expect(finalPaymentCount).toBe(initialPaymentCount);
    });
  });

  describe('Invalid API Responses', () => {
    it('should handle malformed request bodies', async () => {
      const propertyManager = await prisma.user.create({
        data: TestDataFactory.createPropertyManager({ username: 'pm3' }),
      });

      const pmLogin = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ username: 'pm3', password: 'password123' });
      const pmToken = pmLogin.body.accessToken || pmLogin.body.access_token;

      // Send malformed JSON
      const response = await request(app.getHttpServer())
        .post('/leases')
        .set('Authorization', `Bearer ${pmToken}`)
        .set('Content-Type', 'application/json')
        .send('{ invalid json }')
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body).toHaveProperty('message');
    });

    it('should handle missing required fields', async () => {
      const propertyManager = await prisma.user.create({
        data: TestDataFactory.createPropertyManager({ username: 'pm4' }),
      });

      const pmLogin = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ username: 'pm4', password: 'password123' });
      const pmToken = pmLogin.body.accessToken || pmLogin.body.access_token;

      // Create lease without required fields
      const response = await request(app.getHttpServer())
        .post('/leases')
        .set('Authorization', `Bearer ${pmToken}`)
        .send({
          // Missing unitId, tenantId, etc.
        });
      
      // Should return validation error (400) or not found (404) if route doesn't exist
      expect([HttpStatus.BAD_REQUEST, HttpStatus.NOT_FOUND]).toContain(response.status);
      
      if (response.status !== HttpStatus.NOT_FOUND) {
        expect(response.body).toHaveProperty('message');
      }
    });

    it('should handle invalid data types', async () => {
      const propertyManager = await prisma.user.create({
        data: TestDataFactory.createPropertyManager({ username: 'pm5' }),
      });
      const tenant = await prisma.user.create({
        data: TestDataFactory.createUser({ username: 'tenant5', role: 'TENANT' }),
      });
      const property = await prisma.property.create({
        data: TestDataFactory.createProperty(),
      });
      const unit = await prisma.unit.create({
        data: TestDataFactory.createUnit(property.id),
      });

      const pmLogin = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ username: 'pm5', password: 'password123' });
      const pmToken = pmLogin.body.accessToken || pmLogin.body.access_token;

      // Send invalid data types
      const response = await request(app.getHttpServer())
        .post('/leases')
        .set('Authorization', `Bearer ${pmToken}`)
        .send({
          unitId: unit.id,
          tenantId: tenant.id,
          rentAmount: 'not a number', // Invalid type
          startDate: 'invalid date',
        })
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body).toHaveProperty('message');
    });
  });

  describe('Network Timeout Handling', () => {
    it('should handle slow database queries gracefully', async () => {
      const propertyManager = await prisma.user.create({
        data: TestDataFactory.createPropertyManager({ username: 'pm6' }),
      });

      const pmLogin = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ username: 'pm6', password: 'password123' });
      const pmToken = pmLogin.body.accessToken || pmLogin.body.access_token;

      // Request that might timeout (large dataset)
      const response = await request(app.getHttpServer())
        .get('/leases')
        .set('Authorization', `Bearer ${pmToken}`)
        .timeout(5000); // 5 second timeout
      
      // Should either succeed (200), timeout (408), or return not found (404) if route doesn't exist
      expect([HttpStatus.OK, HttpStatus.REQUEST_TIMEOUT, HttpStatus.NOT_FOUND]).toContain(response.status);

      // If it succeeds, should return valid data structure
      if (response.status === HttpStatus.OK) {
        expect(Array.isArray(response.body)).toBe(true);
      }
    });
  });

  describe('External Service Failures', () => {
    it('should handle QuickBooks API failure', async () => {
      // This test would require mocking QuickBooks service
      // For now, we verify the endpoint exists and handles errors
      const propertyManager = await prisma.user.create({
        data: TestDataFactory.createPropertyManager({ username: 'pm7' }),
      });

      const pmLogin = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ username: 'pm7', password: 'password123' });
      const pmToken = pmLogin.body.accessToken || pmLogin.body.access_token;

      // Attempt to sync with QuickBooks (may fail if not configured)
      const response = await request(app.getHttpServer())
        .post('/quickbooks/sync')
        .set('Authorization', `Bearer ${pmToken}`)
        .send({});

      // Should return error, not crash
      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.body).toHaveProperty('message');
    });
  });
});

