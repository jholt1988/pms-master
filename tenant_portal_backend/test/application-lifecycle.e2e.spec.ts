import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { TestDataFactory } from './factories';
import { ApplicationStatus, Role } from '@prisma/client';
import { resetDatabase } from './utils/reset-database';

describe('Application Lifecycle API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tenantToken: string;
  let propertyManagerToken: string;
  let tenantUser: any;
  let propertyManager: any;
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

    // Create test users
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

    // Login to get tokens
    const tenantLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        username: 'tenant@test.com',
        password: 'password123',
      });
    tenantToken = tenantLogin.body.accessToken;

    const pmLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        username: 'pm@test.com',
        password: 'password123',
      });
    propertyManagerToken = pmLogin.body.accessToken;

    // Create property and unit
    property = await prisma.property.create({
      data: TestDataFactory.createProperty(),
    });

    unit = await prisma.unit.create({
      data: TestDataFactory.createUnit(property.id, {
        name: 'Unit 101',
      }),
    });
  });

  afterAll(async () => {
    await resetDatabase(prisma);
    await app.close();
  });

  describe('Application Submission Flow', () => {
    it('should submit application and create SUBMITTED lifecycle event', async () => {
      const response = await request(app.getHttpServer())
        .post('/rental-applications')
        .set('Authorization', `Bearer ${tenantToken}`)
        .send({
          propertyId: property.id,
          unitId: unit.id,
          fullName: 'John Doe',
          email: 'john.doe@test.com',
          phoneNumber: '(555) 123-4567',
          income: 5000,
          employmentStatus: 'Full-time',
          previousAddress: '123 Main St, City, State 12345',
          creditScore: 750,
          monthlyDebt: 500,
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.status).toBe(ApplicationStatus.PENDING);

      // Verify lifecycle event was created
      const events = await prisma.applicationLifecycleEvent.findMany({
        where: { applicationId: response.body.id },
      });

      expect(events.length).toBeGreaterThan(0);
      const submittedEvent = events.find(
        (e) => e.eventType === 'SUBMITTED',
      );
      expect(submittedEvent).toBeDefined();
      expect(submittedEvent?.toStatus).toBe(ApplicationStatus.PENDING);
    });

    it('should allow unauthenticated users to submit applications', async () => {
      const response = await request(app.getHttpServer())
        .post('/rental-applications')
        .send({
          propertyId: property.id,
          unitId: unit.id,
          fullName: 'Jane Smith',
          email: 'jane.smith@test.com',
          phoneNumber: '(555) 987-6543',
          income: 6000,
          employmentStatus: 'Full-time',
          previousAddress: '456 Oak Ave, City, State 12345',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.status).toBe(ApplicationStatus.PENDING);
    });
  });

  describe('Application Status Transitions', () => {
    let applicationId: number;

    beforeEach(async () => {
      // Create an application
      const appResponse = await request(app.getHttpServer())
        .post('/rental-applications')
        .set('Authorization', `Bearer ${tenantToken}`)
        .send({
          propertyId: property.id,
          unitId: unit.id,
          fullName: 'Test Applicant',
          email: 'test@test.com',
          phoneNumber: '(555) 111-2222',
          income: 5000,
          employmentStatus: 'Full-time',
          previousAddress: '789 Test St',
        });

      applicationId = appResponse.body.id;
    });

    it('should transition from PENDING to UNDER_REVIEW', async () => {
      const response = await request(app.getHttpServer())
        .put(`/rental-applications/${applicationId}/status`)
        .set('Authorization', `Bearer ${propertyManagerToken}`)
        .send({ status: ApplicationStatus.UNDER_REVIEW })
        .expect(200);

      expect(response.body.status).toBe(ApplicationStatus.UNDER_REVIEW);

      // Verify lifecycle event
      const events = await prisma.applicationLifecycleEvent.findMany({
        where: { applicationId },
        orderBy: { createdAt: 'desc' },
      });

      const statusChangeEvent = events.find(
        (e) => e.toStatus === ApplicationStatus.UNDER_REVIEW,
      );
      expect(statusChangeEvent).toBeDefined();
      expect(statusChangeEvent?.eventType).toBe('UNDER_REVIEW');
    });

    it('should transition from UNDER_REVIEW to SCREENING', async () => {
      // First move to UNDER_REVIEW
      await request(app.getHttpServer())
        .put(`/rental-applications/${applicationId}/status`)
        .set('Authorization', `Bearer ${propertyManagerToken}`)
        .send({ status: ApplicationStatus.UNDER_REVIEW });

      // Then move to SCREENING
      const response = await request(app.getHttpServer())
        .put(`/rental-applications/${applicationId}/status`)
        .set('Authorization', `Bearer ${propertyManagerToken}`)
        .send({ status: ApplicationStatus.SCREENING })
        .expect(200);

      expect(response.body.status).toBe(ApplicationStatus.SCREENING);
    });

    it('should reject invalid status transitions', async () => {
      // Try to go directly from PENDING to APPROVED (should require screening)
      await request(app.getHttpServer())
        .put(`/rental-applications/${applicationId}/status`)
        .set('Authorization', `Bearer ${propertyManagerToken}`)
        .send({ status: ApplicationStatus.APPROVED })
        .expect(400);
    });

    it('should reject transitions from unauthorized roles', async () => {
      // Tenant should not be able to change status
      await request(app.getHttpServer())
        .put(`/rental-applications/${applicationId}/status`)
        .set('Authorization', `Bearer ${tenantToken}`)
        .send({ status: ApplicationStatus.UNDER_REVIEW })
        .expect(403);
    });
  });

  describe('Application Screening', () => {
    let applicationId: number;

    beforeEach(async () => {
      const appResponse = await request(app.getHttpServer())
        .post('/rental-applications')
        .set('Authorization', `Bearer ${tenantToken}`)
        .send({
          propertyId: property.id,
          unitId: unit.id,
          fullName: 'Screening Test',
          email: 'screening@test.com',
          phoneNumber: '(555) 333-4444',
          income: 6000,
          employmentStatus: 'Full-time',
          previousAddress: '123 Test St',
          creditScore: 750,
          monthlyDebt: 500,
        });

      applicationId = appResponse.body.id;

      // Create a lease for the unit to get rent amount
      await prisma.lease.create({
        data: {
          tenantId: tenantUser.id,
          unitId: unit.id,
          startDate: new Date(),
          endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          rentAmount: 2000,
          depositAmount: 2000,
          status: 'ACTIVE',
        },
      });
    });

    it('should screen application and create lifecycle events', async () => {
      const response = await request(app.getHttpServer())
        .post(`/rental-applications/${applicationId}/screen`)
        .set('Authorization', `Bearer ${propertyManagerToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('screeningScore');
      expect(response.body).toHaveProperty('qualificationStatus');
      expect(response.body).toHaveProperty('recommendation');
      expect(response.body.screenedAt).toBeDefined();

      // Verify lifecycle events
      const events = await prisma.applicationLifecycleEvent.findMany({
        where: { applicationId },
        orderBy: { createdAt: 'asc' },
      });

      const screeningStarted = events.find(
        (e) => e.eventType === 'SCREENING_STARTED',
      );
      const screeningCompleted = events.find(
        (e) => e.eventType === 'SCREENING_COMPLETED',
      );

      expect(screeningStarted).toBeDefined();
      expect(screeningCompleted).toBeDefined();
    });
  });

  describe('Application Timeline', () => {
    let applicationId: number;

    beforeEach(async () => {
      const appResponse = await request(app.getHttpServer())
        .post('/rental-applications')
        .set('Authorization', `Bearer ${tenantToken}`)
        .send({
          propertyId: property.id,
          unitId: unit.id,
          fullName: 'Timeline Test',
          email: 'timeline@test.com',
          phoneNumber: '(555) 555-5555',
          income: 5000,
          employmentStatus: 'Full-time',
          previousAddress: '123 Timeline St',
        });

      applicationId = appResponse.body.id;
    });

    it('should return application timeline with events', async () => {
      // Create some status transitions
      await request(app.getHttpServer())
        .put(`/rental-applications/${applicationId}/status`)
        .set('Authorization', `Bearer ${propertyManagerToken}`)
        .send({ status: ApplicationStatus.UNDER_REVIEW });

      const response = await request(app.getHttpServer())
        .get(`/rental-applications/${applicationId}/timeline`)
        .set('Authorization', `Bearer ${propertyManagerToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      // Verify timeline is sorted chronologically
      const timestamps = response.body.map((e: any) =>
        new Date(e.timestamp).getTime(),
      );
      const sortedTimestamps = [...timestamps].sort((a, b) => a - b);
      expect(timestamps).toEqual(sortedTimestamps);
    });

    it('should return lifecycle stage information', async () => {
      const response = await request(app.getHttpServer())
        .get(`/rental-applications/${applicationId}/lifecycle`)
        .set('Authorization', `Bearer ${propertyManagerToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('stage');
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('progress');
      expect(response.body).toHaveProperty('nextSteps');
      expect(typeof response.body.progress).toBe('number');
      expect(Array.isArray(response.body.nextSteps)).toBe(true);
    });
  });

  describe('Application Notes', () => {
    let applicationId: number;

    beforeEach(async () => {
      const appResponse = await request(app.getHttpServer())
        .post('/rental-applications')
        .set('Authorization', `Bearer ${tenantToken}`)
        .send({
          propertyId: property.id,
          unitId: unit.id,
          fullName: 'Notes Test',
          email: 'notes@test.com',
          phoneNumber: '(555) 666-7777',
          income: 5000,
          employmentStatus: 'Full-time',
          previousAddress: '123 Notes St',
        });

      applicationId = appResponse.body.id;
    });

    it('should add note and create NOTE_ADDED lifecycle event', async () => {
      const response = await request(app.getHttpServer())
        .post(`/rental-applications/${applicationId}/notes`)
        .set('Authorization', `Bearer ${propertyManagerToken}`)
        .send({ body: 'This is a test note' })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.body).toBe('This is a test note');

      // Verify lifecycle event
      const events = await prisma.applicationLifecycleEvent.findMany({
        where: { applicationId },
      });

      const noteEvent = events.find((e) => e.eventType === 'NOTE_ADDED');
      expect(noteEvent).toBeDefined();
    });
  });

  describe('Complete Application Workflow', () => {
    it('should complete full application lifecycle', async () => {
      // 1. Submit application
      const submitResponse = await request(app.getHttpServer())
        .post('/rental-applications')
        .set('Authorization', `Bearer ${tenantToken}`)
        .send({
          propertyId: property.id,
          unitId: unit.id,
          fullName: 'Complete Workflow Test',
          email: 'workflow@test.com',
          phoneNumber: '(555) 888-9999',
          income: 6000,
          employmentStatus: 'Full-time',
          previousAddress: '123 Workflow St',
          creditScore: 750,
        });

      const applicationId = submitResponse.body.id;

      // 2. Move to UNDER_REVIEW
      await request(app.getHttpServer())
        .put(`/rental-applications/${applicationId}/status`)
        .set('Authorization', `Bearer ${propertyManagerToken}`)
        .send({ status: ApplicationStatus.UNDER_REVIEW });

      // 3. Add note
      await request(app.getHttpServer())
        .post(`/rental-applications/${applicationId}/notes`)
        .set('Authorization', `Bearer ${propertyManagerToken}`)
        .send({ body: 'Application looks good' });

      // 4. Create lease for screening
      await prisma.lease.create({
        data: {
          tenantId: tenantUser.id,
          unitId: unit.id,
          startDate: new Date(),
          endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          rentAmount: 2000,
          depositAmount: 2000,
          status: 'ACTIVE',
        },
      });

      // 5. Screen application
      await request(app.getHttpServer())
        .post(`/rental-applications/${applicationId}/screen`)
        .set('Authorization', `Bearer ${propertyManagerToken}`);

      // 6. Approve application
      await request(app.getHttpServer())
        .put(`/rental-applications/${applicationId}/status`)
        .set('Authorization', `Bearer ${propertyManagerToken}`)
        .send({ status: ApplicationStatus.APPROVED });

      // 7. Verify final state
      const finalResponse = await request(app.getHttpServer())
        .get(`/rental-applications/${applicationId}`)
        .set('Authorization', `Bearer ${propertyManagerToken}`)
        .expect(200);

      expect(finalResponse.body.status).toBe(ApplicationStatus.APPROVED);

      // 8. Verify timeline has all events
      const timelineResponse = await request(app.getHttpServer())
        .get(`/rental-applications/${applicationId}/timeline`)
        .set('Authorization', `Bearer ${propertyManagerToken}`)
        .expect(200);

      const eventTypes = timelineResponse.body.map((e: any) => e.eventType);
      expect(eventTypes).toContain('SUBMITTED');
      expect(eventTypes).toContain('UNDER_REVIEW');
      expect(eventTypes).toContain('NOTE_ADDED');
      expect(eventTypes).toContain('SCREENING_STARTED');
      expect(eventTypes).toContain('SCREENING_COMPLETED');
      expect(eventTypes).toContain('APPROVED');
    });
  });
});

