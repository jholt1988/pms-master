import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { TestDataFactory } from './factories';
import { Role, MaintenancePriority, MaintenanceRequest } from '@prisma/client';

describe('Maintenance API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tenantToken: string;
  let propertyManagerToken: string;
  let tenantUser: any;
  let propertyManager: any;
  let property: any;
  let unit: any;
  let lease: any;
  let maintenanceRequest: MaintenanceRequest;

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
    await prisma.maintenanceRequestHistory.deleteMany();
    await prisma.maintenanceNote.deleteMany();
    await prisma.maintenancePhoto.deleteMany();
    await prisma.maintenanceRequest.deleteMany();
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
      data: TestDataFactory.createLease(tenantUser.id, unit.id),
    });
  });

  afterAll(async () => {
    await prisma.maintenanceRequestHistory.deleteMany();
    await prisma.maintenanceNote.deleteMany();
    await prisma.maintenancePhoto.deleteMany();
    await prisma.maintenanceRequest.deleteMany();
    await prisma.lease.deleteMany();
    await prisma.unit.deleteMany();
    await prisma.property.deleteMany();
    await prisma.user.deleteMany();
    await app.close();
  });

  describe('POST /maintenance', () => {
    it('should create maintenance request as tenant', async () => {
      const response = await request(app.getHttpServer())
        .post('/maintenance')
        .set('Authorization', `Bearer ${tenantToken}`)
        .send({
          unitId: unit.id,
          title: 'Leaky faucet',
          description: 'Kitchen faucet is leaking',
          priority: MaintenancePriority.MEDIUM,
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.title).toBe('Leaky faucet');
      expect(response.body.status).toBe(maintenanceRequest.status['PENDING']);
      expect(response.body.priority).toBe(MaintenancePriority.MEDIUM);
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .post('/maintenance')
        .send({
          unitId: unit.id,
          title: 'Test',
          description: 'Test description',
        })
        .expect(401);
    });

    it('should validate required fields', async () => {
      await request(app.getHttpServer())
        .post('/maintenance')
        .set('Authorization', `Bearer ${tenantToken}`)
        .send({
          title: 'Test',
          // Missing description and unitId
        })
        .expect(400);
    });
  });

  describe('GET /maintenance', () => {
    let maintenanceRequest: any;

    beforeEach(async () => {
      maintenanceRequest = await prisma.maintenanceRequest.create({
        data: {
          leaseId: lease.id,
          unitId: unit.id,
          title: 'Test Request',
          description: 'Test description',
          priority: MaintenancePriority.MEDIUM,
          status: maintenanceRequest.status['PENDING'],
        },
      });
    });

    it('should get maintenance requests for tenant', async () => {
      const response = await request(app.getHttpServer())
        .get('/maintenance')
        .set('Authorization', `Bearer ${tenantToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('id');
    });

    it('should get all maintenance requests for property manager', async () => {
      const response = await request(app.getHttpServer())
        .get('/maintenance')
        .set('Authorization', `Bearer ${propertyManagerToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should filter by status', async () => {
      const response = await request(app.getHttpServer())
        .get('/maintenance?status=PENDING')
        .set('Authorization', `Bearer ${tenantToken}`)
        .expect(200);

      response.body.forEach((req: any) => {
        expect(req.status).toBe(maintenanceRequest.status['PENDING']);
      });
    });
  });

  describe('PUT /maintenance/:id/status', () => {
    let maintenanceRequest: any;

    beforeEach(async () => {
      maintenanceRequest = await prisma.maintenanceRequest.create({
        data: {
          leaseId: lease.id,
          unitId: unit.id,
          title: 'Test Request',
          description: 'Test description',
          priority: MaintenancePriority.MEDIUM,
          status: maintenanceRequest.status['PENDING'],
        },
      });
    });

    it('should update status as property manager', async () => {
      const response = await request(app.getHttpServer())
        .put(`/maintenance/${maintenanceRequest.id}/status`)
        .set('Authorization', `Bearer ${propertyManagerToken}`)
        .send({ status: maintenanceRequest.status['IN_PROGRESS'] })
        .expect(200);

      expect(response.body.status).toBe(maintenanceRequest.status['IN_PROGRESS']);
    });

    it('should reject status update from tenant', async () => {
      await request(app.getHttpServer())
        .put(`/maintenance/${maintenanceRequest.id}/status`)
        .set('Authorization', `Bearer ${tenantToken}`)
        .send({ status: maintenanceRequest.status['IN_PROGRESS'] })
        .expect(403);
    });
  });

  describe('POST /maintenance/:id/notes', () => {
    let maintenanceRequest: any;

    beforeEach(async () => {
      maintenanceRequest = await prisma.maintenanceRequest.create({
        data: {
          leaseId: lease.id,
          unitId: unit.id,
          title: 'Test Request',
          description: 'Test description',
          priority: MaintenancePriority.MEDIUM,
              status: maintenanceRequest.status['PENDING'],
        },
      });
    });

    it('should add note to maintenance request', async () => {
      const response = await request(app.getHttpServer())
        .post(`/maintenance/${maintenanceRequest.id}/notes`)
        .set('Authorization', `Bearer ${propertyManagerToken}`)
        .send({ body: 'Technician assigned' })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.body).toBe('Technician assigned');
    });
  });
});

