import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { TestDataFactory } from './factories';
import { Role, LeaseStatus, MaintenanceStatus } from '@prisma/client';

describe('Dashboard API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tenantToken: string;
  let propertyManagerToken: string;
  let tenantUser: any;
  let propertyManager: any;
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
    // Clean up
    await prisma.maintenanceRequest.deleteMany();
    await prisma.invoice.deleteMany();
    await prisma.lease.deleteMany();
    await prisma.unit.deleteMany();
    await prisma.property.deleteMany();
    await prisma.user.deleteMany();

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

    // Login
    const tenantLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: 'tenant@test.com', password: 'password123' });
    tenantToken = tenantLogin.body.accessToken;

    const pmLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: 'pm@test.com', password: 'password123' });
    propertyManagerToken = pmLogin.body.accessToken;

    // Create property, unit, and lease
    property = await prisma.property.create({
      data: TestDataFactory.createProperty(),
    });

    unit = await prisma.unit.create({
      data: TestDataFactory.createUnit(property.id),
    });

    lease = await prisma.lease.create({
      data: TestDataFactory.createLease(tenantUser.id, unit.id, {
        status: LeaseStatus.ACTIVE,
      }),
    });

    // Create test data
    await prisma.invoice.create({
      data: {
        leaseId: lease.id,
        description: 'Monthly Rent',
        amount: 2000,
        dueDate: new Date(),
        status: 'UNPAID',
      },
    });

    await prisma.maintenanceRequest.create({
      data: {
        authorId: tenantUser.id,
        unitId: unit.id,
        title: 'Test Request',
        description: 'Test',
        status: MaintenanceStatus.PENDING,
      },
    });
  });

  afterAll(async () => {
    await prisma.maintenanceRequest.deleteMany();
    await prisma.invoice.deleteMany();
    await prisma.lease.deleteMany();
    await prisma.unit.deleteMany();
    await prisma.property.deleteMany();
    await prisma.user.deleteMany();
    await app.close();
  });

  describe('GET /dashboard/tenant', () => {
    it('should get tenant dashboard data', async () => {
      const response = await request(app.getHttpServer())
        .get('/dashboard/tenant')
        .set('Authorization', `Bearer ${tenantToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('leases');
      expect(response.body).toHaveProperty('maintenanceRequests');
      expect(response.body).toHaveProperty('recentInspections');
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .get('/dashboard/tenant')
        .expect(401);
    });
  });

  describe('GET /dashboard/metrics', () => {
    it('should get property manager dashboard data', async () => {
      const response = await request(app.getHttpServer())
        .get('/dashboard/metrics')
        .set('Authorization', `Bearer ${propertyManagerToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('occupancy');
      expect(response.body).toHaveProperty('financials');
      expect(response.body).toHaveProperty('maintenance');
      expect(response.body).toHaveProperty('applications');
      expect(response.body).toHaveProperty('recentActivity');
    });
  });
});

