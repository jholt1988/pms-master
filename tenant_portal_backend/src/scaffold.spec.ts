// Test Specs for Scaffold Stories
// Covers Stories 11-22 endpoints

import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { PropertyRadialController } from './property-radial.controller';
import { UnitsRadialController } from './units-radial.controller';
import { TenantProfileController } from './tenant-profile.controller';
import { AuthController } from './auth.controller';
import { DecisionEngineController } from './decision-engine.controller';
import { LeaseLifecycleController } from './lease-lifecycle.controller';
import { PrismaService } from '../prisma/prisma.service';

describe('Story 11: Tenant Profile', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [TenantProfileController],
      providers: [PrismaService],
    }).compile();

    app = module.createNestApplication();
    prisma = module.get<PrismaService>(PrismaService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /tenants', () => {
    it('creates tenant with valid data', async () => {
      prisma.unit.findUnique = jest.fn().mockResolvedValue({ id: 1, name: 'Unit 101' });
      prisma.tenant.create = jest.fn().mockResolvedValue({
        id: 1,
        fullName: 'John Doe',
        email: 'john@example.com',
        phone: '555-123-4567',
      });

      const res = await fetch('/api/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: 'John Doe',
          email: 'john@example.com',
          phone: '555-123-4567',
          unitId: 1,
        }),
      });

      expect(res.status).toBe(201);
      expect(prisma.tenant.create).toHaveBeenCalled();
    });

    it('rejects missing required fields', async () => {
      const res = await fetch('/api/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: 'John' }),
      });

      expect(res.status).toBe(400);
    });
  });
});

describe('Story 12: Auth & Sessions', () => {
  describe('POST /auth/login', () => {
    it('returns tokens on valid credentials', async () => {
      prisma.user.findUnique = jest.fn().mockResolvedValue({
        id: 'user-1',
        email: 'admin@test.com',
        passwordHash: 'hashed',
        role: 'ADMIN',
        organizationId: 'org-1',
        isActive: true,
      });
      prisma.refreshToken.create = jest.fn().mockResolvedValue({});

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@test.com', password: 'password123' }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.accessToken).toBeDefined();
      expect(body.refreshToken).toBeDefined();
    });

    it('rejects invalid credentials', async () => {
      prisma.user.findUnique = jest.fn().mockResolvedValue(null);

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'wrong@test.com', password: 'wrong' }),
      });

      expect(res.status).toBe(401);
    });
  });

  describe('POST /auth/refresh', () => {
    it('issues new access token on valid refresh', async () => {
      prisma.refreshToken.findFirst = jest.fn().mockResolvedValue({
        id: 1,
        user: { id: 'user-1', email: 'admin@test.com', role: 'ADMIN', organizationId: 'org-1' },
      });
      prisma.refreshToken.update = jest.fn().mockResolvedValue({});
      prisma.refreshToken.create = jest.fn().mockResolvedValue({});

      const res = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: 'valid-refresh-token' }),
      });

      expect(res.status).toBe(200);
      expect(prisma.refreshToken.update).toHaveBeenCalled(); // token rotation
    });
  });
});

describe('Story 13: Decision Engine', () => {
  describe('GET /copilot/decisions', () => {
    it('returns active decisions', async () => {
      prisma.decision.findMany = jest.fn().mockResolvedValue([
        { id: 1, domain: 'payments', title: 'Payment overdue', priority: 80, resolved: false },
        { id: 2, domain: 'repairs', title: 'Schedule repair', priority: 60, resolved: false },
      ]);
      prisma.decision.count = jest.fn().mockResolvedValue(2);

      const res = await fetch('/api/copilot/decisions?status=active');
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data).toHaveLength(2);
      expect(body.total).toBe(2);
    });
  });

  describe('POST /copilot/decisions/:id/resolve', () => {
    it('resolves a decision', async () => {
      prisma.decision.findUnique = jest.fn().mockResolvedValue({ id: 1, title: 'Test' });
      prisma.decision.update = jest.fn().mockResolvedValue({ resolved: true, resolvedAt: new Date() });

      const res = await fetch('/api/copilot/decisions/1/resolve', {
        method: 'POST',
        body: JSON.stringify({ resolution: 'Completed' }),
      });

      expect(res.status).toBe(200);
      expect(prisma.decision.update).toHaveBeenCalled();
    });
  });
});

