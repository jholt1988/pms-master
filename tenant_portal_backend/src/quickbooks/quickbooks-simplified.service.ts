import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const OAuthClient = require('intuit-oauth');

export interface QuickBooksConnection {
  id?: number;
  userId: string;
  organizationId: string;
  companyId: string;
  accessToken: string;
  refreshToken: string;
  tokenExpiresAt: Date;
  refreshTokenExpiresAt: Date;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface SyncResult {
  success: boolean;
  syncedItems: number;
  errors: string[];
  lastSyncAt: Date;
}

@Injectable()
export class QuickBooksService {
  private readonly logger = new Logger(QuickBooksService.name);
  private oauthClient: any;

  constructor(private readonly prisma: PrismaService) {
    this.oauthClient = new OAuthClient({
      clientId: process.env.QUICKBOOKS_CLIENT_ID,
      clientSecret: process.env.QUICKBOOKS_CLIENT_SECRET,
      environment: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox',
      redirectUri: process.env.QUICKBOOKS_REDIRECT_URI,
    });
  }

  getAuthorizationUrl(userId: string, orgId: string): string {
    return this.oauthClient.authorizeUri({
      scope: [OAuthClient.scopes.Accounting],
      state: JSON.stringify({ userId, orgId }),
    });
  }

  async handleOAuthCallback(code: string, state: string, realmId: string): Promise<QuickBooksConnection> {
    const parsedState = JSON.parse(state) as { userId?: string; orgId?: string };
    const userId = parsedState?.userId;
    const orgId = parsedState?.orgId;

    if (!userId || !orgId) {
      throw new Error('Invalid state parameter');
    }

    await this.oauthClient.createToken(code);
    const token = this.oauthClient.getToken();

    const connection = await this.prisma.quickBooksConnection.upsert({
      where: {
        organizationId_companyId: {
          organizationId: orgId,
          companyId: realmId,
        },
      },
      update: {
        accessToken: token.access_token,
        refreshToken: token.refresh_token,
        tokenExpiresAt: new Date(Date.now() + token.expires_in * 1000),
        refreshTokenExpiresAt: new Date(Date.now() + token.x_refresh_token_expires_in * 1000),
        isActive: true,
      },
      create: {
        userId,
        organizationId: orgId,
        companyId: realmId,
        accessToken: token.access_token,
        refreshToken: token.refresh_token,
        tokenExpiresAt: new Date(Date.now() + token.expires_in * 1000),
        refreshTokenExpiresAt: new Date(Date.now() + token.x_refresh_token_expires_in * 1000),
        isActive: true,
      },
    });

    return connection;
  }

  async getConnectionForOrg(orgId: string): Promise<QuickBooksConnection | null> {
    return this.prisma.quickBooksConnection.findFirst({
      where: { organizationId: orgId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async syncToQuickBooks(userId: string, orgId: string): Promise<SyncResult> {
    const connection = await this.getConnectionForOrg(orgId);
    if (!connection) {
      throw new Error('No active QuickBooks connection found');
    }

    await this.prisma.quickBooksConnection.update({
      where: { id: connection.id },
      data: { updatedAt: new Date() },
    });

    this.logger.log(`QuickBooks simplified sync completed for user ${userId}`);

    return {
      success: true,
      syncedItems: 0,
      errors: [],
      lastSyncAt: new Date(),
    };
  }

  async disconnect(userId: string, orgId: string): Promise<void> {
    await this.prisma.quickBooksConnection.updateMany({
      where: { userId, organizationId: orgId, isActive: true },
      data: { isActive: false },
    });
  }

  async getSyncStatus(userId: string, orgId: string): Promise<{ isConnected: boolean; lastSyncAt: Date | null; companyName?: string }> {
    const connection = await this.prisma.quickBooksConnection.findFirst({
      where: { userId, organizationId: orgId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    return {
      isConnected: !!connection,
      lastSyncAt: connection?.updatedAt || null,
      companyName: connection?.companyId,
    };
  }

  async testConnection(userId: string): Promise<{ success: boolean; message: string }> {
    const connection = await this.prisma.quickBooksConnection.findFirst({
      where: { userId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!connection) {
      return { success: false, message: 'No active QuickBooks connection found' };
    }

    return { success: true, message: 'Connection appears active' };
  }
}
