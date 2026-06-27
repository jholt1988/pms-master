import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { TestDataFactory } from './factories';
import { LeaseStatus, OrgRole, Role } from '@prisma/client';
import { resetDatabase } from './utils/reset-database';

describe('Admin parity endpoints (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let pmToken: string;
  let propertyManager: any;
  let organization: any;
  let property: any;
  let unit: any;
  let tenant: any;
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

    propertyManager = await prisma.user.create({
      data: TestDataFactory.createPropertyManager({
        username: 'pm@test.com',
      }),
    });

    tenant = await prisma.user.create({
      data: TestDataFactory.createUser({
        username: 'tenant@test.com',
        role: Role.TENANT,
      }),
    });

    organization = await prisma.organization.create({
      data: {
        name: 'Test Org',
      },
    });

    await prisma.userOrganization.create({
      data: {
        userId: propertyManager.id,
        organizationId: organization.id,
        role: OrgRole.ADMIN,
      },
    });

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: 'pm@test.com', password: 'password123' });
    pmToken = loginResponse.body.accessToken ?? loginResponse.body.access_token;

    property = await prisma.property.create({
      data: TestDataFactory.createProperty({
        organizationId: organization.id,
      }),
    });

    unit = await prisma.unit.create({
      data: TestDataFactory.createUnit(property.id),
    });

    lease = await prisma.lease.create({
      data: TestDataFactory.createLease(tenant.id, unit.id, {
        rentAmount: 1500,
        status: LeaseStatus.ACTIVE,
      }),
    });
  });

  afterAll(async () => {
    await resetDatabase(prisma);
    await app.close();
  });

  it('handles vendors workflows', async () => {
    const createResponse = await request(app.getHttpServer())
      .post('/vendors')
      .set('Authorization', `Bearer ${pmToken}`)
      .send({
        name: 'Acme Plumbing',
        type: 'CONTRACTOR',
        email: 'acme@example.com',
        phone: '555-0100',
        taxId: '11-1111111',
      })
      .expect(201);

    expect(createResponse.body).toHaveProperty('id');

    const listResponse = await request(app.getHttpServer())
      .get('/vendors')
      .set('Authorization', `Bearer ${pmToken}`)
      .expect(200);

    expect(Array.isArray(listResponse.body)).toBe(true);

    const exportResponse = await request(app.getHttpServer())
      .get('/vendors/1099-export')
      .set('Authorization', `Bearer ${pmToken}`)
      .expect(200);

    expect(exportResponse.body).toHaveProperty('status');
  });

  it('handles contractor bidding workflows', async () => {
    const createResponse = await request(app.getHttpServer())
      .post('/contractor-bidding/bids')
      .set('Authorization', `Bearer ${pmToken}`)
      .send({
        propertyId: property.id,
        scope: 'Roof repair',
        bidAmountCents: 125000,
        vendorName: 'Ace Roofing',
        vendorEmail: 'roofing@example.com',
      })
      .expect(201);

    const bidId = createResponse.body.id;
    expect(bidId).toBeDefined();

    const listResponse = await request(app.getHttpServer())
      .get('/contractor-bidding/bids')
      .set('Authorization', `Bearer ${pmToken}`)
      .expect(200);

    expect(Array.isArray(listResponse.body)).toBe(true);

    const getResponse = await request(app.getHttpServer())
      .get(`/contractor-bidding/bids/${bidId}`)
      .set('Authorization', `Bearer ${pmToken}`)
      .expect(200);

    expect(getResponse.body).toHaveProperty('id', bidId);

    const awardResponse = await request(app.getHttpServer())
      .patch(`/contractor-bidding/bids/${bidId}/award`)
      .set('Authorization', `Bearer ${pmToken}`)
      .expect(200);

    expect(awardResponse.body.status).toBe('AWARDED');

    const scoreResponse = await request(app.getHttpServer())
      .post(`/contractor-bidding/bids/${bidId}/ai-score`)
      .set('Authorization', `Bearer ${pmToken}`)
      .expect(201);

    expect(scoreResponse.body).toHaveProperty('aiScore');

    const recommendationsResponse = await request(app.getHttpServer())
      .get(`/contractor-bidding/properties/${property.id}/recommendations`)
      .query({ scope: 'Roof' })
      .set('Authorization', `Bearer ${pmToken}`)
      .expect(200);

    expect(recommendationsResponse.body).toHaveProperty('recommendations');
  });

  it('handles CapEx forecasting workflows', async () => {
    const year = new Date().getFullYear() + 1;
    const createResponse = await request(app.getHttpServer())
      .post('/capex-forecasting/forecasts')
      .set('Authorization', `Bearer ${pmToken}`)
      .send({
        propertyId: property.id,
        category: 'HVAC',
        description: 'Replace aging HVAC units',
        estimatedCostCents: 250000,
        projectedYear: year,
        urgency: 'MEDIUM',
      })
      .expect(201);

    const forecastId = createResponse.body.id;
    expect(forecastId).toBeDefined();

    const listResponse = await request(app.getHttpServer())
      .get('/capex-forecasting/forecasts')
      .set('Authorization', `Bearer ${pmToken}`)
      .expect(200);

    expect(Array.isArray(listResponse.body)).toBe(true);

    const approveResponse = await request(app.getHttpServer())
      .patch(`/capex-forecasting/forecasts/${forecastId}/approve`)
      .set('Authorization', `Bearer ${pmToken}`)
      .send({ approvedBudget: 220000 })
      .expect(200);

    expect(approveResponse.body.status).toBe('APPROVED');

    const completeResponse = await request(app.getHttpServer())
      .patch(`/capex-forecasting/forecasts/${forecastId}/complete`)
      .set('Authorization', `Bearer ${pmToken}`)
      .send({ actualCostCents: 210000 })
      .expect(200);

    expect(completeResponse.body.status).toBe('COMPLETED');

    const generateResponse = await request(app.getHttpServer())
      .post(`/capex-forecasting/properties/${property.id}/generate`)
      .set('Authorization', `Bearer ${pmToken}`)
      .expect(201);

    expect(generateResponse.body).toHaveProperty('propertyId', property.id);

    const summaryResponse = await request(app.getHttpServer())
      .get('/capex-forecasting/summary')
      .query({ year })
      .set('Authorization', `Bearer ${pmToken}`)
      .expect(200);

    expect(summaryResponse.body).toHaveProperty('totalForecasts');
  });

  it('handles lease abstraction workflows', async () => {
    const extractResponse = await request(app.getHttpServer())
      .post('/lease-abstraction/extract')
      .set('Authorization', `Bearer ${pmToken}`)
      .send({ leaseId: lease.id, documentId: '00000000-0000-0000-0000-0000000d0c12' })
      .expect(201);

    const abstractionId = extractResponse.body.id;
    expect(abstractionId).toBeDefined();

    const listResponse = await request(app.getHttpServer())
      .get('/lease-abstraction/abstractions')
      .query({ leaseId: lease.id })
      .set('Authorization', `Bearer ${pmToken}`)
      .expect(200);

    expect(Array.isArray(listResponse.body)).toBe(true);

    const reviewResponse = await request(app.getHttpServer())
      .patch(`/lease-abstraction/abstractions/${abstractionId}/review`)
      .set('Authorization', `Bearer ${pmToken}`)
      .send({ reviewedById: propertyManager.id })
      .expect(200);

    expect(reviewResponse.body.status).toBe('COMPLETED');

    const analyticsResponse = await request(app.getHttpServer())
      .get('/lease-abstraction/analytics')
      .set('Authorization', `Bearer ${pmToken}`)
      .expect(200);

    expect(analyticsResponse.body).toHaveProperty('totalLeases');
  });

  it('returns reporting analytics snapshots', async () => {
    const heatmapResponse = await request(app.getHttpServer())
      .get('/reporting/analytics/heatmap')
      .set('Authorization', `Bearer ${pmToken}`)
      .expect(200);

    expect(Array.isArray(heatmapResponse.body)).toBe(true);

    const opexResponse = await request(app.getHttpServer())
      .get('/reporting/analytics/opex-anomalies')
      .set('Authorization', `Bearer ${pmToken}`)
      .expect(200);

    expect(Array.isArray(opexResponse.body)).toBe(true);

    const syncStatusResponse = await request(app.getHttpServer())
      .get('/reporting/accounting-sync-status')
      .set('Authorization', `Bearer ${pmToken}`)
      .expect(200);

    expect(syncStatusResponse.body).toHaveProperty('connected');
  });
});
