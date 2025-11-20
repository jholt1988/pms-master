import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { EsignEnvelopeStatus } from '@prisma/client';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { TestDataFactory } from './factories';

describe('EsignatureModule (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let pmToken: string;
  let tenantToken: string;
  let lease: any;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();

    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await prisma.notification.deleteMany();
    await prisma.esignParticipant.deleteMany();
    await prisma.esignEnvelope.deleteMany();
    await prisma.document.deleteMany();
    await prisma.lease.deleteMany();
    await prisma.unit.deleteMany();
    await prisma.property.deleteMany();
    await prisma.user.deleteMany();

    await prisma.user.create({ data: TestDataFactory.createPropertyManager({ username: 'pm@test.com' }) });
    const tenant = await prisma.user.create({ data: TestDataFactory.createUser({ username: 'tenant@test.com' }) });
    const property = await prisma.property.create({ data: TestDataFactory.createProperty() });
    const unit = await prisma.unit.create({ data: TestDataFactory.createUnit(property.id) });

    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setFullYear(endDate.getFullYear() + 1);

    lease = await prisma.lease.create({
      data: {
        tenantId: tenant.id,
        unitId: unit.id,
        startDate,
        endDate,
        rentAmount: 1500,
        status: 'ACTIVE',
      },
    });

    const pmLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: 'pm@test.com', password: 'password123' });
    pmToken = pmLogin.body.access_token;

    const tenantLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: 'tenant@test.com', password: 'password123' });
    tenantToken = tenantLogin.body.access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  it('creates envelopes, launches recipient view, and processes completion webhook', async () => {
    const createResponse = await request(app.getHttpServer())
      .post(`/esignature/leases/${lease.id}/envelopes`)
      .set('Authorization', `Bearer ${pmToken}`)
      .send({
        templateId: 'STANDARD-TEMPLATE',
        recipients: [
          { name: 'Tenant Test', email: 'tenant@test.com', role: 'TENANT', userId: lease.tenantId },
        ],
      })
      .expect(201);

    expect(createResponse.body).toHaveProperty('providerEnvelopeId');

    const recipientView = await request(app.getHttpServer())
      .post(`/esignature/envelopes/${createResponse.body.id}/recipient-view`)
      .set('Authorization', `Bearer ${tenantToken}`)
      .send({ returnUrl: 'https://portal.test/success' })
      .expect(201);

    expect(recipientView.body.url).toContain('envelope');

    await request(app.getHttpServer())
      .post('/webhooks/esignature')
      .send({
        envelopeId: createResponse.body.providerEnvelopeId,
        status: 'COMPLETED',
        participants: [{ email: 'tenant@test.com', status: 'SIGNED' }],
        documents: [
          {
            name: 'signed.pdf',
            type: 'combined',
            contentBase64: Buffer.from('pdf-content').toString('base64'),
          },
          {
            name: 'certificate.pdf',
            type: 'certificate',
            contentBase64: Buffer.from('audit').toString('base64'),
          },
        ],
      })
      .expect(200);

    const envelopes = await request(app.getHttpServer())
      .get(`/esignature/leases/${lease.id}/envelopes`)
      .set('Authorization', `Bearer ${tenantToken}`)
      .expect(200);

    expect(envelopes.body[0].status).toBe(EsignEnvelopeStatus.COMPLETED);
  });
});
