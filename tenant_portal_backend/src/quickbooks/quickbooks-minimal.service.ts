import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { createHmac, timingSafeEqual } from 'crypto';
import { Prisma } from '@prisma/client';
import {
  AbstractQuickBooksService,
  OAuthCallbackResult,
  ConnectionStatus,
  TestConnectionResult,
  DisconnectResult,
  BasicSyncResult,
} from './quickbooks.types';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const QuickBooks = require('node-quickbooks');
import OAuthClient = require('intuit-oauth');

@Injectable()
export class QuickBooksMinimalService extends AbstractQuickBooksService {
  private readonly logger = new Logger(QuickBooksMinimalService.name);
  private oauthClient: any;

  constructor(private prisma: PrismaService) {
    super();
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
      state: this.createSignedState({ userId, orgId, nonce: `${Date.now()}:${Math.random().toString(36).slice(2)}` }),
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
      const parsedState = this.verifySignedState(state);
      if (!parsedState) {
        this.logger.error('Failed to verify QuickBooks state payload');
        return {
          success: false,
          message: 'Failed to establish QuickBooks connection: Invalid or expired state payload',
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
    try {
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
    } catch (error) {
      // Graceful fallback when QuickBooks persistence is unavailable/migrating.
      this.logger.warn(`QuickBooks status fallback for org ${orgId}: ${error instanceof Error ? error.message : 'unknown error'}`);
      return { connected: false };
    }
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

  async handleWebhook(
    rawBody: Buffer,
    signatureHeader: string | undefined,
    payload: any,
  ): Promise<{ eventKey: string; deduped: boolean }> {
    this.assertValidWebhookSignature(rawBody, signatureHeader);

    const firstNotification = payload?.eventNotifications?.[0];
    const realmId = firstNotification?.realmId || 'unknown-realm';
    const eventId = firstNotification?.dataChangeEvent?.entities?.[0]?.id || 'unknown-entity';
    const operation = firstNotification?.dataChangeEvent?.entities?.[0]?.operation || 'unknown-op';
    const name = firstNotification?.dataChangeEvent?.entities?.[0]?.name || 'unknown-name';
    const eventKey = `${realmId}:${name}:${eventId}:${operation}`;
    const connection = realmId !== 'unknown-realm'
      ? await this.prisma.quickBooksConnection.findFirst({
          where: { companyId: realmId, isActive: true },
          select: { organizationId: true },
        })
      : null;

    try {
      await (this.prisma as any).quickBooksWebhookEvent.create({
        data: {
          eventKey,
          realmId,
          entityName: name,
          entityId: eventId,
          operation,
          organizationId: connection?.organizationId,
          payload,
        },
      });
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        return { eventKey, deduped: true };
      }
      throw error;
    }

    this.logger.log(`Accepted QuickBooks webhook event ${eventKey}`);
    return { eventKey, deduped: false };
  }

  private assertValidWebhookSignature(rawBody: Buffer, signatureHeader?: string): void {
    const verifierToken = process.env.QUICKBOOKS_WEBHOOK_VERIFIER;
    const strict = process.env.NODE_ENV === 'production' || process.env.QUICKBOOKS_WEBHOOK_REQUIRE_SIGNATURE === 'true';

    if (!verifierToken) {
      if (strict) {
        throw new Error('QUICKBOOKS_WEBHOOK_VERIFIER must be configured for QuickBooks webhook signature verification.');
      }
      this.logger.warn('Skipping QuickBooks webhook signature verification because QUICKBOOKS_WEBHOOK_VERIFIER is not set.');
      return;
    }

    if (!signatureHeader) {
      throw new Error('Missing intuit-signature header.');
    }

    const expected = createHmac('sha256', verifierToken).update(rawBody).digest('base64');
    const expectedBuf = Buffer.from(expected, 'base64');
    const actualBuf = Buffer.from(signatureHeader.trim(), 'base64');

    if (expectedBuf.length !== actualBuf.length || !timingSafeEqual(expectedBuf, actualBuf)) {
      throw new Error('Invalid QuickBooks webhook signature.');
    }
  }

  private createSignedState(payload: { userId: string; orgId: string; nonce: string }): string {
    const body = Buffer.from(JSON.stringify({ ...payload, issuedAt: Date.now() }), 'utf8').toString('base64url');
    const signature = this.signStateBody(body);
    return `${body}.${signature}`;
  }

  private verifySignedState(state: string): { userId: string; orgId: string } | null {
    const [body, signature] = state.split('.');
    if (!body || !signature) return null;

    const expected = this.signStateBody(body);
    const actualBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);
    if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) return null;

    try {
      const parsed = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
      const issuedAt = Number(parsed.issuedAt);
      const maxAgeMs = 15 * 60 * 1000;
      if (!Number.isFinite(issuedAt) || Date.now() - issuedAt > maxAgeMs) return null;
      if (!parsed.userId || !parsed.orgId) return null;
      return { userId: parsed.userId, orgId: parsed.orgId };
    } catch {
      return null;
    }
  }

  private signStateBody(body: string): string {
    const secret = process.env.QUICKBOOKS_OAUTH_STATE_SECRET || process.env.QUICKBOOKS_CLIENT_SECRET;
    if (!secret) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('QUICKBOOKS_OAUTH_STATE_SECRET or QUICKBOOKS_CLIENT_SECRET must be configured in production.');
      }
      return createHmac('sha256', 'development-quickbooks-state-secret').update(body).digest('base64url');
    }
    return createHmac('sha256', secret).update(body).digest('base64url');
  }

  private isUniqueConstraintError(error: unknown): boolean {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return error.code === 'P2002';
    }

    return Boolean(
      error &&
        typeof error === 'object' &&
        'code' in error &&
        (error as { code?: unknown }).code === 'P2002',
    );
  }
}
