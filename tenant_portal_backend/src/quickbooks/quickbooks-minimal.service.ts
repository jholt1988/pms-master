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
const QuickBooks = require('node-quickbooks');
const OAuthClient = require('intuit-oauth');

@Injectable()
export class QuickBooksMinimalService extends AbstractQuickBooksService {
  private readonly logger = new Logger(QuickBooksMinimalService.name);
  private oauthClient: any;

  constructor(private prisma: PrismaService) {
    this.oauthClient = new OAuthClient({
      clientId: process.env.QUICKBOOKS_CLIENT_ID,
      clientSecret: process.env.QUICKBOOKS_CLIENT_SECRET,
      redirectUri: process.env.QUICKBOOKS_REDIRECT_URI,
      environment: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox',
    });
  }

  async getAuthorizationUrl(userId: string, orgId: string): Promise<string> {
    this.logger.log(`Generating QuickBooks authorization URL for user ${userId}`);
    
    const authUri = this.oauthClient.authorizeUri({
      scope: [OAuthClient.scopes.Accounting, OAuthClient.scopes.Payment],
      state: JSON.stringify({ userId, orgId }),
    });

    this.logger.log('QuickBooks authorization URL generated successfully');
    return authUri;
  }

  async handleOAuthCallback(
    code: string,
    state: string,
    realmId: string
  ): Promise<OAuthCallbackResult> {
    try {
      let parsedState: any;
      try {
        parsedState = JSON.parse(state);
      } catch (parseError) {
        this.logger.error('Failed to parse QuickBooks state payload', parseError);
        return {
          success: false,
          message: 'Failed to establish QuickBooks connection: Invalid state payload',
        };
      }

      const { userId, orgId } = parsedState || {};
      if (!userId || !orgId) {
        return {
          success: false,
          message: 'Failed to establish QuickBooks connection: Invalid state payload',
        };
      }
      this.logger.log(`Processing QuickBooks OAuth callback for user ${userId}`);

      // Exchange code for tokens
      const authResponse = await this.oauthClient.createToken(code);
      const token = this.oauthClient.getToken();

      // Store connection in database
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

      this.logger.log(`QuickBooks connection established successfully for user ${userId}`);
      return { 
        success: true, 
        message: 'QuickBooks connection established successfully',
        companyId: realmId
      };
    } catch (error) {
      this.logger.error('Failed to process QuickBooks OAuth callback', error);
      return { 
        success: false, 
        message: `Failed to establish QuickBooks connection: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  async getConnectionStatus(userId: string, orgId: string): Promise<ConnectionStatus> {
    const connection = await this.prisma.quickBooksConnection.findFirst({
      where: { organizationId: orgId, isActive: true },
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
    });

      if (!connection) {
        return {
          success: false,
          message: 'No active QuickBooks connection found',
        };
      }

      // Initialize QuickBooks client
      const qbo = new QuickBooks(
        process.env.QUICKBOOKS_CLIENT_ID,
        process.env.QUICKBOOKS_CLIENT_SECRET,
        connection.accessToken,
        false,
        connection.companyId,
        process.env.NODE_ENV !== 'production'
      );

      // Test connection by fetching company info
      return new Promise((resolve) => {
        qbo.getCompanyInfo(connection.companyId, (err: any, companyInfo: any) => {
          if (err) {
            this.logger.error('QuickBooks connection test failed', err);
            resolve({
              success: false,
              message: `Connection test failed: ${err.message || 'Unknown error'}`,
            });
          } else {
            this.logger.log('QuickBooks connection test successful');
            resolve({
              success: true,
              message: 'Connection test successful',
              companyInfo: companyInfo?.CompanyInfo?.[0] || companyInfo,
            });
          }
        });
      });
    } catch (error) {
      this.logger.error('Error testing QuickBooks connection', error);
      return {
        success: false,
        message: `Connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  async disconnectQuickBooks(userId: string, orgId: string): Promise<DisconnectResult> {
    try {
      await this.prisma.quickBooksConnection.updateMany({
        where: { organizationId: orgId },
        data: { isActive: false },
      });

      this.logger.log(`QuickBooks connection disconnected for user ${userId}`);
      return {
        success: true,
        message: 'QuickBooks connection disconnected successfully',
      };
    } catch (error) {
      this.logger.error('Failed to disconnect QuickBooks', error);
      return {
        success: false,
        message: `Failed to disconnect: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  async basicSync(userId: string, orgId: string): Promise<BasicSyncResult> {
    try {
      const connection = await this.prisma.quickBooksConnection.findFirst({
        where: { organizationId: orgId, isActive: true },
      });

      if (!connection) {
        return {
          success: false,
          message: 'No active QuickBooks connection found',
        };
      }

      // Update last sync time
      await this.prisma.quickBooksConnection.update({
        where: { id: connection.id },
        data: { updatedAt: new Date() },
      });

      this.logger.log(`Basic sync completed for user ${userId}`);
      return {
        success: true,
        message: 'Basic sync completed successfully',
        syncedItems: 0, // Placeholder for now
      };
    } catch (error) {
      this.logger.error('QuickBooks sync failed', error);
      return {
        success: false,
        message: `Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  private async refreshTokenIfNeeded(connection: any): Promise<any> {
    if (connection.tokenExpiresAt <= new Date()) {
      this.logger.log('Refreshing expired QuickBooks token');
      
      this.oauthClient.setToken({
        access_token: connection.accessToken,
        refresh_token: connection.refreshToken,
      });

      const authResponse = await this.oauthClient.refresh();
      const token = this.oauthClient.getToken();

      const updatedConnection = await this.prisma.quickBooksConnection.update({
        where: { id: connection.id },
        data: {
          accessToken: token.access_token,
          refreshToken: token.refresh_token,
          tokenExpiresAt: new Date(Date.now() + token.expires_in * 1000),
        },
      });

      this.logger.log('QuickBooks token refreshed successfully');
      return updatedConnection;
    }

    return connection;
  }
}
