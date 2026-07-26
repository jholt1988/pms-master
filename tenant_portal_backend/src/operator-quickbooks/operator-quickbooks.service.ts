import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AbstractQuickBooksService } from '../quickbooks/quickbooks.types';
import { AccountingAnomalyService } from '../quickbooks/accounting-anomaly.service';

@Injectable()
export class OperatorQuickBooksService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(AbstractQuickBooksService) private readonly quickBooksService: AbstractQuickBooksService,
    private readonly anomalyService: AccountingAnomalyService,
  ) {}

  async getWorkbench(orgId: string, userId: string) {
    const [connectionStatus, anomalies] = await Promise.all([
      this.quickBooksService.getConnectionStatus(userId, orgId),
      this.anomalyService.listRecentAnomalies(orgId, { limit: 10 }),
    ]);

    const connected = connectionStatus.connected;

    return {
      generatedAt: new Date().toISOString(),
      metrics: {
        connected,
        anomaliesCount: anomalies.count,
        lastSync: (connectionStatus as any).lastSync ?? null,
        expiresAt: (connectionStatus as any).expiresAt ?? null,
      },
      connection: connectionStatus,
      anomalies: anomalies.items,
    };
  }

  async triggerSync(orgId: string, userId: string) {
    return this.quickBooksService.basicSync(userId, orgId);
  }

  async disconnect(orgId: string, userId: string) {
    return this.quickBooksService.disconnectQuickBooks(userId, orgId);
  }

  async getAuthUrl(orgId: string, userId: string) {
    const authUrl = await this.quickBooksService.getAuthorizationUrl(userId, orgId);
    return { authUrl, message: 'Authorization URL generated successfully' };
  }

  async testConnection(orgId: string, userId: string) {
    return this.quickBooksService.testConnection(userId);
  }
}
