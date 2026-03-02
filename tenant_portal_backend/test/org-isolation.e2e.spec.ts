import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { TestDataFactory } from './factories';
import { OrgRole } from '@prisma/client';
import { resetDatabase } from './utils/reset-database';

describe('Org Isolation (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let orgAToken: string;
  let orgBToken: string;
  let orgAPropertyId: string;
  let orgBPropertyId: string;

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

    const [orgA, orgB] = await Promise.all([
      prisma.organization.create({ data: { name: 'Org A' } }),
      prisma.organization.create({ data: { name: 'Org B' } }),
    ]);

    const [pmA, pmB] = await Promise.all([
      prisma.user.create({
        data: TestDataFactory.createPropertyManager({ username: 'pmA@test.com' }),
      }),
      prisma.user.create({
        data: TestDataFactory.createPropertyManager({ username: 'pmB@test.com' }),
      }),
    ]);

    await Promise.all([
      prisma.userOrganization.create({
        data: { userId: pmA.id, organizationId: orgA.id, role: OrgRole.ADMIN },
      }),
      prisma.userOrganization.create({
        data: { userId: pmB.id, organizationId: orgB.id, role: OrgRole.ADMIN },
      }),
    ]);

    const [loginA, loginB] = await Promise.all([
      request(app.getHttpServer()).post('/auth/login').send({ username: 'pmA@test.com', password: 'password123' }),
      request(app.getHttpServer()).post('/auth/login').send({ username: 'pmB@test.com', password: 'password123' }),
    ]);

    orgAToken = loginA.body.accessToken;
    orgBToken = loginB.body.accessToken;

    const [propertyA, propertyB] = await Promise.all([
      prisma.property.create({
        data: TestDataFactory.createProperty({ name: 'Org A Property', organizationId: orgA.id }),
      }),
      prisma.property.create({
        data: TestDataFactory.createProperty({ name: 'Org B Property', organizationId: orgB.id }),
      }),
    ]);

    orgAPropertyId = propertyA.id;
    orgBPropertyId = propertyB.id;
  });

  afterAll(async () => {
    await resetDatabase(prisma);
    await app.close();
  });

  it('scopes property list to org', async () => {
    const response = await request(app.getHttpServer())
      .get('/property')
      .set('Authorization', `Bearer ${orgAToken}`)
      .expect(200);

    const names = response.body.map((item: { name: string }) => item.name);
    expect(names).toContain('Org A Property');
    expect(names).not.toContain('Org B Property');
  });

  it('blocks cross-org property access', async () => {
    await request(app.getHttpServer())
      .get(`/property/${orgBPropertyId}`)
      .set('Authorization', `Bearer ${orgAToken}`)
      .expect(404);

    await request(app.getHttpServer())
      .get(`/property/${orgAPropertyId}`)
      .set('Authorization', `Bearer ${orgBToken}`)
      .expect(404);
  });
});
