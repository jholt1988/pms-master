import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { TestDataFactory } from './factories';
import { Role, LeaseStatus } from '@prisma/client';
import { resetDatabase } from './utils/reset-database';

describe('Lease API (e2e)', () => {
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

    // Login
    const tenantLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: 'tenant@test.com', password: 'password123' });
    tenantToken = tenantLogin.body.accessToken;

    const pmLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: 'pm@test.com', password: 'password123' });
    propertyManagerToken = pmLogin.body.accessToken;

    // Create property and unit
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
  });

  afterAll(async () => {
    await resetDatabase(prisma);
    await app.close();
  });

  describe('GET /leases/my-lease', () => {
    it('should get tenant lease', async () => {
      const response = await request(app.getHttpServer())
        .get('/leases/my-lease')
        .set('Authorization', `Bearer ${tenantToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('rentAmount');
      expect(response.body).toHaveProperty('startDate');
      expect(response.body).toHaveProperty('endDate');
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .get('/leases/my-lease')
        .expect(401);
    });
  });

  describe('GET /leases', () => {
    it('should get all leases for property manager', async () => {
      const response = await request(app.getHttpServer())
        .get('/leases')
        .set('Authorization', `Bearer ${propertyManagerToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      if (response.body.length > 0) {
        expect(response.body[0]).toHaveProperty('id');
      }
    });

    it('should filter by status', async () => {
      const response = await request(app.getHttpServer())
        .get('/leases?status=ACTIVE')
        .set('Authorization', `Bearer ${propertyManagerToken}`)
        .expect(200);

      response.body.forEach((l: any) => {
        expect(l.status).toBe(LeaseStatus.ACTIVE);
      });
    });
  });

  describe('POST /leases', () => {
    it('should create lease as property manager', async () => {
      const newTenant = await prisma.user.create({
        data: TestDataFactory.createUser({
          username: 'newtenant@test.com',
        }),
      });

      const availableUnit = await prisma.unit.create({
        data: TestDataFactory.createUnit(property.id),
      });

      const response = await request(app.getHttpServer())
        .post('/leases')
        .set('Authorization', `Bearer ${propertyManagerToken}`)
        .send({
          tenantId: newTenant.id,
          unitId: availableUnit.id,
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          rentAmount: 2000,
          depositAmount: 2000,
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.rentAmount).toBe(2000);
    });

    it('should reject lease creation from tenant', async () => {
      await request(app.getHttpServer())
        .post('/leases')
        .set('Authorization', `Bearer ${tenantToken}`)
        .send({
          tenantId: tenantUser.id,
          unitId: unit.id,
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          rentAmount: 2000,
        })
        .expect(403);
    });
  });

  describe('PUT /leases/:id', () => {
    it('should update lease as property manager', async () => {
      const response = await request(app.getHttpServer())
        .put(`/leases/${lease.id}`)
        .set('Authorization', `Bearer ${propertyManagerToken}`)
        .send({
          rentAmount: 2100,
        })
        .expect(200);

      expect(response.body.rentAmount).toBe(2100);
    });
  });
});

