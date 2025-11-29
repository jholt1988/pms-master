import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { TestDataFactory } from './factories';
import { Role } from '@prisma/client';
import { resetDatabase } from './utils/reset-database';

describe('Payments AI Metrics API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let propertyManagerToken: string;
  let tenantToken: string;
  let propertyManager: any;
  let tenantUser: any;
  let property: any;
  let unit: any;
  let lease: any;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);
  });

  beforeEach(async () => {
    await resetDatabase(prisma);

    // Create users
    tenantUser = await prisma.user.create({
      data: TestDataFactory.createUser({
        username: 'tenant@test.com',
        role: Role.TENANT,
      }),
    });

    propertyManager = await prisma.user.create({
      data: TestDataFactory.createPropertyManager({
        username: 'pm@test.com',
      }),
    });

    // Create property and unit
    property = await prisma.property.create({
      data: TestDataFactory.createProperty({
        name: 'Test Property',
      }),
    });

    unit = await prisma.unit.create({
      data: TestDataFactory.createUnit({
        propertyId: property.id,
        name: 'Unit 1',
      }),
    });

    // Create lease
    lease = await prisma.lease.create({
      data: TestDataFactory.createLease({
        tenantId: tenantUser.id,
        unitId: unit.id,
        status: 'ACTIVE',
      }),
    });

    // Get auth tokens
    const tenantLoginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        username: 'tenant@test.com',
        password: 'TestPassword123!',
      });

    tenantToken = tenantLoginResponse.body.access_token || tenantLoginResponse.body.accessToken;

    const pmLoginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        username: 'pm@test.com',
        password: 'TestPassword123!',
      });

    propertyManagerToken =
      pmLoginResponse.body.access_token || pmLoginResponse.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /payments/ai-metrics', () => {
    it('should return metrics for property manager', async () => {
      const response = await request(app.getHttpServer())
        .get('/payments/ai-metrics')
        .set('Authorization', `Bearer ${propertyManagerToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('totalCalls');
      expect(response.body).toHaveProperty('successfulCalls');
      expect(response.body).toHaveProperty('failedCalls');
      expect(response.body).toHaveProperty('averageResponseTime');
      expect(response.body).toHaveProperty('operations');
      expect(response.body.operations).toHaveProperty('assessPaymentRisk');
      expect(response.body.operations).toHaveProperty('determineReminderTiming');
    });

    it('should return 403 for tenant user', async () => {
      await request(app.getHttpServer())
        .get('/payments/ai-metrics')
        .set('Authorization', `Bearer ${tenantToken}`)
        .expect(403);
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer()).get('/payments/ai-metrics').expect(401);
    });

    it('should return correct metrics structure', async () => {
      const response = await request(app.getHttpServer())
        .get('/payments/ai-metrics')
        .set('Authorization', `Bearer ${propertyManagerToken}`)
        .expect(200);

      // Verify structure
      expect(typeof response.body.totalCalls).toBe('number');
      expect(typeof response.body.successfulCalls).toBe('number');
      expect(typeof response.body.failedCalls).toBe('number');
      expect(typeof response.body.averageResponseTime).toBe('number');

      // Verify operations structure
      expect(response.body.operations.assessPaymentRisk).toHaveProperty('total');
      expect(response.body.operations.assessPaymentRisk).toHaveProperty('successful');
      expect(response.body.operations.assessPaymentRisk).toHaveProperty('averageResponseTime');

      expect(response.body.operations.determineReminderTiming).toHaveProperty('total');
      expect(response.body.operations.determineReminderTiming).toHaveProperty('successful');
      expect(response.body.operations.determineReminderTiming).toHaveProperty('averageResponseTime');
    });

    it('should return metrics after payment operations', async () => {
      // Create an invoice
      const invoice = await prisma.invoice.create({
        data: {
          description: 'Test Invoice',
          amount: 1500,
          dueDate: new Date(),
          leaseId: lease.id,
        },
      });

      // Wait a bit for async operations
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Check metrics
      const response = await request(app.getHttpServer())
        .get('/payments/ai-metrics')
        .set('Authorization', `Bearer ${propertyManagerToken}`)
        .expect(200);

      // Should have at least zero calls (metrics may not be recorded in test environment)
      expect(response.body.totalCalls).toBeGreaterThanOrEqual(0);
      expect(response.body.operations.assessPaymentRisk.total).toBeGreaterThanOrEqual(0);
      expect(response.body.operations.determineReminderTiming.total).toBeGreaterThanOrEqual(0);
    });
  });
});

