import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Import QuickBooks packages with require since they don't have proper TypeScript definitions
const OAuthClient = require('intuit-oauth');
const QuickBooks = require('node-quickbooks');

export interface QuickBooksConnection {
  id?: number;
  userId: number;
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

  constructor(private prisma: PrismaService) {
    // Initialize OAuth client
    this.oauthClient = new OAuthClient({
      clientId: process.env.QUICKBOOKS_CLIENT_ID,
      clientSecret: process.env.QUICKBOOKS_CLIENT_SECRET,
      environment: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox',
      redirectUri: process.env.QUICKBOOKS_REDIRECT_URI,
    });
  }

  /**
   * Generate OAuth authorization URL for QuickBooks connection
   */
  getAuthorizationUrl(userId: number): string {
    const authUri = this.oauthClient.authorizeUri({
      scope: [OAuthClient.scopes.Accounting],
      state: `user_${userId}`,
    });
    this.logger.log(`Generated auth URL for user ${userId}`);
    return authUri;
  }

  /**
   * Handle OAuth callback and store connection
   */
  async handleOAuthCallback(
    code: string,
    state: string,
    realmId: string,
  ): Promise<QuickBooksConnection> {
    try {
      // Extract user ID from state
      const userId = parseInt(state.replace('user_', ''));
      if (isNaN(userId)) {
        throw new Error('Invalid state parameter');
      }

      // Exchange code for tokens
      const authResponse = await this.oauthClient.createToken(code);
      const token = authResponse.getToken();

      // Calculate expiration dates
      const tokenExpiresAt = new Date(Date.now() + token.expires_in * 1000);
      const refreshTokenExpiresAt = new Date(Date.now() + token.x_refresh_token_expires_in * 1000);

      // Store connection in database
      const connection = await this.prisma.quickBooksConnection.upsert({
        where: {
          userId_companyId: {
            userId,
            companyId: realmId,
          },
        },
        update: {
          accessToken: token.access_token,
          refreshToken: token.refresh_token,
          tokenExpiresAt,
          refreshTokenExpiresAt,
          isActive: true,
        },
        create: {
          userId,
          companyId: realmId,
          accessToken: token.access_token,
          refreshToken: token.refresh_token,
          tokenExpiresAt,
          refreshTokenExpiresAt,
          isActive: true,
        },
      });

      this.logger.log(`QuickBooks connection established for user ${userId}, company ${realmId}`);
      return connection;
    } catch (error: any) {
      this.logger.error('OAuth callback failed:', error);
      throw new Error(`Failed to establish QuickBooks connection: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Refresh access token if needed
   */
  async refreshTokenIfNeeded(connection: QuickBooksConnection): Promise<QuickBooksConnection> {
    const now = new Date();
    
    // If token expires within 5 minutes, refresh it
    if (connection.tokenExpiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
      try {
        this.oauthClient.setToken({
          access_token: connection.accessToken,
          refresh_token: connection.refreshToken,
        });

        const refreshResponse = await this.oauthClient.refresh();
        const newToken = refreshResponse.getToken();

        const updatedConnection = await this.prisma.quickBooksConnection.update({
          where: { id: connection.id },
          data: {
            accessToken: newToken.access_token,
            refreshToken: newToken.refresh_token,
            tokenExpiresAt: new Date(Date.now() + newToken.expires_in * 1000),
            refreshTokenExpiresAt: new Date(Date.now() + newToken.x_refresh_token_expires_in * 1000),
          },
        });

        this.logger.log(`Refreshed QuickBooks token for connection ${connection.id}`);
        return updatedConnection;
      } catch (error: any) {
        this.logger.error(`Failed to refresh token for connection ${connection.id}:`, error);
        // Mark connection as inactive
        await this.prisma.quickBooksConnection.update({
          where: { id: connection.id },
          data: { isActive: false },
        });
        throw new Error('QuickBooks token refresh failed');
      }
    }

    return connection;
  }

  /**
   * Get active QuickBooks connection for user
   */
  async getConnectionForUser(userId: number): Promise<QuickBooksConnection | null> {
    const connection = await this.prisma.quickBooksConnection.findFirst({
      where: {
        userId,
        isActive: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!connection) {
      return null;
    }

    return await this.refreshTokenIfNeeded(connection);
  }

  /**
   * Create QuickBooks API client instance
   */
  private async createQBClient(connection: QuickBooksConnection): Promise<any> {
    const refreshedConnection = await this.refreshTokenIfNeeded(connection);
    
    return new QuickBooks(
      process.env.QUICKBOOKS_CLIENT_ID,
      process.env.QUICKBOOKS_CLIENT_SECRET,
      refreshedConnection.accessToken,
      false, // Not a sandbox if production
      refreshedConnection.companyId,
      process.env.NODE_ENV !== 'production', // Use sandbox in development
      true, // Use minor version
      '70', // API minor version
      '2.0' // API version
    );
  }

  /**
   * Sync property management data to QuickBooks
   * Simplified version that works with current schema
   */
  async syncToQuickBooks(userId: number): Promise<SyncResult> {
    const connection = await this.getConnectionForUser(userId);
    if (!connection) {
      throw new Error('No active QuickBooks connection found');
    }

    const qbo = await this.createQBClient(connection);
    const errors: string[] = [];
    let syncedItems = 0;

    try {
      // 1. Sync basic property information
      await this.syncBasicProperties(qbo, userId, errors, syncedItems);

      // 2. Sync user payments as income
      await this.syncUserPayments(qbo, userId, errors, syncedItems);

      // 3. Sync user expenses
      await this.syncUserExpenses(qbo, userId, errors, syncedItems);

      // Update last sync time
      await this.prisma.quickBooksConnection.update({
        where: { id: connection.id },
        data: { updatedAt: new Date() },
      });

      this.logger.log(`QuickBooks sync completed for user ${userId}: ${syncedItems} items synced`);

      return {
        success: errors.length === 0,
        syncedItems,
        errors,
        lastSyncAt: new Date(),
      };
    } catch (error: any) {
      this.logger.error('QuickBooks sync failed:', error);
      return {
        success: false,
        syncedItems,
        errors: [...errors, error?.message || 'Unknown error'],
        lastSyncAt: new Date(),
      };
    }
  }

  /**
   * Sync basic properties to QuickBooks as service items
   */
  private async syncBasicProperties(qbo: any, userId: number, errors: string[], syncedCount: number): Promise<void> {
    try {
      // Get properties through user's leases (via unit relationship)
      const userLeases = await this.prisma.lease.findMany({
        where: { tenantId: userId },
        include: { 
          unit: {
            include: {
              property: true
            }
          }
        },
      });

      const uniqueProperties = userLeases
        .map(lease => lease.unit.property)
        .filter((property, index, self) => 
          index === self.findIndex(p => p.id === property.id)
        );

      for (const property of uniqueProperties) {
        try {
          const serviceItem = {
            Name: `Property: ${property.name}`,
            Description: `Property at ${property.address}`,
            Type: 'Service',
            IncomeAccountRef: {
              value: '1', // Default income account
            },
            Taxable: false,
          };

          // Check if item already exists
          const existingItems: any = await new Promise((resolve, reject) => {
            qbo.findItems({ Name: serviceItem.Name }, (err: any, items: any) => {
              if (err) reject(err);
              else resolve(items.QueryResponse?.Item || []);
            });
          });

          if (Array.isArray(existingItems) && existingItems.length > 0) {
            // Update existing item
            const existingItem = existingItems[0];
            const updatedItem = { ...serviceItem, Id: existingItem.Id, SyncToken: existingItem.SyncToken };
            
            await new Promise((resolve, reject) => {
              qbo.updateItem(updatedItem, (err: any, item: any) => {
                if (err) reject(err);
                else resolve(item);
              });
            });
          } else {
            // Create new item
            await new Promise((resolve, reject) => {
              qbo.createItem(serviceItem, (err: any, item: any) => {
                if (err) reject(err);
                else resolve(item);
              });
            });
          }

          syncedCount++;
        } catch (error: any) {
          errors.push(`Failed to sync property ${property.name}: ${error?.message || 'Unknown error'}`);
        }
      }
    } catch (error: any) {
      errors.push(`Failed to fetch properties: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Sync user payments to QuickBooks
   */
  private async syncUserPayments(qbo: any, userId: number, errors: string[], syncedCount: number): Promise<void> {
    try {
      const recentPayments = await this.prisma.payment.findMany({
        where: {
          userId: userId,
          status: 'COMPLETED',
          paymentDate: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
          },
        },
        include: {
          lease: {
            include: {
              unit: {
                include: {
                  property: true,
                },
              },
            },
          },
        },
        orderBy: { paymentDate: 'desc' },
        take: 50, // Limit to recent payments
      });

      for (const payment of recentPayments) {
        try {
          // Create a simple sales receipt for the payment
          const salesReceipt = {
            CustomerRef: {
              name: `User ${userId}`, // Simplified customer reference
            },
            Line: [
              {
                Amount: payment.amount,
                DetailType: 'SalesItemLineDetail',
                SalesItemLineDetail: {
                  ItemRef: {
                    name: payment.lease?.unit?.property?.name 
                      ? `Property: ${payment.lease.unit.property.name}`
                      : 'Rental Income',
                  },
                  Qty: 1,
                  UnitPrice: payment.amount,
                },
              },
            ],
            TxnDate: payment.paymentDate.toISOString().split('T')[0],
            DocNumber: `PAY-${payment.id}`,
            PaymentRefNum: payment.externalId || `${payment.id}`,
          };

          await new Promise((resolve, reject) => {
            qbo.createSalesReceipt(salesReceipt, (err: any, receipt: any) => {
              if (err) reject(err);
              else resolve(receipt);
            });
          });

          syncedCount++;
        } catch (error: any) {
          errors.push(`Failed to sync payment ${payment.id}: ${error?.message || 'Unknown error'}`);
        }
      }
    } catch (error: any) {
      errors.push(`Failed to fetch payments: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Sync user expenses to QuickBooks
   */
  private async syncUserExpenses(qbo: any, userId: number, errors: string[], syncedCount: number): Promise<void> {
    try {
      const recentExpenses = await this.prisma.expense.findMany({
        where: {
          recordedById: userId,
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
          },
        },
        include: {
          property: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 50, // Limit to recent expenses
      });

      for (const expense of recentExpenses) {
        try {
          const purchase = {
            AccountRef: {
              value: '25', // Default expense account
            },
            PaymentType: 'CreditCard',
            Line: [
              {
                Amount: expense.amount,
                DetailType: 'AccountBasedExpenseLineDetail',
                AccountBasedExpenseLineDetail: {
                  AccountRef: {
                    value: '25', // Expense account
                  },
                  BillableStatus: 'NotBillable',
                },
                Description: expense.description || 'Property expense',
              },
            ],
            TxnDate: expense.createdAt.toISOString().split('T')[0],
            DocNumber: `EXP-${expense.id}`,
          };

          await new Promise((resolve, reject) => {
            qbo.createPurchase(purchase, (err: any, purchase: any) => {
              if (err) reject(err);
              else resolve(purchase);
            });
          });

          syncedCount++;
        } catch (error: any) {
          errors.push(`Failed to sync expense ${expense.id}: ${error?.message || 'Unknown error'}`);
        }
      }
    } catch (error: any) {
      errors.push(`Failed to fetch expenses: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Disconnect QuickBooks integration
   */
  async disconnect(userId: number): Promise<void> {
    await this.prisma.quickBooksConnection.updateMany({
      where: { userId },
      data: { isActive: false },
    });

    this.logger.log(`QuickBooks connection disconnected for user ${userId}`);
  }

  /**
   * Get sync status and last sync time
   */
  async getSyncStatus(userId: number): Promise<{
    isConnected: boolean;
    lastSyncAt: Date | null;
    companyName?: string;
  }> {
    const connection = await this.getConnectionForUser(userId);
    
    return {
      isConnected: !!connection,
      lastSyncAt: connection?.updatedAt || null,
      companyName: connection?.companyId,
    };
  }

  /**
   * Test connection to QuickBooks API
   */
  async testConnection(userId: number): Promise<{ success: boolean; message: string }> {
    try {
      const connection = await this.getConnectionForUser(userId);
      if (!connection) {
        return { success: false, message: 'No active QuickBooks connection found' };
      }

      const qbo = await this.createQBClient(connection);
      
      // Test with a simple company info query
      const companyInfo: any = await new Promise((resolve, reject) => {
        qbo.getCompanyInfo(connection.companyId, (err: any, info: any) => {
          if (err) reject(err);
          else resolve(info);
        });
      });

      return { 
        success: true, 
        message: `Connected to ${companyInfo.QueryResponse?.CompanyInfo?.[0]?.CompanyName || 'QuickBooks company'}` 
      };
    } catch (error: any) {
      return { 
        success: false, 
        message: error?.message || 'Connection test failed' 
      };
    }
  }
}