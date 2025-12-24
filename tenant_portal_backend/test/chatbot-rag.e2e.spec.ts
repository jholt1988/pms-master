import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import http, { IncomingMessage, ServerResponse } from 'http';
import { AddressInfo } from 'net';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { TestDataFactory } from './factories';
import { Role } from '@prisma/client';
import { resetDatabase } from './utils/reset-database';

describe('Chatbot RAG API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tenantToken: string;
  let ragServer: http.Server;
  let ragServiceUrl: string;

  beforeAll(async () => {
    ragServer = http.createServer((req: IncomingMessage, res: ServerResponse) => {
      if (req.method === 'GET' && req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok' }));
        return;
      }

      if (req.method === 'POST' && req.url === '/message') {
        let body = '';
        req.on('data', (chunk) => {
          body += chunk;
        });
        req.on('end', () => {
          const payload = JSON.parse(body || '{}');
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              session_id: `rag-${payload.user_id}`,
              intent: 'rent_question',
              workflow: 'rent_reminder',
              response: { content: 'RAG: rent is due on the 1st. You can pay via the portal.' },
              documents: ['Rent payment options'],
              history_length: 2,
            }),
          );
        });
        return;
      }

      res.writeHead(404);
      res.end();
    });

    await new Promise<void>((resolve) => {
      ragServer.listen(0, '127.0.0.1', () => resolve());
    });

    ragServiceUrl = `http://127.0.0.1:${(ragServer.address() as AddressInfo).port}`;
    process.env.AI_RAG_ENABLED = 'true';
    process.env.AI_RAG_SERVICE_URL = ragServiceUrl;
    process.env.AI_RAG_TIMEOUT_MS = '1500';
    process.env.AI_ENABLED = 'false';

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

    await prisma.user.create({
      data: TestDataFactory.createUser({
        username: 'tenant@test.com',
        role: Role.TENANT,
      }),
    });

    const tenantLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: 'tenant@test.com', password: 'password123' });
    tenantToken = tenantLogin.body.accessToken;
  });

  afterAll(async () => {
    if (ragServer) {
      ragServer.close();
    }
    await resetDatabase(prisma);
    await app.close();
  });

  it('returns RAG-enriched responses and workflow metadata', async () => {
    const response = await request(app.getHttpServer())
      .post('/chatbot/message')
      .set('Authorization', `Bearer ${tenantToken}`)
      .send({ message: 'I am late on rent, what should I do?' })
      .expect(201);

    expect(response.body.message).toContain('RAG: rent is due on the 1st');
    expect(response.body.rag_workflow).toBe('rent_reminder');
    expect(response.body.rag_documents).toContain('Rent payment options');
    expect(response.body.rag_session_id).toContain('rag-');
    expect(response.body.suggestedActions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          action: 'navigate',
          params: { path: '/payments' },
        }),
      ]),
    );
  });
});
