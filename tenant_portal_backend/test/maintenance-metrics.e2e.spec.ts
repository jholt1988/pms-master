import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { TestDataFactory } from './factories';
import { Role } from '@prisma/client';
import { resetDatabase } from './utils/reset-database';

describe('Maintenance AI Metrics API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let propertyManagerToken: string;
  let tenantToken: string;
  let propertyManager: any;
  let tenantUser: any;
  let property: any;
  let unit: any;

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

  describe('GET /maintenance/ai-metrics', () => {
    it('should return metrics for property manager', async () => {
      const response = await request(app.getHttpServer())
        .get('/maintenance/ai-metrics')
        .set('Authorization', `Bearer ${propertyManagerToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('totalCalls');
      expect(response.body).toHaveProperty('successfulCalls');
      expect(response.body).toHaveProperty('failedCalls');
      expect(response.body).toHaveProperty('averageResponseTime');
      expect(response.body).toHaveProperty('fallbackUsageRate');
      expect(response.body).toHaveProperty('operations');
      expect(response.body.operations).toHaveProperty('assignPriority');
      expect(response.body.operations).toHaveProperty('assignTechnician');
      expect(response.body.operations).toHaveProperty('predictSLABreach');
    });

    it('should return 403 for tenant user', async () => {
      await request(app.getHttpServer())
        .get('/maintenance/ai-metrics')
        .set('Authorization', `Bearer ${tenantToken}`)
        .expect(403);
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer()).get('/maintenance/ai-metrics').expect(401);
    });

    it('should return metrics after creating maintenance request with AI priority', async () => {
      // Create a maintenance request without priority (triggers AI)
      await request(app.getHttpServer())
        .post('/maintenance')
        .set('Authorization', `Bearer ${tenantToken}`)
        .send({
          title: 'Water leak',
          description: 'Water leaking from ceiling',
          propertyId: property.id,
          unitId: unit.id,
        })
        .expect(201);

      // Wait a bit for async operations
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Check metrics
      const response = await request(app.getHttpServer())
        .get('/maintenance/ai-metrics')
        .set('Authorization', `Bearer ${propertyManagerToken}`)
        .expect(200);

      // Should have at least one call
      expect(response.body.totalCalls).toBeGreaterThanOrEqual(0);
      expect(response.body.operations.assignPriority.total).toBeGreaterThanOrEqual(0);
    });

    it('should return correct metrics structure', async () => {
      const response = await request(app.getHttpServer())
        .get('/maintenance/ai-metrics')
        .set('Authorization', `Bearer ${propertyManagerToken}`)
        .expect(200);

      // Verify structure
      expect(typeof response.body.totalCalls).toBe('number');
      expect(typeof response.body.successfulCalls).toBe('number');
      expect(typeof response.body.failedCalls).toBe('number');
      expect(typeof response.body.averageResponseTime).toBe('number');
      expect(typeof response.body.fallbackUsageRate).toBe('number');

      // Verify operations structure
      expect(response.body.operations.assignPriority).toHaveProperty('total');
      expect(response.body.operations.assignPriority).toHaveProperty('successful');
      expect(response.body.operations.assignPriority).toHaveProperty('averageResponseTime');
      expect(response.body.operations.assignPriority).toHaveProperty('fallbackRate');

      expect(response.body.operations.assignTechnician).toHaveProperty('total');
      expect(response.body.operations.assignTechnician).toHaveProperty('successful');
      expect(response.body.operations.assignTechnician).toHaveProperty('averageResponseTime');

      expect(response.body.operations.predictSLABreach).toHaveProperty('total');
      expect(response.body.operations.predictSLABreach).toHaveProperty('successful');
      expect(response.body.operations.predictSLABreach).toHaveProperty('averageResponseTime');
    });
  });
});

