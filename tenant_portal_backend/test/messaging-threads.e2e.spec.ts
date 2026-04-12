import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { TestDataFactory } from './factories';
import { resetDatabase } from './utils/reset-database';
import { Role } from '@prisma/client';

describe('Messaging threads API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tenantToken: string;
  let tenantUser: any;
  let propertyManager: any;

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

    tenantUser = await prisma.user.create({
      data: TestDataFactory.createUser({ username: 'tenant@test.com', role: Role.TENANT }),
    });
    propertyManager = await prisma.user.create({
      data: TestDataFactory.createPropertyManager({ username: 'pm@test.com' }),
    });

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: 'tenant@test.com', password: 'password123' });

    tenantToken = loginResponse.body.accessToken;
  });

  afterAll(async () => {
    await resetDatabase(prisma);
    await app.close();
  });

  it('lets a tenant create a thread with recipientId, subject, and content', async () => {
    const response = await request(app.getHttpServer())
      .post('/messaging/threads')
      .set('Authorization', `Bearer ${tenantToken}`)
      .send({
        recipientId: propertyManager.id,
        subject: 'Lease question',
        content: 'Can we review the renewal timeline?',
      })
      .expect(201);

    expect(response.body).toMatchObject({
      id: expect.any(Number),
      subject: 'Lease question',
      initialMessage: expect.objectContaining({
        id: expect.any(Number),
        content: 'Can we review the renewal timeline?',
        conversationId: response.body.id,
      }),
    });
    expect(Array.isArray(response.body.participants)).toBe(true);
    expect(response.body.data).toBeUndefined();
  });

  it('rejects missing recipientId for the tenant thread flow', async () => {
    await request(app.getHttpServer())
      .post('/messaging/threads')
      .set('Authorization', `Bearer ${tenantToken}`)
      .send({ subject: 'Lease question', content: 'Hello' })
      .expect(400);
  });

  it('rejects an unknown recipient', async () => {
    await request(app.getHttpServer())
      .post('/messaging/threads')
      .set('Authorization', `Bearer ${tenantToken}`)
      .send({
        recipientId: '11111111-1111-4111-8111-111111111111',
        subject: 'Lease question',
        content: 'Hello',
      })
      .expect(400);
  });
});
