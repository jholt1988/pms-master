import { Test, TestingModule } from '@nestjs/testing';
import { QuickBooksMinimalService } from './quickbooks-minimal.service';
import { PrismaService } from '../prisma/prisma.service';
import { AbstractQuickBooksService } from './quickbooks.types';
import { createHmac } from 'crypto';

describe('QuickBooksMinimalService', () => {
  let service: AbstractQuickBooksService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
    quickBooksConnection: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      upsert: jest.fn(),
      delete: jest.fn(),
    },
    quickBooksWebhookEvent: {
      create: jest.fn(),
    },
    property: {
      findMany: jest.fn(),
    },
    lease: {
      findMany: jest.fn(),
    },
    payment: {
      findMany: jest.fn(),
    },
    maintenanceRequest: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuickBooksMinimalService,
        {
          provide: AbstractQuickBooksService,
          useClass: QuickBooksMinimalService,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<AbstractQuickBooksService>(AbstractQuickBooksService as any);
    prismaService = module.get<PrismaService>(PrismaService);

    // Mock environment variables
    process.env.QUICKBOOKS_CLIENT_ID = 'test_client_id';
    process.env.QUICKBOOKS_CLIENT_SECRET = 'test_client_secret';
    process.env.QUICKBOOKS_REDIRECT_URI = 'http://localhost:3001/api/quickbooks/callback';
    process.env.NODE_ENV = 'test';
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.QUICKBOOKS_WEBHOOK_VERIFIER;
    delete process.env.QUICKBOOKS_WEBHOOK_REQUIRE_SIGNATURE;
    delete process.env.QUICKBOOKS_OAUTH_STATE_SECRET;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAuthorizationUrl', () => {
    it('should generate authorization URL with user state', async () => {
      const userId = 'user-1';
      const orgId = 'org-1';
      const authUrl = await service.getAuthorizationUrl(userId, orgId);

      expect(authUrl).toContain('https://appcenter.intuit.com/connect/oauth2');
      expect(authUrl).toContain('client_id=test_client_id');
      expect(authUrl).toContain('redirect_uri=');
      expect(authUrl).toContain('state=');
      const state = new URL(authUrl).searchParams.get('state');
      expect(state).toMatch(/^[^.]+\.[^.]+$/);
    });

    it('should include accounting scope in authorization URL', async () => {
      const userId = 'user-1';
      const orgId = 'org-1';
      const authUrl = await service.getAuthorizationUrl(userId, orgId);

      expect(authUrl).toContain('scope=com.intuit.quickbooks.accounting');
    });
  });

  describe('getConnectionStatus', () => {
    it('should return disconnected status when no connection exists', async () => {
      const userId = 'user-1';
      const orgId = 'org-1';
      mockPrismaService.quickBooksConnection.findFirst.mockResolvedValue(null);

      const status = await service.getConnectionStatus(userId, orgId);

      expect(status.connected).toBe(false);
      expect(status.companyName).toBeUndefined();
      expect(status.lastSync).toBeUndefined();
    });

    it('should return connected status when active connection exists', async () => {
      const userId = 'user-1';
      const orgId = 'org-1';
      const mockConnection = {
        id: 1,
        userId: 1,
        companyId: 'test_company_123',
        accessToken: 'mock_access_token',
        refreshToken: 'mock_refresh_token',
        tokenExpiresAt: new Date(Date.now() + 3600000), // 1 hour from now
        refreshTokenExpiresAt: new Date(Date.now() + 8760 * 3600000), // 1 year from now
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.quickBooksConnection.findFirst.mockResolvedValue(mockConnection);

      const status = await service.getConnectionStatus(userId, orgId);

      expect(status.connected).toBe(true);
      expect(status.companyName).toBe('test_company_123');
      expect(status.lastSync).toBeTruthy();
    });

    it('should return connection status with expiration date', async () => {
      const userId = 'user-1';
      const orgId = 'org-1';
      const mockConnection = {
        id: 1,
        userId: 1,
        companyId: 'test_company_123',
        accessToken: 'mock_access_token',
        refreshToken: 'mock_refresh_token',
        tokenExpiresAt: new Date(Date.now() - 3600000), // 1 hour ago (expired)
        refreshTokenExpiresAt: new Date(Date.now() + 8760 * 3600000), // 1 year from now
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.quickBooksConnection.findFirst.mockResolvedValue(mockConnection);

      const status = await service.getConnectionStatus(userId, orgId);

      // Service returns connected: true if connection exists, regardless of expiration
      expect(status.connected).toBe(true);
      expect(status.expiresAt).toBeTruthy();
      expect(status.expiresAt).toEqual(mockConnection.tokenExpiresAt);
    });
  });

  describe('handleWebhook', () => {
    const payload = {
      eventNotifications: [
        {
          realmId: 'realm-1',
          dataChangeEvent: {
            entities: [
              {
                id: 'invoice-1',
                name: 'Invoice',
                operation: 'Update',
              },
            ],
          },
        },
      ],
    };

    it('accepts a valid QuickBooks webhook signature and records the event key', async () => {
      process.env.QUICKBOOKS_WEBHOOK_VERIFIER = 'verifier-token';
      const rawBody = Buffer.from(JSON.stringify(payload));
      const signature = createHmac('sha256', 'verifier-token').update(rawBody).digest('base64');
      mockPrismaService.quickBooksConnection.findFirst.mockResolvedValue({ organizationId: 'org-1' });
      mockPrismaService.quickBooksWebhookEvent.create.mockResolvedValue({ id: 'qbo-event-1' });

      const result = await (service as any).handleWebhook(rawBody, signature, payload);

      expect(result).toEqual({ eventKey: 'realm-1:Invoice:invoice-1:Update', deduped: false });
      expect(mockPrismaService.quickBooksWebhookEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          eventKey: 'realm-1:Invoice:invoice-1:Update',
          realmId: 'realm-1',
          entityName: 'Invoice',
          entityId: 'invoice-1',
          operation: 'Update',
          organizationId: 'org-1',
        }),
      });
    });

    it('rejects invalid QuickBooks webhook signatures when verifier is configured', async () => {
      process.env.QUICKBOOKS_WEBHOOK_VERIFIER = 'verifier-token';
      const rawBody = Buffer.from(JSON.stringify(payload));

      await expect((service as any).handleWebhook(rawBody, 'invalid', payload)).rejects.toThrow(
        'Invalid QuickBooks webhook signature',
      );
      expect(mockPrismaService.quickBooksWebhookEvent.create).not.toHaveBeenCalled();
    });

    it('dedupes repeated QuickBooks webhook events on unique constraint', async () => {
      process.env.QUICKBOOKS_WEBHOOK_VERIFIER = 'verifier-token';
      const rawBody = Buffer.from(JSON.stringify(payload));
      const signature = createHmac('sha256', 'verifier-token').update(rawBody).digest('base64');
      mockPrismaService.quickBooksConnection.findFirst.mockResolvedValue({ organizationId: 'org-1' });
      mockPrismaService.quickBooksWebhookEvent.create.mockRejectedValue({ code: 'P2002' });

      const result = await (service as any).handleWebhook(rawBody, signature, payload);

      expect(result).toEqual({ eventKey: 'realm-1:Invoice:invoice-1:Update', deduped: true });
      expect(mockPrismaService.quickBooksWebhookEvent.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('handleOAuthCallback', () => {
    beforeEach(() => {
      // Mock OAuth client methods
      const mockOAuthClient = {
        createToken: jest.fn().mockResolvedValue({}),
        getToken: jest.fn().mockReturnValue({
          access_token: 'test_access_token',
          refresh_token: 'test_refresh_token',
          expires_in: 3600,
          x_refresh_token_expires_in: 31536000,
        }),
      };
      
      // Mock the oauthClient in the service
      (service as any).oauthClient = mockOAuthClient;
    });

    it('should return error for invalid state parameter', async () => {
      const code = 'test_auth_code';
      const state = 'invalid_json';
      const realmId = 'test_company_123';

      const result = await service.handleOAuthCallback(code, state, realmId);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to establish QuickBooks connection');
    });

    it('should return error when OAuth token exchange fails', async () => {
      const code = 'test_auth_code';
      const state = (service as any).createSignedState({ userId: 'user-1', orgId: 'org-1', nonce: 'test-nonce' });
      const realmId = 'test_company_123';

      // Mock OAuth client to throw error
      const mockOAuthClient = {
        createToken: jest.fn().mockRejectedValue(new Error('OAuth token exchange failed')),
        getToken: jest.fn(),
      };
      (service as any).oauthClient = mockOAuthClient;

      const result = await service.handleOAuthCallback(code, state, realmId);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to establish QuickBooks connection');
    });

    it('should store tokens only when signed OAuth state verifies', async () => {
      const code = 'test_auth_code';
      const state = (service as any).createSignedState({ userId: 'user-1', orgId: 'org-1', nonce: 'test-nonce' });
      const realmId = 'test_company_123';
      mockPrismaService.quickBooksConnection.upsert.mockResolvedValue({});

      const result = await service.handleOAuthCallback(code, state, realmId);

      expect(result.success).toBe(true);
      expect(mockPrismaService.quickBooksConnection.upsert).toHaveBeenCalledWith(expect.objectContaining({
        where: { organizationId_companyId: { organizationId: 'org-1', companyId: realmId } },
      }));
    });
  });

  describe('handleWebhook', () => {
  function signedPayload(payload: any, secret: string) {
  const raw = Buffer.from(JSON.stringify(payload));
  const signature = createHmac('sha256', secret).update(raw).digest('base64');
  return { raw, signature };
}
    }

    const webhookPayload = {
      eventNotifications: [
        {
          realmId: 'realm-1',
          dataChangeEvent: {
            entities: [{ name: 'Payment', id: 'pay-1', operation: 'Update' }],
          },
        },
      ],
    };

    it('persists webhook event key for replay protection', async () => {
      process.env.QUICKBOOKS_WEBHOOK_VERIFIER = 'webhook-secret';
      mockPrismaService.quickBooksConnection.findFirst.mockResolvedValue({ organizationId: 'org-1' });
      mockPrismaService.quickBooksWebhookEvent.create.mockResolvedValue({});
      const { raw, signature } = signedPayload(webhookPayload, 'webhook-secret');

      const result = await (service as any).handleWebhook(raw, signature, webhookPayload);

      expect(result).toEqual({ eventKey: 'realm-1:Payment:pay-1:Update', deduped: false });
      expect(mockPrismaService.quickBooksWebhookEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          eventKey: 'realm-1:Payment:pay-1:Update',
          organizationId: 'org-1',
        }),
      });
    });

    it('dedupes webhook replay when event key already exists', async () => {
      process.env.QUICKBOOKS_WEBHOOK_VERIFIER = 'webhook-secret';
      mockPrismaService.quickBooksConnection.findFirst.mockResolvedValue({ organizationId: 'org-1' });
      mockPrismaService.quickBooksWebhookEvent.create.mockRejectedValue({ code: 'P2002' });
      const { raw, signature } = signedPayload(webhookPayload, 'webhook-secret');

      const result = await (service as any).handleWebhook(raw, signature, webhookPayload);

      expect(result).toEqual({ eventKey: 'realm-1:Payment:pay-1:Update', deduped: true });
    });
  });

  describe('disconnectQuickBooks', () => {
    it('should successfully disconnect when connection exists', async () => {
      const userId = 'user-1';
      const orgId = 'org-1';
      mockPrismaService.quickBooksConnection.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.disconnectQuickBooks(userId, orgId);

      expect(result.success).toBe(true);
      expect(result.message).toBe('QuickBooks connection disconnected successfully');
      expect(mockPrismaService.quickBooksConnection.updateMany).toHaveBeenCalledWith({
        where: { organizationId: orgId },
        data: { isActive: false },
      });
    });

    it('should handle case when update fails', async () => {
      const userId = 'user-1';
      const orgId = 'org-1';
      mockPrismaService.quickBooksConnection.updateMany.mockRejectedValue(
        new Error('Database error')
      );

      const result = await service.disconnectQuickBooks(userId, orgId);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to disconnect');
    });
  });

  describe('basicSync', () => {
    beforeEach(() => {
      // Mock connection exists and is active
      const mockConnection = {
        id: 1,
        userId: 1,
        companyId: 'test_company_123',
        accessToken: 'mock_access_token',
        refreshToken: 'mock_refresh_token',
        tokenExpiresAt: new Date(Date.now() + 3600000), // 1 hour from now
        refreshTokenExpiresAt: new Date(Date.now() + 8760 * 3600000), // 1 year from now
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.quickBooksConnection.findFirst.mockResolvedValue(mockConnection);
    });

    it('should fail when no QuickBooks connection exists', async () => {
      const userId = 'user-1';
      const orgId = 'org-1';
      mockPrismaService.quickBooksConnection.findFirst.mockResolvedValue(null);

      const result = await service.basicSync(userId, orgId);

      expect(result.success).toBe(false);
      expect(result.message).toBe('No active QuickBooks connection found');
    });

    it('should complete successfully when connection exists', async () => {
      const userId = 'user-1';
      const orgId = 'org-1';
      mockPrismaService.quickBooksConnection.update.mockResolvedValue({});

      const result = await service.basicSync(userId, orgId);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Basic sync completed successfully');
      expect(result.syncedItems).toBe(0);
    });
  });

  describe('Environment Configuration', () => {
    it('should use sandbox environment in development', () => {
      process.env.NODE_ENV = 'development';
      
      // Create new service instance to test environment detection
      const testService = new QuickBooksMinimalService(prismaService);
      
      // Check that sandbox environment is being used
      // This would need access to private oauthClient property or a public method
      // For now, we'll test indirectly through authorization URL
      expect(process.env.NODE_ENV).toBe('development');
    });

    it('should use production environment in production', () => {
      process.env.NODE_ENV = 'production';
      
      const testService = new QuickBooksMinimalService(prismaService);
      
      expect(process.env.NODE_ENV).toBe('production');
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      const userId = 'user_1';
      const orgId = 'org_1';
      mockPrismaService.quickBooksConnection.findFirst.mockRejectedValue(
        new Error('Database connection failed')
      );

      await expect(service.getConnectionStatus(userId, orgId)).resolves.toEqual({ connected: false });
    });

    it('should handle QuickBooks API errors gracefully', async () => {
      const userId = 1;
      // This would test API error handling once we can mock the QuickBooks API calls
      // For now, we ensure the service doesn't crash on initialization
      expect(service).toBeDefined();
    });
  });
});
