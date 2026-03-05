import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  AbstractQuickBooksService,
  OAuthCallbackResult,
  ConnectionStatus,
  TestConnectionResult,
  DisconnectResult,
  BasicSyncResult,
} from './quickbooks.types';

const OAuthClient = require('intuit-oauth');
const QuickBooks = require('node-quickbooks');

@Injectable()
export class QuickBooksService extends AbstractQuickBooksService {
  private readonly logger = new Logger(QuickBooksService.name);
  private oauthClient: any;

  constructor(private readonly prisma: PrismaService) {
    super();
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

  async handleOAuthCallback(code: string, state: string, realmId: string): Promise<OAuthCallbackResult> {
    try {
      const parsedState = JSON.parse(state) as { userId?: string; orgId?: string };
      const userId = parsedState?.userId;
      const orgId = parsedState?.orgId;

      if (!userId || !orgId) {
        return { success: false, message: 'Invalid state payload' };
      }

      await this.oauthClient.createToken(code);
      const token = this.oauthClient.getToken();

      await this.prisma.quickBooksConnection.upsert({
        where: {
          organizationId_companyId: {
            organizationId: orgId,
            companyId: realmId,
          },
        },
        update: {
          organizationId: orgId,
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

      return {
        success: true,
        message: 'QuickBooks connection established successfully',
        companyId: realmId,
      };
    } catch (error) {
      this.logger.error('OAuth callback failed', error);
      return {
        success: false,
        message: `Failed to establish QuickBooks connection: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  async getConnectionStatus(userId: string, orgId: string): Promise<ConnectionStatus> {
    const connection = await this.prisma.quickBooksConnection.findFirst({
      where: {
        userId,
        organizationId: orgId,
        isActive: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!connection) {
      return { connected: false };
    }

    return {
      connected: true,
      companyName: connection.companyId,
      lastSync: connection.updatedAt,
      expiresAt: connection.tokenExpiresAt,
    };
  }

  async testConnection(userId: string): Promise<TestConnectionResult> {
    try {
      const connection = await this.prisma.quickBooksConnection.findFirst({
        where: { userId, isActive: true },
        orderBy: { createdAt: 'desc' },
      });

      if (!connection) {
        return { success: false, message: 'No active QuickBooks connection found' };
      }

      const qbo = new QuickBooks(
        process.env.QUICKBOOKS_CLIENT_ID,
        process.env.QUICKBOOKS_CLIENT_SECRET,
        connection.accessToken,
        false,
        connection.companyId,
        process.env.NODE_ENV !== 'production',
      );

      return await new Promise((resolve) => {
        qbo.getCompanyInfo(connection.companyId, (err: any, companyInfo: any) => {
          if (err) {
            resolve({ success: false, message: err?.message || 'Connection test failed' });
            return;
          }

          resolve({
            success: true,
            message: 'Connection test successful',
            companyInfo: companyInfo?.CompanyInfo?.[0] || companyInfo,
          });
        });
      });
    } catch (error) {
      return {
        success: false,
        message: `Connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  async disconnectQuickBooks(userId: string, orgId: string): Promise<DisconnectResult> {
    await this.prisma.quickBooksConnection.updateMany({
      where: { userId, organizationId: orgId, isActive: true },
      data: { isActive: false },
    });

    return {
      success: true,
      message: 'QuickBooks integration disconnected successfully',
    };
  }

  async basicSync(userId: string, orgId: string): Promise<BasicSyncResult> {
    const connection = await this.prisma.quickBooksConnection.findFirst({
      where: { userId, organizationId: orgId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!connection) {
      return {
        success: false,
        message: 'No active QuickBooks connection found',
      };
    }

    await this.prisma.quickBooksConnection.update({
      where: { id: connection.id },
      data: { updatedAt: new Date() },
    });

    return {
      success: true,
      message: 'Basic sync completed successfully',
      syncedItems: 0,
    };
  }
}
