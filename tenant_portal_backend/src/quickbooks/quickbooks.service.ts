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
      state: `user_${userId}`, // Pass user ID in state for callback handling
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
    } catch (error) {
      this.logger.error('OAuth callback failed:', error);
      throw new Error(`Failed to establish QuickBooks connection: ${error.message}`);
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
      } catch (error) {
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
      // 1. Sync Properties as Items/Services
      await this.syncProperties(qbo, userId, errors, syncedItems);

      // 2. Sync Tenants as Customers
      await this.syncTenants(qbo, userId, errors, syncedItems);

      // 3. Sync Rent Payments as Invoices and Payments
      await this.syncRentPayments(qbo, userId, errors, syncedItems);

      // 4. Sync Expenses (Maintenance, etc.)
      await this.syncExpenses(qbo, userId, errors, syncedItems);

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
    } catch (error) {
      this.logger.error('QuickBooks sync failed:', error);
      return {
        success: false,
        syncedItems,
        errors: [...errors, error.message],
        lastSyncAt: new Date(),
      };
    }
  }

  /**
   * Sync Properties to QuickBooks as Items/Services
   */
  private async syncProperties(qbo: any, userId: number, errors: string[], syncedCount: number): Promise<void> {
    const properties = await this.prisma.property.findMany({
      where: { userId },
      include: { units: true },
    });

    for (const property of properties) {
      try {
        // Create or update property as a service item
        const serviceItem = {
          Name: `Property: ${property.name}`,
          Description: `${property.address}, ${property.city}, ${property.state} ${property.zipCode}`,
          Type: 'Service',
          IncomeAccountRef: {
            value: '1', // Default income account - should be configurable
          },
          Taxable: false,
        };

        // Check if item already exists
        const existingItems = await new Promise((resolve, reject) => {
          qbo.findItems({ Name: serviceItem.Name }, (err, items) => {
            if (err) reject(err);
            else resolve(items.QueryResponse?.Item || []);
          });
        });

        if (Array.isArray(existingItems) && existingItems.length > 0) {
          // Update existing item
          const existingItem = existingItems[0];
          const updatedItem = { ...serviceItem, Id: existingItem.Id, SyncToken: existingItem.SyncToken };
          
          await new Promise((resolve, reject) => {
            qbo.updateItem(updatedItem, (err, item) => {
              if (err) reject(err);
              else resolve(item);
            });
          });
        } else {
          // Create new item
          await new Promise((resolve, reject) => {
            qbo.createItem(serviceItem, (err, item) => {
              if (err) reject(err);
              else resolve(item);
            });
          });
        }

        syncedCount++;
      } catch (error) {
        errors.push(`Failed to sync property ${property.name}: ${error.message}`);
      }
    }
  }

  /**
   * Sync Tenants to QuickBooks as Customers
   */
  private async syncTenants(qbo: any, userId: number, errors: string[], syncedCount: number): Promise<void> {
    const leases = await this.prisma.lease.findMany({
      where: {
        property: { userId },
        status: 'ACTIVE',
      },
      include: {
        tenant: true,
        property: true,
        unit: true,
      },
    });

    for (const lease of leases) {
      try {
        const tenant = lease.tenant;
        const customer = {
          Name: `${tenant.firstName} ${tenant.lastName}`,
          CompanyName: lease.property.name,
          BillAddr: {
            Line1: lease.unit?.unitNumber 
              ? `Unit ${lease.unit.unitNumber}, ${lease.property.address}`
              : lease.property.address,
            City: lease.property.city,
            CountrySubDivisionCode: lease.property.state,
            PostalCode: lease.property.zipCode,
          },
          PrimaryEmailAddr: {
            Address: tenant.email,
          },
          PrimaryPhone: {
            FreeFormNumber: tenant.phone || '',
          },
        };

        // Check if customer already exists
        const existingCustomers = await new Promise((resolve, reject) => {
          qbo.findCustomers({ Name: customer.Name }, (err, customers) => {
            if (err) reject(err);
            else resolve(customers.QueryResponse?.Customer || []);
          });
        });

        if (Array.isArray(existingCustomers) && existingCustomers.length > 0) {
          // Update existing customer
          const existingCustomer = existingCustomers[0];
          const updatedCustomer = { ...customer, Id: existingCustomer.Id, SyncToken: existingCustomer.SyncToken };
          
          await new Promise((resolve, reject) => {
            qbo.updateCustomer(updatedCustomer, (err, customer) => {
              if (err) reject(err);
              else resolve(customer);
            });
          });
        } else {
          // Create new customer
          await new Promise((resolve, reject) => {
            qbo.createCustomer(customer, (err, customer) => {
              if (err) reject(err);
              else resolve(customer);
            });
          });
        }

        syncedCount++;
      } catch (error) {
        errors.push(`Failed to sync tenant ${lease.tenant.firstName} ${lease.tenant.lastName}: ${error.message}`);
      }
    }
  }

  /**
   * Sync Rent Payments to QuickBooks as Invoices and Payments
   */
  private async syncRentPayments(qbo: any, userId: number, errors: string[], syncedCount: number): Promise<void> {
    const payments = await this.prisma.payment.findMany({
      where: {
        lease: {
          property: { userId },
        },
        status: 'COMPLETED',
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        },
      },
      include: {
        lease: {
          include: {
            tenant: true,
            property: true,
            unit: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    for (const payment of payments) {
      try {
        const tenant = payment.lease.tenant;
        const customerName = `${tenant.firstName} ${tenant.lastName}`;

        // Create invoice for rent
        const invoice = {
          CustomerRef: {
            name: customerName,
          },
          Line: [
            {
              Amount: payment.amount,
              DetailType: 'SalesItemLineDetail',
              SalesItemLineDetail: {
                ItemRef: {
                  name: `Property: ${payment.lease.property.name}`,
                },
                Qty: 1,
                UnitPrice: payment.amount,
              },
            },
          ],
          DueDate: payment.dueDate?.toISOString().split('T')[0],
          TxnDate: payment.createdAt.toISOString().split('T')[0],
          DocNumber: `RENT-${payment.id}`,
        };

        // Create invoice
        const createdInvoice = await new Promise((resolve, reject) => {
          qbo.createInvoice(invoice, (err, invoice) => {
            if (err) reject(err);
            else resolve(invoice);
          });
        });

        // Create payment record
        const paymentRecord = {
          CustomerRef: {
            name: customerName,
          },
          TotalAmt: payment.amount,
          Line: [
            {
              Amount: payment.amount,
              LinkedTxn: [
                {
                  TxnId: createdInvoice.Id,
                  TxnType: 'Invoice',
                },
              ],
            },
          ],
          TxnDate: payment.paidAt?.toISOString().split('T')[0] || payment.createdAt.toISOString().split('T')[0],
        };

        await new Promise((resolve, reject) => {
          qbo.createPayment(paymentRecord, (err, payment) => {
            if (err) reject(err);
            else resolve(payment);
          });
        });

        syncedCount += 2; // Invoice + Payment
      } catch (error) {
        errors.push(`Failed to sync payment ${payment.id}: ${error.message}`);
      }
    }
  }

  /**
   * Sync Expenses to QuickBooks
   */
  private async syncExpenses(qbo: any, userId: number, errors: string[], syncedCount: number): Promise<void> {
    const expenses = await this.prisma.expense.findMany({
      where: {
        property: { userId },
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        },
      },
      include: {
        property: true,
        category: true,
      },
    });

    for (const expense of expenses) {
      try {
        const purchase = {
          AccountRef: {
            value: '25', // Default expense account - should be configurable
          },
          PaymentType: 'CreditCard', // Could be configurable
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
              Description: expense.description,
            },
          ],
          TxnDate: expense.createdAt.toISOString().split('T')[0],
          DocNumber: `EXP-${expense.id}`,
        };

        await new Promise((resolve, reject) => {
          qbo.createPurchase(purchase, (err, purchase) => {
            if (err) reject(err);
            else resolve(purchase);
          });
        });

        syncedCount++;
      } catch (error) {
        errors.push(`Failed to sync expense ${expense.id}: ${error.message}`);
      }
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
}