describe('Story 16: Lease Lifecycle', () => {
  describe('POST /leases', () => {
    it('creates lease with valid data', async () => {
      prisma.tenant.findUnique = jest.fn().mockResolvedValue({ id: 1, fullName: 'Tenant' });
      prisma.unit.findUnique = jest.fn().mockResolvedValue({ id: 1, status: 'VACANT' });
      prisma.lease.create = jest.fn().mockResolvedValue({ id: 1, status: 'PENDING' });
      prisma.unit.update = jest.fn().mockResolvedValue({});
      prisma.decision.create = jest.fn().mockResolvedValue({});

      const res = await fetch('/api/leases', {
        method: 'POST',
        body: JSON.stringify({
          tenantId: 1,
          unitId: 1,
          startDate: '2026-01-01',
          endDate: '2027-01-01',
          monthlyRent: 1500,
        }),
      });

      expect(res.status).toBe(201);
    });

    it('rejects leased unit', async () => {
      prisma.unit.findUnique = jest.fn().mockResolvedValue({ id: 1, status: 'LEASED' });

      const res = await fetch('/api/leases', {
        method: 'POST',
        body: JSON.stringify({ tenantId: 1, unitId: 1 }),
      });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /leases/:id/renew', () => {
    it('renews active lease', async () => {
      prisma.lease.findUnique = jest.fn().mockResolvedValue({
        id: 1, status: 'ACTIVE', unitId: 1, tenantId: 1, endDate: new Date('2026-12-31'),
      });
      prisma.lease.create = jest.fn().mockResolvedValue({ id: 2, status: 'PENDING' });
      prisma.lease.update = jest.fn().mockResolvedValue({});
      prisma.unit.update = jest.fn().mockResolvedValue({});

      const res = await fetch('/api/leases/1/renew', {
        method: 'POST',
        body: JSON.stringify({ newMonthlyRent: 1600 }),
      });

      expect(res.status).toBe(201);
    });
  });
});

describe('Story 20: Vendor Management', () => {
  describe('POST /vendors', () => {
    it('creates vendor', async () => {
      prisma.vendor.create = jest.fn().mockResolvedValue({ id: 1, name: 'ABC Plumbing' });

      const res = await fetch('/api/vendors', {
        method: 'POST',
        body: JSON.stringify({ name: 'ABC Plumbing', category: 'PLUMBING' }),
      });

      expect(res.status).toBe(201);
    });
  });

  describe('POST /vendors/:id/rate', () => {
    it('rates vendor 1-5', async () => {
      prisma.vendor.findUnique = jest.fn().mockResolvedValue({ id: 1 });
      prisma.vendorRating.create = jest.fn().mockResolvedValue({ id: 1, rating: 5 });
      prisma.vendorRating.findMany = jest.fn().mockResolvedValue([{ rating: 5 }]);
      prisma.vendor.update = jest.fn().mockResolvedValue({});

      const res = await fetch('/api/vendors/1/rate', {
        method: 'POST',
        body: JSON.stringify({ rating: 5, comment: 'Great work!' }),
      });

      expect(res.status).toBe(201);
    });
  });
});

describe('Story 22: Webhooks', () => {
  describe('POST /webhooks', () => {
    it('creates webhook with HTTPS URL', async () => {
      prisma.webhook.create = jest.fn().mockResolvedValue({ id: 1, name: 'Test', url: 'https://example.com/hook' });

      const res = await fetch('/api/webhooks', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test', url: 'https://example.com/hook', events: ['payment.created'] }),
      });

      expect(res.status).toBe(201);
    });

    it('rejects non-HTTPS URL', async () => {
      const res = await fetch('/api/webhooks', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test', url: 'http://example.com', events: [] }),
      });

      expect(res.status).toBe(400);
    });
  });
});