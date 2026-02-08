import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { TestDataFactory } from './factories';
import { Role, MaintenancePriority, MaintenanceRequest, Status } from '@prisma/client';
import { resetDatabase } from './utils/reset-database';

describe('Maintenance API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tenantToken: string;
  let propertyManagerToken: string;
  let tenantUser: any;
  let propertyManager: any;
  let organization: any;
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
    tenantToken = tenantLogin.body.access_token || tenantLogin.body.accessToken;

    const pmLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: 'pm@test.com', password: 'password123' });
    propertyManagerToken = pmLogin.body.access_token || pmLogin.body.accessToken;

    // Create organization + membership (single-org mode)
    organization = await prisma.organization.create({
      data: { name: 'Test Org' },
    });

    await prisma.userOrganization.create({
      data: {
        userId: propertyManager.id,
        organizationId: organization.id,
        role: 'ADMIN',
      },
    });

    // Create property, unit, and lease
    property = await prisma.property.create({
      data: TestDataFactory.createProperty({ organizationId: organization.id }),
    });

    unit = await prisma.unit.create({
      data: TestDataFactory.createUnit(property.id),
    });

    lease = await prisma.lease.create({
      data: TestDataFactory.createLease(tenantUser.id, unit.id),
    });
  });

  afterAll(async () => {
    await resetDatabase(prisma);
    await app.close();
  });

  describe('POST /maintenance', () => {
    it('should create maintenance request as tenant', async () => {
      const response = await request(app.getHttpServer())
        .post('/maintenance')
        .set('Authorization', `Bearer ${tenantToken}`)
        .send({
          // unitId/propertyId are derived from tenant lease; client-supplied values are ignored
          title: 'Leaky faucet',
          description: 'Kitchen faucet is leaking',
          priority: MaintenancePriority.MEDIUM,
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.title).toBe('Leaky faucet');
      expect(response.body.status).toBe(Status.PENDING);
      expect(response.body.priority).toBe(MaintenancePriority.MEDIUM);
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .post('/maintenance')
        .send({
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
          // Missing description
        })
        .expect(400);
    });
  });

  describe('GET /maintenance', () => {
    let maintenanceRequest: any;

    beforeEach(async () => {
      maintenanceRequest = await prisma.maintenanceRequest.create({
        data: {
          title: 'Test Request',
          description: 'Test description',
          priority: MaintenancePriority.MEDIUM,
          status: Status.PENDING,
          author: { connect: { id: tenantUser.id } },
          lease: { connect: { id: lease.id } },
          unit: { connect: { id: unit.id } },
          property: { connect: { id: property.id } },
        },
      });
    });

    it('should get maintenance requests for tenant', async () => {
      const response = await request(app.getHttpServer())
        .get('/maintenance')
        .set('Authorization', `Bearer ${tenantToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('items');
      expect(Array.isArray(response.body.items)).toBe(true);
      expect(response.body.items.length).toBeGreaterThan(0);
      expect(response.body.items[0]).toHaveProperty('id');
    });

    it('should get all maintenance requests for property manager', async () => {
      const response = await request(app.getHttpServer())
        .get('/maintenance')
        .set('Authorization', `Bearer ${propertyManagerToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('items');
      expect(Array.isArray(response.body.items)).toBe(true);
    });

    it('should filter by status', async () => {
      const response = await request(app.getHttpServer())
        .get('/maintenance?status=PENDING')
        .set('Authorization', `Bearer ${tenantToken}`)
        .expect(200);

      response.body.items.forEach((req: any) => {
        expect(req.status).toBe(Status.PENDING);
      });
    });
  });

  describe('PUT /maintenance/:id/status', () => {
    let maintenanceRequest: any;

    beforeEach(async () => {
      maintenanceRequest = await prisma.maintenanceRequest.create({
        data: {
          title: 'Test Request',
          description: 'Test description',
          priority: MaintenancePriority.MEDIUM,
          status: Status.PENDING,
          author: { connect: { id: tenantUser.id } },
          lease: { connect: { id: lease.id } },
          unit: { connect: { id: unit.id } },
          property: { connect: { id: property.id } },
        },
      });
    });

    it('should update status as property manager', async () => {
      const response = await request(app.getHttpServer())
        .put(`/maintenance/${maintenanceRequest.id}/status`)
        .set('Authorization', `Bearer ${propertyManagerToken}`)
        .send({ status: Status.IN_PROGRESS })
        .expect(200);

      expect(response.body.status).toBe(Status.IN_PROGRESS);
    });

    it('should reject status update from tenant', async () => {
      await request(app.getHttpServer())
        .put(`/maintenance/${maintenanceRequest.id}/status`)
        .set('Authorization', `Bearer ${tenantToken}`)
        .send({ status: Status.IN_PROGRESS })
        .expect(403);
    });
  });

  describe('POST /maintenance/:id/notes', () => {
    let maintenanceRequest: any;

    beforeEach(async () => {
      maintenanceRequest = await prisma.maintenanceRequest.create({
        data: {
          title: 'Test Request',
          description: 'Test description',
          priority: MaintenancePriority.MEDIUM,
          status: Status.PENDING,
          author: { connect: { id: tenantUser.id } },
          lease: { connect: { id: lease.id } },
          unit: { connect: { id: unit.id } },
          property: { connect: { id: property.id } },
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

