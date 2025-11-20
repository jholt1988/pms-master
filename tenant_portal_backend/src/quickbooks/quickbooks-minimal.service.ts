import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
const QuickBooks = require('node-quickbooks');
const OAuthClient = require('intuit-oauth');

@Injectable()
export class QuickBooksMinimalService {
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

  async getAuthorizationUrl(userId: number): Promise<string> {
    this.logger.log(`Generating QuickBooks authorization URL for user ${userId}`);
    
    const authUri = this.oauthClient.authorizeUri({
      scope: [OAuthClient.scopes.Accounting, OAuthClient.scopes.Payment],
      state: JSON.stringify({ userId }),
    });

    this.logger.log('QuickBooks authorization URL generated successfully');
    return authUri;
  }

  async handleOAuthCallback(
    code: string,
    state: string,
    realmId: string
  ): Promise<{ success: boolean; message: string; companyId?: string }> {
    try {
      const { userId } = JSON.parse(state);
      this.logger.log(`Processing QuickBooks OAuth callback for user ${userId}`);

      // Exchange code for tokens
      const authResponse = await this.oauthClient.createToken(code);
      const token = this.oauthClient.getToken();

      // Store connection in database
      await this.prisma.quickBooksConnection.upsert({
        where: {
          userId_companyId: {
            userId: parseInt(userId),
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
          userId: parseInt(userId),
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

  async getConnectionStatus(userId: number): Promise<{
    connected: boolean;
    companyName?: string;
    lastSync?: Date;
    expiresAt?: Date;
  }> {
    const connection = await this.prisma.quickBooksConnection.findFirst({
      where: { userId, isActive: true },
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

  async testConnection(userId: number): Promise<{
    success: boolean;
    message: string;
    companyInfo?: any;
  }> {
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

  async disconnectQuickBooks(userId: number): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      await this.prisma.quickBooksConnection.updateMany({
        where: { userId },
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

  async basicSync(userId: number): Promise<{
    success: boolean;
    message: string;
    syncedItems?: number;
  }> {
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