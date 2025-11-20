import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { TestDataFactory } from './factories';
import { MaintenancePriority, Status } from '@prisma/client';

describe('Legacy API Contracts (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;
  let propertyManager: any;
  let tenant: any;
  let property: any;
  let unit: any;
  let lead: any;
  let maintenanceRequest: any;

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
    await prisma.bulkMessageRecipient.deleteMany();
    await prisma.bulkMessageBatch.deleteMany();
    await prisma.message.deleteMany();
    await prisma.conversationParticipant.deleteMany();
    await prisma.conversation.deleteMany();
    await prisma.messageTemplate.deleteMany();
    await prisma.rentalApplicationNote.deleteMany();
    await prisma.autopayEnrollment.deleteMany();
    await prisma.paymentMethod.deleteMany();
    await prisma.scheduleEvent.deleteMany();
    await prisma.inspectionSignature.deleteMany();
    await prisma.inspectionChecklistPhoto.deleteMany();
    await prisma.inspectionChecklistSubItem.deleteMany();
    await prisma.inspectionChecklistItem.deleteMany();
    await prisma.inspectionRoom.deleteMany();
    await prisma.unitInspectionPhoto.deleteMany();
    await prisma.unitInspection.deleteMany();
    await prisma.quickBooksConnection.deleteMany();
    await prisma.lateFee.deleteMany();
    await prisma.recurringInvoiceSchedule.deleteMany();
    await prisma.invoice.deleteMany();
    await prisma.leaseNotice.deleteMany();
    await prisma.leaseRenewalOffer.deleteMany();
    await prisma.esignParticipant.deleteMany();
    await prisma.esignEnvelope.deleteMany();
    await prisma.leaseDocument.deleteMany();
    await prisma.document.deleteMany();
    await prisma.leaseHistory.deleteMany();
    await prisma.maintenancePhoto.deleteMany();
    await prisma.maintenanceNote.deleteMany();
    await prisma.maintenanceRequestHistory.deleteMany();
    await prisma.maintenanceRequest.deleteMany();
    await prisma.technician.deleteMany();
    await prisma.leadMessage.deleteMany();
    await prisma.lead.deleteMany();
    await prisma.lease.deleteMany();
    await prisma.unit.deleteMany();
    await prisma.property.deleteMany();
    await prisma.user.deleteMany();

    propertyManager = await prisma.user.create({
      data: TestDataFactory.createPropertyManager({ username: 'pm_legacy@test.com' }),
    });
    tenant = await prisma.user.create({
      data: TestDataFactory.createUser({ username: 'tenant_legacy@test.com' }),
    });
    property = await prisma.property.create({
      data: TestDataFactory.createProperty(),
    });
    unit = await prisma.unit.create({
      data: TestDataFactory.createUnit(property.id),
    });
    lead = await prisma.lead.create({
      data: {
        sessionId: 'legacy-session',
        name: 'Legacy Lead',
        email: 'legacy@lead.com',
        status: 'NEW',
      },
    });
    await prisma.leadMessage.create({
      data: {
        leadId: lead.id,
        content: 'Hello from seed',
        role: 'USER',
      },
    });
    maintenanceRequest = await prisma.maintenanceRequest.create({
      data: {
        authorId: tenant.id,
        unitId: unit.id,
        title: 'Leaky faucet',
        description: 'Leaky faucet',
        priority: MaintenancePriority.MEDIUM,
        status: Status.PENDING,
      },
    });

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: propertyManager.username, password: 'password123' });
    authToken = loginResponse.body?.token;
  });

  afterAll(async () => {
    await app.close();
  });

  it('exposes /api/leads and polls stats/messages/status', async () => {
    const listResp = await request(app.getHttpServer())
      .get('/api/leads')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);
    expect(listResp.body.leads).toHaveLength(1);

    const statsResp = await request(app.getHttpServer())
      .get('/api/leads/statistics/dashboard')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);
    expect(statsResp.body.stats).toMatchObject({ totalLeads: 1 });

    const messagesResp = await request(app.getHttpServer())
      .get(`/api/leads/${lead.id}/messages`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);
    expect(messagesResp.body.messages).toHaveLength(1);

    const patchResp = await request(app.getHttpServer())
      .patch(`/api/leads/${lead.id}/status`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ status: 'QUALIFIED' })
      .expect(200);
    expect(patchResp.body.lead?.status).toBe('QUALIFIED');
  });

  it('returns maintenance aliases through legacy endpoints', async () => {
    const requestsResp = await request(app.getHttpServer())
      .get('/api/maintenance-requests')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);
    expect(requestsResp.body).toHaveProperty('items') || expect(requestsResp.body).toHaveProperty('requests');

    const tech = await prisma.technician.create({
      data: {
        name: 'Legacy Tech',
        role: 'IN_HOUSE',
      },
    });

    const assignResp = await request(app.getHttpServer())
      .put(`/api/maintenance/${maintenanceRequest.id}/assignee`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ technicianId: tech.id })
      .expect(200);
    expect(assignResp.body).toHaveProperty('assigneeId');

    const techResp = await request(app.getHttpServer())
      .get('/api/users/technicians')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);
    expect(Array.isArray(techResp.body)).toBeTruthy();
  });
});
