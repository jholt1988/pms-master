export interface OAuthCallbackResult {
  success: boolean;
  message: string;
  companyId?: string;
}

export interface ConnectionStatus {
  connected: boolean;
  companyName?: string;
  lastSync?: Date | null;
  expiresAt?: Date | null;
}

export interface TestConnectionResult {
  success: boolean;
  message: string;
  companyInfo?: any;
}

export interface DisconnectResult {
  success: boolean;
  message: string;
}

export interface BasicSyncResult {
  success: boolean;
  message: string;
  syncedItems?: number;
}

// Export an abstract class to use as a runtime DI token. Concrete implementations
// should extend this class to be bound to the DI token.
export abstract class AbstractQuickBooksService {
  abstract getAuthorizationUrl(userId: string, orgId: string): Promise<string> | string;
  abstract handleOAuthCallback(code: string, state: string, realmId: string): Promise<OAuthCallbackResult>;
  abstract getConnectionStatus(userId: string, orgId: string): Promise<ConnectionStatus>;
  abstract testConnection(userId: string): Promise<TestConnectionResult>;
  abstract disconnectQuickBooks(userId: string, orgId: string): Promise<DisconnectResult>;
  abstract basicSync(userId: string, orgId: string): Promise<BasicSyncResult>;
}
