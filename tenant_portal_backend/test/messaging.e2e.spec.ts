import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { TestDataFactory } from './factories';
import { Role } from '@prisma/client';
import { resetDatabase } from './utils/reset-database';

describe('Messaging API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tenantToken: string;
  let propertyManagerToken: string;
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
  });

  afterAll(async () => {
    await resetDatabase(prisma);
    await app.close();
  });

  describe('POST /messaging/conversations', () => {
    it('should create conversation', async () => {
      const response = await request(app.getHttpServer())
        .post('/messaging/conversations')
        .set('Authorization', `Bearer ${tenantToken}`)
        .send({
          participantIds: [propertyManager.id],
          subject: 'Test Conversation',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('subject');
    });
  });

  describe('GET /messaging/conversations', () => {
    beforeEach(async () => {
      // Create conversation
      const conversation = await prisma.conversation.create({
        data: {
          subject: 'Test Conversation',
        },
      });

      await prisma.conversationParticipant.createMany({
        data: [
          { conversationId: conversation.id, userId: tenantUser.id },
          { conversationId: conversation.id, userId: propertyManager.id },
        ],
      });
    });

    it('should get conversations for user', async () => {
      const response = await request(app.getHttpServer())
        .get('/messaging/conversations')
        .set('Authorization', `Bearer ${tenantToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('POST /messaging/conversations/:id/messages', () => {
    let conversationId: number;

    beforeEach(async () => {
      const conversation = await prisma.conversation.create({
        data: {
          subject: 'Test Conversation',
        },
      });

      conversationId = conversation.id;

      await prisma.conversationParticipant.createMany({
        data: [
          { conversationId, userId: tenantUser.id },
          { conversationId, userId: propertyManager.id },
        ],
      });
    });

    it('should send message in conversation', async () => {
      const response = await request(app.getHttpServer())
        .post(`/messaging/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${tenantToken}`)
        .send({
          content: 'Hello, this is a test message',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.content).toBe('Hello, this is a test message');
    });
  });

  describe('GET /messaging/conversations/:id/messages', () => {
    let conversationId: number;

    beforeEach(async () => {
      const conversation = await prisma.conversation.create({
        data: {
          subject: 'Test Conversation',
        },
      });

      conversationId = conversation.id;

      await prisma.conversationParticipant.createMany({
        data: [
          { conversationId, userId: tenantUser.id },
          { conversationId, userId: propertyManager.id },
        ],
      });

      // Create messages
      await prisma.message.createMany({
        data: [
          {
            conversationId,
            senderId: tenantUser.id,
            content: 'Message 1',
          },
          {
            conversationId,
            senderId: propertyManager.id,
            content: 'Message 2',
          },
        ],
      });
    });

    it('should get messages in conversation', async () => {
      const response = await request(app.getHttpServer())
        .get(`/messaging/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${tenantToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('content');
    });
  });
});

