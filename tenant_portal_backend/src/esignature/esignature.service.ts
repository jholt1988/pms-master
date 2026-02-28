import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DocumentCategory, EsignEnvelope, EsignEnvelopeStatus, EsignParticipantStatus, EsignProvider, Prisma, Role } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { randomUUID } from 'crypto';
import * as docusign from 'docusign-esign';
import * as fs from 'fs/promises';
import * as path from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { DocumentsService } from '../documents/documents.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateEnvelopeDto } from './dto/create-envelope.dto';
import { ProviderWebhookDto, ProviderWebhookDocumentDto } from './dto/provider-webhook.dto';
import { RecipientViewDto } from './dto/recipient-view.dto';

interface ProviderRecipient {
  email: string;
  recipientId?: string;
  status?: string;
}

interface ProviderEnvelopeResponse {
  envelopeId: string;
  status: EsignEnvelopeStatus;
  providerStatus: string;
  metadata: Record<string, unknown>;
  recipients: ProviderRecipient[];
}

@Injectable()
export class EsignatureService {
  private readonly logger = new Logger(EsignatureService.name);
  private readonly httpClient: AxiosInstance;
  private readonly providerBaseURL: string | null; // Store the actual provider URL
  private accessToken: string | null = null;
  private tokenExpiresAt: Date | null = null;
  private readonly clientId: string | null;
  private readonly clientSecret: string | null;
  private readonly impersonatedUserGuid: string | null;
  private readonly privateKey: string | null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly documentsService: DocumentsService,
    private readonly notificationsService: NotificationsService,
  ) {
    // Get OAuth credentials for token refresh
    this.clientId = this.configService.get<string>('ESIGN_PROVIDER_CLIENT_ID') || null;
    this.clientId = this.configService.get<string>('ESIGN_PROVIDER_CLIENT_ID') || null;
    this.clientSecret = this.configService.get<string>('ESIGN_PROVIDER_CLIENT_SECRET') || null;
    this.impersonatedUserGuid = this.configService.get<string>('ESIGN_PROVIDER_USER_ID') || null;

    // Handle private key - replace literal \n with actual newlines if needed
    const rawKey = this.configService.get<string>('ESIGN_PROVIDER_PRIVATE_KEY');
    this.privateKey = rawKey ? rawKey.replace(/\\n/g, '\n') : null;

    // Initialize access token from environment
    // If JWT is configured, we ignore the static API key to ensure we generate a fresh token
    const hasJwtConfig = this.clientId && this.impersonatedUserGuid && this.privateKey;
    const initialToken = this.configService.get<string>('ESIGN_PROVIDER_API_KEY');

    if (initialToken && !hasJwtConfig) {
      this.accessToken = initialToken;
      // Assume token expires in 1 hour if no expiration info (conservative estimate)
      // In production, parse JWT token to get actual expiration
      this.tokenExpiresAt = new Date(Date.now() + 3600000); // 1 hour from now
      this.logger.log('Using static ESIGN_PROVIDER_API_KEY for authentication');
    } else if (hasJwtConfig) {
      this.logger.log('JWT configuration detected. Will generate fresh access tokens via JWT Grant.');
    }
    const rawBaseURL = this.configService.get<string>('ESIGN_PROVIDER_BASE_URL') || process.env.ESIGN_PROVIDER_BASE_URL;
    const baseURL = this.normalizeUrl(rawBaseURL);

    // Store the provider base URL (even if invalid, so we can check it later)
    this.providerBaseURL = baseURL;

    // Only create httpClient if baseURL is valid, otherwise it will be created on-demand
    if (baseURL && this.isValidUrl(baseURL)) {
      this.httpClient = axios.create({
        baseURL,
        timeout: 30000, // 30 second timeout
      });
      this.logger.log(`✅ E-signature provider configured successfully: ${baseURL}`);
    } else {
      // Create a dummy client that will fail gracefully
      this.httpClient = axios.create({
        baseURL: 'http://localhost', // Dummy URL, requests will fail and use fallback
        timeout: 1000, // Quick timeout for fallback
      });
      if (rawBaseURL) {
        this.logger.warn(`❌ ESIGN_PROVIDER_BASE_URL is invalid: "${rawBaseURL}"`);
        this.logger.warn(`   Normalized value: "${baseURL}"`);
        this.logger.warn(`   Is valid URL: ${this.isValidUrl(baseURL)}`);
        this.logger.warn(`   Using mock mode for provider requests.`);
        this.logger.warn(`   Expected format: https://demo.docusign.net/restapi/v2.1 or https://www.docusign.net/restapi/v2.1`);
      } else {
        this.logger.warn('❌ ESIGN_PROVIDER_BASE_URL not configured. Using mock mode for provider requests.');
      }
    }

    // Validate DocuSign configuration if provider is DocuSign
    const provider = this.configService.get<EsignProvider>('ESIGN_PROVIDER') || EsignProvider.DOCUSIGN;
    if (provider === EsignProvider.DOCUSIGN) {
      this.validateDocuSignConfig();
    }
  }

  /**
   * Validates DocuSign configuration and ensures all required environment variables are set
   */
  private validateDocuSignConfig(): void {
    const isStrict = this.configService.get<string>('ESIGN_STRICT_MODE') === 'true';
    const basePath = this.providerBaseURL || this.configService.get<string>('ESIGN_PROVIDER_BASE_URL');
    const accessToken = this.configService.get<string>('ESIGN_PROVIDER_API_KEY');
    const accountId = this.configService.get<string>('ESIGN_PROVIDER_ACCOUNT_ID');

    const issues: string[] = [];

    if (!basePath) {
      issues.push('ESIGN_PROVIDER_BASE_URL is not set');
    } else if (!basePath.includes('/restapi/v2.1')) {
      issues.push(`ESIGN_PROVIDER_BASE_URL must include /restapi/v2.1. Current: ${basePath}`);
    }

    if (!accessToken && !this.privateKey) {
      issues.push('Neither ESIGN_PROVIDER_API_KEY nor ESIGN_PROVIDER_PRIVATE_KEY is set');
    }

    if (!accountId) {
      issues.push('ESIGN_PROVIDER_ACCOUNT_ID is not set');
    }

    if (issues.length > 0) {
      this.logger.warn('⚠️  DocuSign configuration issues detected:');
      issues.forEach(issue => this.logger.warn(`   - ${issue}`));

      if (isStrict) {
        throw new Error(`DocuSign configuration Invalid (Strict Mode Enabled): ${issues.join(', ')}`);
      }
      this.logger.warn('   DocuSign features will not work until these are configured.');
    } else {
      this.logger.log('✅ DocuSign configuration validated successfully');
    }
  }

  /**
   * Ensures we have a valid access token, refreshing if necessary
   * Returns the current valid access token
   */
  private async ensureValidToken(): Promise<string> {
    // Check if token is expired or will expire in the next 5 minutes
    const now = new Date();
    const bufferTime = 5 * 60 * 1000; // 5 minutes buffer

    if (!this.accessToken) {
      this.logger.log('No access token available, attempting to fetch one...');
      await this.refreshAccessToken();
    }

    if (this.accessToken && this.tokenExpiresAt && this.tokenExpiresAt.getTime() - bufferTime <= now.getTime()) {
      this.logger.log('Access token expired or expiring soon, attempting refresh...');
      await this.refreshAccessToken();
    }

    if (!this.accessToken) {
      throw new Error('Failed to obtain valid access token. Please check configuration.');
    }

    return this.accessToken;
  }

  /**
   * Refreshes the OAuth access token using JWT Grant (preferred) or Client Credentials
   */
  private async refreshAccessToken(): Promise<void> {
    if (!this.clientId) {
      this.logger.warn('Cannot refresh token: ESIGN_PROVIDER_CLIENT_ID not configured');
      return;
    }

    if (!this.providerBaseURL) {
      throw new Error('Cannot refresh token: ESIGN_PROVIDER_BASE_URL not configured');
    }

    // Try JWT Grant first if configured (Recommended)
    if (this.impersonatedUserGuid && this.privateKey) {
      try {
        await this.refreshJwtToken();
        return;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.error(`JWT Grant failed: ${errorMessage}. Falling back to other methods if available.`);
      }
    }

    // Fallback to Refresh Token flow if Client Secret is available
    if (this.clientSecret) {
      try {
        // Extract base URL for token endpoint (remove /restapi/v2.1)
        const baseUrl = this.providerBaseURL.replace('/restapi/v2.1', '');
        const tokenUrl = `${baseUrl}/oauth/token`;

        const response = await axios.post(tokenUrl, null, {
          params: {
            grant_type: 'refresh_token',
            client_id: this.clientId,
            client_secret: this.clientSecret,
          },
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        });

        if (response.data?.access_token) {
          this.accessToken = response.data.access_token;
          // Calculate expiration (default to 8 hours if not provided)
          const expiresIn = response.data.expires_in || 28800; // 8 hours in seconds
          this.tokenExpiresAt = new Date(Date.now() + expiresIn * 1000);
          this.logger.log(`✅ Access token refreshed successfully via Refresh Token flow. Expires at: ${this.tokenExpiresAt.toISOString()}`);
        } else {
          throw new Error('No access_token in refresh response');
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.error(`Failed to refresh access token via Refresh Token flow: ${errorMessage}`);
      }
    } else {
      this.logger.warn('No valid authentication method configured (JWT or Client Secret). Token refresh will fail.');
    }
  }

  /**
   * Refreshes token using DocuSign JWT Grant
   */
  private async refreshJwtToken(): Promise<void> {
    if (!this.clientId || !this.impersonatedUserGuid || !this.privateKey) {
      throw new Error('Missing JWT configuration');
    }

    const dsApiClient = new docusign.ApiClient();
    // Set OAuth Base Path (account-d.docusign.com for demo, account.docusign.com for prod)
    // We can infer this from the providerBaseURL or config
    const isDemo = this.providerBaseURL?.includes('demo') || true;
    const oAuthBasePath = isDemo ? 'account-d.docusign.com' : 'account.docusign.com';
    dsApiClient.setOAuthBasePath(oAuthBasePath);

    const scopes = ['signature', 'impersonation'];
    const expiresIn = 3600; // 1 hour

    this.logger.log(`Attempting JWT Grant for user ${this.impersonatedUserGuid}`);

    const results = await dsApiClient.requestJWTUserToken(
      this.clientId,
      this.impersonatedUserGuid,
      scopes,
      Buffer.from(this.privateKey, 'utf-8'),
      expiresIn
    );

    if (results.body?.access_token) {
      this.accessToken = results.body.access_token;
      // JWT tokens usually expire in 1 hour
      const expiresInSeconds = results.body.expires_in || 3600;
      this.tokenExpiresAt = new Date(Date.now() + expiresInSeconds * 1000);
      this.logger.log(`✅ Access token refreshed successfully via JWT Grant. Expires at: ${this.tokenExpiresAt.toISOString()}`);
    } else {
      throw new Error('No access_token in JWT response');
    }
  }

  /**
   * Normalizes a URL string by removing quotes and trimming whitespace
   */
  private normalizeUrl(urlString: string | undefined | null): string | null {
    if (!urlString) {
      return null;
    }

    // Convert to string and trim
    let normalized = String(urlString).trim();

    // Remove surrounding quotes (single or double) - handle both at start and end
    normalized = normalized.replace(/^['"]+|['"]+$/g, '');

    // Trim again after removing quotes
    normalized = normalized.trim();

    // Return null if empty string
    return normalized.length > 0 ? normalized : null;
  }

  /**
   * Validates email address format
   */
  private isValidEmail(email: string): boolean {
    if (!email || typeof email !== 'string') {
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  }

  private isValidUrl(urlString: string | null | undefined): boolean {
    if (!urlString) {
      return false;
    }

    try {
      const url = new URL(urlString);
      const isValid = url.protocol === 'http:' || url.protocol === 'https:';
      if (!isValid) {
        this.logger.debug(`URL has invalid protocol: ${url.protocol} (expected http: or https:)`);
        return false;
      }

      // Additional validation: Check if DocuSign URL has the correct API path
      if (url.hostname.includes('docusign') && !urlString.includes('/restapi/v2.1')) {
        this.logger.warn(`DocuSign URL is missing API version path. Expected /restapi/v2.1, got: ${url.pathname}`);
        // Still return true as it's a valid URL format, but log a warning
      }

      // Additional validation: Check if HelloSign URL has the correct API path
      if (url.hostname.includes('hellosign') && !urlString.includes('/v3')) {
        this.logger.warn(`HelloSign URL is missing API version path. Expected /v3, got: ${url.pathname}`);
        // Still return true as it's a valid URL format, but log a warning
      }

      return true;
    } catch (error) {
      this.logger.debug(`URL validation failed for "${urlString}": ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  async createEnvelope(leaseId: string, dto: CreateEnvelopeDto, actorId: string) {
    if (!dto.recipients?.length) {
      throw new BadRequestException('At least one recipient is required.');
    }

    const normalizedLeaseId = String(leaseId);
    const lease = await this.prisma.lease.findUnique({
      where: { id: normalizedLeaseId },
      include: {
        tenant: true,
        unit: { include: { property: true } },
        generalDocuments: {
          where: {
            category: DocumentCategory.LEASE,
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 1, // Get the most recent lease document
        },
      },
    });

    if (!lease) {
      throw new NotFoundException('Lease not found.');
    }

    // Validate that the tenant (if exists) has an email address
    if (lease.tenant && !lease.tenant.email) {
      this.logger.error(`Cannot create envelope: Tenant ${lease.tenant.username} (ID: ${lease.tenant.id}) has no email address`);
      throw new BadRequestException(`Tenant ${lease.tenant.username} does not have an email address configured. Please update the tenant's profile with a valid email address before creating a lease envelope.`);
    }

    const provider = dto.provider ?? (this.configService.get('ESIGN_PROVIDER') as EsignProvider) ?? EsignProvider.DOCUSIGN;
    const providerResponse = await this.dispatchProviderEnvelope(provider, dto, lease);
    const leaseIdForNotifications = normalizedLeaseId.toString();

    const envelope = (await this.prisma.esignEnvelope.create({
      data: {
        leaseId: normalizedLeaseId,
        createdById: actorId,
        provider,
        providerEnvelopeId: providerResponse.envelopeId,
        status: providerResponse.status,
        providerStatus: providerResponse.providerStatus,
        providerMetadata: providerResponse.metadata as Prisma.JsonValue,
        participants: {
          create: dto.recipients.map((recipient) => {
            // If the recipient is the tenant, use the email from the database to ensure it's valid
            // This prevents issues where the frontend sends stale/invalid data
            let email = recipient.email;

            if ((recipient.role === 'TENANT' || recipient.role === 'SIGNER') && lease.tenant) {
              const tenant = lease.tenant as any;
              if (tenant.email) {
                this.logger.log(`Overriding recipient email with database value: ${tenant.email}`);
                email = tenant.email;
              }
            }

            // Determine clientUserId for embedded signing logic
            // If the recipient is a TENANT, we MUST enforce clientUserId to ensure embedded signing
            let clientUserId = recipient.userId ? recipient.userId : undefined;
            let dbUserId = recipient.userId;

            if ((recipient.role === 'TENANT' || recipient.role === 'SIGNER') && lease.tenant) {
              const tenantId = lease.tenant.id;
              if (!clientUserId || clientUserId !== tenantId) {
                clientUserId = tenantId;
                this.logger.log(`Forcing embedded signing for tenant: clientUserId=${clientUserId}`);
              }
              if (!dbUserId || dbUserId !== tenantId) {
                dbUserId = tenantId;
              }
            }

            return {
              name: recipient.name,
              email: recipient.email,
              phone: recipient.phone,
              role: recipient.role,
              userId: dbUserId, // Use the enforced userId
              status: EsignParticipantStatus.SENT,
              // We don't store clientUserId in the DB directly, but we use it when creating the envelope
              recipientId: providerResponse.recipients.find((entry) => entry.email === email)?.recipientId,
            };
          }),
        },
      },
      include: { participants: true },
    })) as EsignEnvelope & { participants: { id: number; name: string; email: string; phone?: string | null; userId?: string | null; status: EsignParticipantStatus }[] };

    await Promise.all(
      envelope.participants.map((participant) =>
        this.notificationsService.sendSignatureAlert({
          event: 'REQUESTED',
          envelopeId: envelope.id,
          leaseId: leaseIdForNotifications,
          participantName: participant.name,
          userId: participant.userId ?? undefined,
          email: participant.email,
          phone: participant.phone ?? undefined,
        }),
      ),
    );

    return envelope;
  }

  async listLeaseEnvelopes(leaseId: string, user: { userId: string; role: Role }) {
    const normalizedLeaseId = String(leaseId);
    const lease = await this.prisma.lease.findUnique({ where: { id: normalizedLeaseId } });
    if (!lease) {
      throw new NotFoundException('Lease not found.');
    }

    if (user.role === Role.TENANT && lease.tenantId !== user.userId) {
      throw new ForbiddenException('You are not allowed to view this lease.');
    }

    return this.prisma.esignEnvelope.findMany({
      where: { leaseId: normalizedLeaseId },
      include: { participants: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getEnvelope(envelopeId: number, user: { userId: string; role: Role }) {
    const envelope = await this.prisma.esignEnvelope.findUnique({
      where: { id: envelopeId },
      include: {
        participants: true,
        signedPdfDocument: true,
        auditTrailDocument: true,
        lease: {
          include: { tenant: true },
        },
        createdBy: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    if (!envelope) {
      throw new NotFoundException('Envelope not found.');
    }

    // Authorization check
    if (user.role === Role.TENANT && envelope.lease.tenantId !== user.userId) {
      throw new ForbiddenException('You are not allowed to view this envelope.');
    }

    return envelope;
  }

  async voidEnvelope(envelopeId: number, reason: string | undefined, actorId: string) {
    const envelope = await this.prisma.esignEnvelope.findUnique({
      where: { id: envelopeId },
      include: { participants: true },
    });

    if (!envelope) {
      throw new NotFoundException('Envelope not found.');
    }

    if (envelope.status === EsignEnvelopeStatus.COMPLETED) {
      throw new BadRequestException('Cannot void a completed envelope.');
    }

    if (envelope.status === EsignEnvelopeStatus.VOIDED) {
      throw new BadRequestException('Envelope is already voided.');
    }

    // Call provider API to void - use stored providerBaseURL
    if (this.providerBaseURL && this.isValidUrl(this.providerBaseURL)) {
      try {
        const endpointUrl = this.buildProviderEndpoint(envelope.provider, `/envelopes/${envelope.providerEnvelopeId}/void`);
        await this.httpClient.request({
          method: 'PATCH',
          url: endpointUrl,
          data: { reason: reason || 'Voided by property manager' },
          headers: this.buildProviderHeaders(envelope.provider),
        });
        this.logger.log(`Successfully voided envelope ${envelope.providerEnvelopeId} on provider`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.warn(`Failed to void envelope on provider, voiding locally. Error: ${errorMessage}`);
        // Continue with local void even if provider call fails
      }
    } else {
      this.logger.debug('No provider base URL configured, voiding locally only');
    }

    const existingMetadata = (envelope.providerMetadata as Record<string, unknown>) || {};

    // Update local status
    const updated = await this.prisma.esignEnvelope.update({
      where: { id: envelopeId },
      data: {
        status: EsignEnvelopeStatus.VOIDED,
        providerStatus: 'VOIDED',
        providerMetadata: {
          ...existingMetadata,
          voidedAt: new Date().toISOString(),
          voidedBy: actorId,
          voidReason: reason || 'Voided by property manager',
        } as Prisma.JsonValue,
      },
      include: { participants: true },
    });

    // Notify participants
    await Promise.all(
      envelope.participants.map((participant) =>
        this.notificationsService.sendSignatureAlert({
          event: 'VOIDED' as any, // Will add to notification service
          envelopeId: updated.id,
          leaseId: updated.leaseId.toString(),
          participantName: participant.name,
          userId: participant.userId ?? undefined,
          email: participant.email,
          phone: participant.phone ?? undefined,
        }),
      ),
    );

    return updated;
  }

  async refreshEnvelopeStatus(envelopeId: number, user: { userId: string; role: Role }) {
    const envelope = await this.prisma.esignEnvelope.findUnique({
      where: { id: envelopeId },
      include: { participants: true },
    });

    if (!envelope) {
      throw new NotFoundException('Envelope not found.');
    }

    // Authorization check
    const lease = await this.prisma.lease.findUnique({
      where: { id: envelope.leaseId },
    });

    if (!lease) {
      throw new NotFoundException('Lease not found.');
    }

    if (user.role === Role.TENANT && lease.tenantId !== user.userId) {
      throw new ForbiddenException('You are not allowed to refresh this envelope.');
    }

    // For DocuSign, use SDK directly
    if (envelope.provider === EsignProvider.DOCUSIGN) {
      return this.refreshDocuSignEnvelopeStatus(envelopeId, envelope);
    }

    // Poll provider for current status - use stored providerBaseURL
    if (!this.providerBaseURL || !this.isValidUrl(this.providerBaseURL)) {
      this.logger.error(`Invalid ESIGN_PROVIDER_BASE_URL: "${this.providerBaseURL}". Expected format: https://demo.docusign.net/restapi/v2.1`);
      throw new BadRequestException(`E-signature provider URL is invalid: "${this.providerBaseURL}". Please check your configuration. Expected format: https://demo.docusign.net/restapi/v2.1`);
    }

    try {
      const endpointUrl = this.buildProviderEndpoint(envelope.provider, `/envelopes/${envelope.providerEnvelopeId}`);
      const response = await this.httpClient.request<{
        envelopeId: string;
        status: string;
        recipients?: ProviderRecipient[];
      }>({
        method: 'GET',
        url: endpointUrl,
        headers: this.buildProviderHeaders(envelope.provider),
      });

      const status = this.mapEnvelopeStatus(response.data.status);
      const updateData: Prisma.EsignEnvelopeUpdateInput = {
        providerStatus: response.data.status,
        providerMetadata: JSON.parse(JSON.stringify(response.data)) as Prisma.JsonValue,
        ...(status && { status }),
      };

      const updated = await this.prisma.esignEnvelope.update({
        where: { id: envelopeId },
        data: updateData,
        include: { participants: true },
      });

      // Update participant statuses if provided
      if (response.data.recipients?.length) {
        await Promise.all(
          response.data.recipients.map((recipient) =>
            this.prisma.esignParticipant.updateMany({
              where: { envelopeId, email: recipient.email },
              data: {
                status: this.mapParticipantStatus(recipient.status) ?? EsignParticipantStatus.SENT,
              },
            }),
          ),
        );
      }

      return updated;
    } catch (error) {
      const parsedError = this.parseDocuSignError(error);
      this.logger.error(`Failed to refresh envelope status from provider: ${parsedError.message}`);
      throw new BadRequestException(`Failed to refresh envelope status: ${parsedError.message}`);
    }
  }

  /**
   * Refreshes DocuSign envelope status using the SDK
   */
  private async refreshDocuSignEnvelopeStatus(
    envelopeId: number,
    envelope: EsignEnvelope,
  ): Promise<EsignEnvelope & { participants: any[] }> {
    const basePath = this.providerBaseURL || this.configService.get<string>('ESIGN_PROVIDER_BASE_URL');
    const accountId = this.configService.get<string>('ESIGN_PROVIDER_ACCOUNT_ID');

    if (!basePath || !accountId) {
      throw new BadRequestException('DocuSign configuration incomplete. Please check your environment variables.');
    }

    try {
      const accessToken = await this.ensureValidToken();
      if (!accessToken) {
        throw new BadRequestException('No valid access token available. Please check your API credentials.');
      }

      // Use direct HTTP calls instead of SDK
      const envelopeUrl = `${basePath}/accounts/${accountId}/envelopes/${envelope.providerEnvelopeId}`;
      const envelopeResponse = await axios.get(envelopeUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      const envelopeInfo = envelopeResponse.data;

      const recipientsUrl = `${basePath}/accounts/${accountId}/envelopes/${envelope.providerEnvelopeId}/recipients`;
      const recipientsResponse = await axios.get(recipientsUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      const recipients = recipientsResponse.data;

      const status = this.mapEnvelopeStatus(envelopeInfo.status);
      const updateData: Prisma.EsignEnvelopeUpdateInput = {
        providerStatus: envelopeInfo.status,
        providerMetadata: JSON.parse(JSON.stringify(envelopeInfo)) as Prisma.JsonValue,
        ...(status && { status }),
      };

      const updated = await this.prisma.esignEnvelope.update({
        where: { id: envelopeId },
        data: updateData,
        include: { participants: true },
      });

      // Update participant statuses
      if (recipients.signers && Array.isArray(recipients.signers)) {
        await Promise.all(
          recipients.signers.map((signer: any) =>
            this.prisma.esignParticipant.updateMany({
              where: { envelopeId, email: signer.email },
              data: {
                status: this.mapParticipantStatus(signer.status) ?? EsignParticipantStatus.SENT,
              },
            }),
          ),
        );
      }

      return updated;
    } catch (error) {
      const parsedError = this.parseDocuSignError(error);
      this.logger.error(`Failed to refresh DocuSign envelope status: ${parsedError.message}`);
      throw new BadRequestException(`Failed to refresh envelope status: ${parsedError.message}`);
    }
  }

  async resendNotifications(envelopeId: number, actorId: string) {
    const envelope = await this.prisma.esignEnvelope.findUnique({
      where: { id: envelopeId },
      include: { participants: true },
    });

    if (!envelope) {
      throw new NotFoundException('Envelope not found.');
    }

    if (envelope.status === EsignEnvelopeStatus.COMPLETED) {
      throw new BadRequestException('Cannot resend notifications for a completed envelope.');
    }

    if (envelope.status === EsignEnvelopeStatus.VOIDED) {
      throw new BadRequestException('Cannot resend notifications for a voided envelope.');
    }

    // Resend notifications to all participants who haven't signed
    const pendingParticipants = envelope.participants.filter(
      (p) => p.status !== EsignParticipantStatus.SIGNED && p.status !== EsignParticipantStatus.DECLINED,
    );

    await Promise.all(
      pendingParticipants.map((participant) =>
        this.notificationsService.sendSignatureAlert({
          event: 'REQUESTED',
          envelopeId: envelope.id,
          leaseId: envelope.leaseId.toString(),
          participantName: participant.name,
          userId: participant.userId ?? undefined,
          email: participant.email,
          phone: participant.phone ?? undefined,
        }),
      ),
    );

    // Update metadata to track reminder count
    const existingMetadata = (envelope.providerMetadata as Record<string, unknown>) || {};
    const reminderCount = ((existingMetadata.reminderCount as number) || 0) + 1;

    await this.prisma.esignEnvelope.update({
      where: { id: envelopeId },
      data: {
        providerMetadata: {
          ...existingMetadata,
          reminderCount,
          lastReminderAt: new Date().toISOString(),
          lastReminderBy: actorId,
        } as Prisma.JsonValue,
      },
    });

    return {
      success: true,
      participantsNotified: pendingParticipants.length,
      reminderCount,
    };
  }

  async getDocumentStream(
    envelopeId: number,
    documentType: 'signed' | 'certificate',
    user: { userId: string; role: Role },
  ) {
    const envelope = await this.prisma.esignEnvelope.findUnique({
      where: { id: envelopeId },
      include: {
        lease: { include: { tenant: true } },
        signedPdfDocument: documentType === 'signed',
        auditTrailDocument: documentType === 'certificate',
      },
    });

    if (!envelope) {
      throw new NotFoundException('Envelope not found.');
    }

    // Authorization check
    if (user.role === Role.TENANT && envelope.lease.tenantId !== user.userId) {
      throw new ForbiddenException('You are not allowed to access this document.');
    }

    const document = documentType === 'signed' ? envelope.signedPdfDocument : envelope.auditTrailDocument;

    if (!document) {
      throw new NotFoundException(`${documentType} document not available.`);
    }

    // Use DocumentsService to get the file stream with proper authorization
    return this.documentsService.getFileStream(document.id, user.userId);
  }

  async createRecipientView(
    envelopeId: number,
    user: { userId: string; role: Role; username?: string },
    dto: RecipientViewDto,
  ) {
    // First, get the envelope to check lease ownership
    const envelope = await this.prisma.esignEnvelope.findUnique({
      where: { id: envelopeId },
      include: {
        lease: true,
        participants: true,
      },
    });

    if (!envelope) {
      throw new NotFoundException('Envelope not found.');
    }

    // Get user's username if not provided
    let userEmail = user.username;
    if (!userEmail) {
      const userRecord = await this.prisma.user.findUnique({
        where: { id: user.userId },
        select: { username: true },
      });
      userEmail = userRecord?.username;
    }

    // For tenants, check if they're the lease tenant OR a participant
    if (user.role === Role.TENANT) {
      const isLeaseTenant = envelope.lease.tenantId === user.userId;
      const isParticipant = envelope.participants.some(
        (p) => p.userId === user.userId || (userEmail && p.email && p.email.toLowerCase() === userEmail.toLowerCase()),
      );

      if (!isLeaseTenant && !isParticipant) {
        const debugInfo = {
          time: new Date().toISOString(),
          envelopeId,
          userId: user.userId,
          userRole: user.role,
          userEmail,
          leaseTenantId: envelope.lease.tenantId,
          participants: envelope.participants.map(p => ({
            id: p.id,
            userId: p.userId,
            email: p.email
          }))
        };

        // Log to file for AI agent retrieval
        try {
          const fs = require('fs');
          fs.appendFileSync('debug-auth.log', JSON.stringify(debugInfo, null, 2) + '\n---\n');
        } catch (e) { console.error('Failed to write debug log', e); }

        this.logger.warn(`Authorization failed for envelope ${envelopeId}. User: ${JSON.stringify(user)}, LeaseTenant: ${envelope.lease.tenantId}, UserEmail: ${userEmail}`);
        this.logger.warn(`Participants: ${JSON.stringify(envelope.participants.map(p => ({ id: p.id, userId: p.userId, email: p.email })))}`);
        throw new ForbiddenException('You are not authorized to sign this document. Please contact support if you believe this is an error.');
      }
    }

    // Find participant by userId first, then fall back to email matching
    let participant = await this.prisma.esignParticipant.findFirst({
      where: {
        envelopeId,
        OR: [
          { userId: user.userId },
          ...(userEmail ? [{ email: userEmail }] : []), // Fallback: match by email if userId not set
        ],
      },
      include: { envelope: true },
    });

    // If still not found and user is tenant, try to find by lease tenant email
    if (!participant && user.role === Role.TENANT && envelope.lease.tenantId === user.userId && userEmail) {
      participant = await this.prisma.esignParticipant.findFirst({
        where: {
          envelopeId,
          email: userEmail,
        },
        include: { envelope: true },
      });
    }

    if (!participant) {
      throw new ForbiddenException('You are not assigned to this envelope. Please contact support if you believe this is an error.');
    }

    const url = await this.requestRecipientView(participant.envelope, participant.recipientId, dto.returnUrl);

    await this.prisma.esignParticipant.update({
      where: { id: participant.id },
      data: { recipientUrl: url, status: EsignParticipantStatus.VIEWED },
    });

    return { url };
  }

  async handleProviderWebhook(payload: ProviderWebhookDto) {
    // Extract envelope ID and status from DocuSign webhook structure
    const envelopeId = payload.data?.envelopeId ?? payload.envelopeId;
    const status = payload.data?.envelopeSummary?.status ?? payload.status;
    const event = payload.event ?? payload.data?.event;
    const webhookDocuments = payload.data?.documents ?? payload.documents ?? [];

    // Validate webhook payload structure
    if (!envelopeId) {
      this.logger.warn('Received webhook with missing envelopeId', { payload });
      return { ignored: true, reason: 'Missing envelopeId' };
    }

    // TODO: Add webhook signature validation for security
    // For DocuSign, validate X-DocuSign-Signature header
    // For now, we'll log webhook events for debugging
      this.logger.log(`Received DocuSign webhook: event=${event}, envelope=${envelopeId}, status=${status}`);

    const envelope = await this.prisma.esignEnvelope.findFirst({
      where: { providerEnvelopeId: envelopeId },
      include: { participants: true },
    });

    if (!envelope) {
      this.logger.warn(`Received webhook for unknown envelope ${envelopeId}`);
      return { ignored: true, reason: 'Envelope not found' };
    }

    try {
      const mappedStatus = this.mapEnvelopeStatus(status);
      const data: Prisma.EsignEnvelopeUpdateInput = {
        providerStatus: status,
        providerMetadata: JSON.parse(JSON.stringify(payload)) as Prisma.JsonValue,
        ...(mappedStatus && { status: mappedStatus }),
      };

      const updated = await this.prisma.esignEnvelope.update({
        where: { id: envelope.id },
        data,
        include: { participants: true },
      });

      // For DocuSign webhooks, we might need to fetch recipient details
      // if they're not included in the webhook payload
      if (envelope.participants?.length) {
        await Promise.all(
          envelope.participants.map((participant) => {
            if (!participant.email) {
              this.logger.warn(`Webhook participant missing email, skipping update`);
              return Promise.resolve();
            }
            return this.prisma.esignParticipant.updateMany({
              where: { envelopeId: envelope.id, email: participant.email },
              data: { status: this.mapParticipantStatus(participant.status) ?? EsignParticipantStatus.SENT },
            });
          }),
        );
      } else {
        // If no participants in webhook, trigger a status refresh to get recipient details
        this.logger.log(`Webhook has no participant data, triggering status refresh for envelope ${envelope.id}`);
        // Don't await this to avoid blocking webhook response
        this.refreshEnvelopeStatus(envelope.id, { userId: envelope.createdById, role: 'PROPERTY_MANAGER' as any })
          .catch(err => this.logger.error(`Failed to refresh envelope after webhook: ${err.message}`));
      }

        if (mappedStatus === EsignEnvelopeStatus.COMPLETED) {
        await this.attachFinalDocuments(updated, webhookDocuments)

          await Promise.all(
            updated.participants.map((participant) =>
              this.notificationsService.sendSignatureAlert({
                event: 'COMPLETED',
                envelopeId: updated.id,
                leaseId: updated.leaseId.toString(),
                participantName: participant.name,
                userId: participant.userId ?? undefined,
                email: participant.email,
                phone: participant.phone ?? undefined,
              }),
            ),
          );
      }

      this.logger.log(`Successfully processed webhook for envelope ${envelopeId}: ${event} -> ${mappedStatus}`);
      return { success: true, envelopeId: updated.id, status: updated.status };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to process webhook for envelope ${envelopeId}: ${errorMessage}`, error);
      return { success: false, error: errorMessage };
    }
  }

  private async attachFinalDocuments(envelope: EsignEnvelope & { participants: { id: number }[] }, documents: ProviderWebhookDocumentDto[]) {
    const combined = documents.find((doc) => (doc.type ?? '').toLowerCase().includes('certificate') === false);
    const certificate = documents.find((doc) => (doc.type ?? '').toLowerCase().includes('certificate'));

    const updateData: Prisma.EsignEnvelopeUpdateInput = {};

    if (combined?.contentBase64) {
      const buffer = Buffer.from(combined.contentBase64, 'base64');
      const document = await this.documentsService.saveBuffer(buffer, {
        fileName: combined.name || `lease-${envelope.leaseId}-signed.pdf`,
        userId: envelope.createdById,
        category: DocumentCategory.LEASE,
        description: 'Signed lease PDF',
        leaseId: envelope.leaseId.toString(),
        mimeType: 'application/pdf',
      });
      updateData.signedPdfDocument = {
        connect: { id: document.id },
      };
    }

    if (certificate?.contentBase64) {
      const buffer = Buffer.from(certificate.contentBase64, 'base64');
      const document = await this.documentsService.saveBuffer(buffer, {
        fileName: certificate.name || `lease-${envelope.leaseId}-certificate.pdf`,
        userId: envelope.createdById,
        category: DocumentCategory.LEASE,
        description: 'Signature audit trail',
        leaseId: envelope.leaseId.toString(),
        mimeType: 'application/pdf',
      });
      updateData.auditTrailDocument = {
        connect: { id: document.id },
      };
    }

    if (Object.keys(updateData).length > 0) {
      await this.prisma.esignEnvelope.update({
        where: { id: envelope.id },
        data: updateData,
      });
    }
  }

  /**
   * Dispatches envelope creation to the appropriate provider
   * Uses DocuSign SDK directly for DocuSign, HTTP API for other providers
   */
  private async dispatchProviderEnvelope(
    provider: EsignProvider,
    dto: CreateEnvelopeDto,
    lease: any,
  ): Promise<ProviderEnvelopeResponse> {
    if (provider === EsignProvider.DOCUSIGN) {
      return this.createDocuSignEnvelope(dto, lease);
    }

    // Fallback to generic HTTP API for other providers (HelloSign, etc.)
    return this.createGenericProviderEnvelope(provider, dto, lease);
  }

  /**
   * Creates a DocuSign envelope using the DocuSign SDK
   * Based on DocuSign example 011: Embedded sending
   */
  private async createDocuSignEnvelope(
    dto: CreateEnvelopeDto,
    lease: any,
  ): Promise<ProviderEnvelopeResponse> {
    const basePath = this.providerBaseURL || this.configService.get<string>('ESIGN_PROVIDER_BASE_URL');
    // Use ensureValidToken to get a fresh, valid token (handling JWT refresh automatically)
    const accessToken = await this.ensureValidToken();
    const accountId = this.configService.get<string>('ESIGN_PROVIDER_ACCOUNT_ID');

    const isStrict = this.configService.get<string>('ESIGN_STRICT_MODE') === 'true';

    // if (!basePath || !accessToken || !accountId) {
    //   if (isStrict) {
    //      throw new Error("DocuSign configuration incomplete and strict mode is enabled.");
    //   }
    //   this.logger.warn('DocuSign configuration incomplete, using mock envelope');
    //   return this.createMockEnvelopeResponse(dto);
    // }

    try {
      // Initialize DocuSign API client
      const dsApiClient = new docusign.ApiClient();
      dsApiClient.setBasePath(basePath);
      dsApiClient.addDefaultHeader('Authorization', `Bearer ${accessToken}`);
      const envelopesApi = new docusign.EnvelopesApi(dsApiClient);

      // Create envelope definition
      const envelopeDefinition = await this.makeDocuSignEnvelope(dto, lease);

      // Create the envelope using direct HTTP call (bypassing SDK to avoid 404 issues)
      // We use the full URL to ensure we are hitting the correct endpoint, ignoring any pre-configured baseURL issues
      const fullUrl = `${basePath}/accounts/${accountId}/envelopes`;

      console.log('--- Debugging DocuSign Config ---');
      console.log(`Base Path: "${basePath}"`);
      console.log(`Account ID: "${accountId}"`);
      console.log(`Full URL: "${fullUrl}"`);
      console.log('-------------------------------');

      this.logger.log(`Creating envelope at: ${fullUrl}`);

      const response = await axios.post(fullUrl, envelopeDefinition, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const results = response.data;
      const envelopeId = results.envelopeId;
      this.logger.log(`DocuSign envelope created: ${envelopeId}`);

      // Get recipient information from the created envelope
      // We can also use direct HTTP for this to be consistent
      const recipientsUrl = `${basePath}/accounts/${accountId}/envelopes/${envelopeId}/recipients`;
      const recipientsResponse = await axios.get(recipientsUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      const envelopeRecipients = recipientsResponse.data;
      const recipients: ProviderRecipient[] = [];

      // Map signers - use recipientId (string) as the primary identifier
      // DocuSign API returns recipientId as a string (e.g., "1", "2") which is what we need for RecipientViewRequest
      // recipientIdGuid is a UUID used internally by DocuSign but NOT for API calls
      if (envelopeRecipients.signers && Array.isArray(envelopeRecipients.signers)) {
        envelopeRecipients.signers.forEach((signer: any, index: number) => {
          // Use recipientId (string) as primary, NOT recipientIdGuid
          // recipientIdGuid is only for reference in metadata
          const recipientId = signer.recipientId || String(index + 1);
          const email = signer.email || dto.recipients.find(r => r.email === signer.email)?.email || dto.recipients[index]?.email || '';

          recipients.push({
            email,
            recipientId: String(recipientId), // String ID (e.g., "1", "2"), not GUID
            status: signer.status || 'sent',
          });
        });
      }

      // Map carbon copies
      if (envelopeRecipients.carbonCopies && Array.isArray(envelopeRecipients.carbonCopies)) {
        envelopeRecipients.carbonCopies.forEach((cc: any, index: number) => {
          // Use recipientId (string), not recipientIdGuid
          const recipientId = cc.recipientId || `cc-${index + 1}`;
          recipients.push({
            email: cc.email || '',
            recipientId: String(recipientId), // String ID, not GUID
            status: cc.status || 'sent',
          });
        });
      }

      // If no recipients were found from API, use the DTO recipients as fallback
      if (recipients.length === 0) {
        this.logger.warn('No recipients found from DocuSign API, using DTO recipients as fallback');
        dto.recipients.forEach((recipient, index) => {
          recipients.push({
            email: recipient.email,
            recipientId: String(index + 1),
            status: 'sent',
          });
        });
      }

      return {
        envelopeId,
        status: this.mapEnvelopeStatus(envelopeDefinition.status) ?? EsignEnvelopeStatus.SENT,
        providerStatus: envelopeDefinition.status || 'sent',
        recipients,
        metadata: {
          envelopeId,
          status: envelopeDefinition.status,
          emailSubject: envelopeDefinition.emailSubject,
        },
      };
    } catch (error) {
      const parsedError = this.parseDocuSignError(error);
      this.logger.error(`Failed to create DocuSign envelope: ${parsedError.message}`);
      // Force console output for debugging
      console.error('❌ DocuSign Envelope Creation Failed:', parsedError.message);
      if (error instanceof Error && (error as any).response) {
        console.error('Response Data:', JSON.stringify((error as any).response.data, null, 2));
      }

      if (parsedError.code) {
        this.logger.error(`DocuSign Error Code: ${parsedError.code}`);
      }

      // Fallback to mock envelope
      if (this.configService.get<string>('ESIGN_STRICT_MODE') === 'true') {
        this.logger.error(`Strict mode enabled. Aborting envelope creation due to DocuSign error: ${parsedError.message}`);
        throw new Error(`E-signature provider error: ${parsedError.message}`);
      }
      this.logger.warn(`Using mock envelope due to error: ${parsedError.message}`);
      return this.createMockEnvelopeResponse(dto);
    }
  }

  /**
   * Creates a DocuSign envelope definition with documents, recipients, and tabs
   */
  private async makeDocuSignEnvelope(
    dto: CreateEnvelopeDto,
    lease: any,
  ): Promise<any> {
    const env = new (docusign as any).EnvelopeDefinition();
    env.emailSubject = dto.message || `Please sign your lease for ${lease.unit?.property?.name || 'Property'}`;

    // Get lease document if available
    const documents: any[] = [];
    let documentId = 1;

    if (lease.generalDocuments && lease.generalDocuments.length > 0) {
      // Use the most recent lease document
      const leaseDoc = lease.generalDocuments[0];
      try {
        // Try to get document stream - use the document's uploadedBy or the envelope creator
        // If that fails, try with system user (ID 1) as fallback
        let documentStream;
        try {
        documentStream = await this.documentsService.getFileStream(
          leaseDoc.id,
          leaseDoc.uploadedById || lease.createdById || '1'
        );
        } catch (accessError) {
          // If access denied, try with system user
          this.logger.debug(`Access denied for document ${leaseDoc.id}, trying with system user`);
          documentStream = await this.documentsService.getFileStream(leaseDoc.id, '1');
        }

        const chunks: Buffer[] = [];

        // Read the stream into chunks
        for await (const chunk of documentStream.stream) {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        }

        if (chunks.length === 0) {
          throw new Error('Document stream was empty');
        }

        const documentBuffer = Buffer.concat(chunks);
        const documentBase64 = documentBuffer.toString('base64');

        if (!documentBase64 || documentBase64.length === 0) {
          throw new Error('Document base64 encoding failed');
        }

        // Determine file extension from filename or mime type
        const fileName = leaseDoc.fileName || `Lease-${lease.id}.pdf`;
        let fileExtension = path.extname(fileName).substring(1).toLowerCase();
        if (!fileExtension || fileExtension === '') {
          // Try to infer from mime type
          const mimeType = leaseDoc.mimeType || 'application/pdf';
          if (mimeType.includes('pdf')) fileExtension = 'pdf';
          else if (mimeType.includes('word') || mimeType.includes('docx')) fileExtension = 'docx';
          else if (mimeType.includes('html')) fileExtension = 'html';
          else fileExtension = 'pdf'; // Default to PDF
        }

        const doc = new (docusign as any).Document();
        doc.documentBase64 = documentBase64;
        doc.name = fileName;
        doc.fileExtension = fileExtension;
        doc.documentId = String(documentId++);
        documents.push(doc);

        this.logger.log(`Added document to envelope: ${fileName} (${fileExtension}, ${Math.round(documentBase64.length / 1024)}KB)`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.warn(`Failed to load lease document ${leaseDoc.id}: ${errorMessage}. Will create envelope with generated HTML document.`);
      }
    }

    // If no documents found, create a simple HTML document with lease information
    if (documents.length === 0) {
      const htmlContent = this.generateLeaseDocumentHtml(lease, dto);
      const doc = new (docusign as any).Document();
      doc.documentBase64 = Buffer.from(htmlContent).toString('base64');
      doc.name = `Lease Agreement - ${lease.unit?.property?.name || 'Property'}`;
      doc.fileExtension = 'html';
      doc.documentId = String(documentId++);
      documents.push(doc);
    }

    env.documents = documents;

    // Create recipients
    const signers: docusign.Signer[] = [];
    const carbonCopies: docusign.CarbonCopy[] = [];

    dto.recipients.forEach((recipient, index) => {
      const recipientId = String(index + 1);
      const routingOrder = String(index + 1);

      if (recipient.role === 'TENANT' || recipient.role === 'SIGNER') {
        // Create signer
        const signer = new (docusign as any).Signer();
        signer.email = recipient.email;
        signer.name = recipient.name;
        signer.recipientId = recipientId;
        signer.routingOrder = routingOrder;
        signer.recipientId = recipientId;
        signer.routingOrder = routingOrder;

        // Use the enforced clientUserId logic we discussed
        // If it's a tenant, we want them embedded.
        if (recipient.role === 'TENANT') {
          // For tenants, we default to their User ID if available, or a deterministic fallback
          signer.clientUserId = recipient.userId ? String(recipient.userId) : (lease.tenantId ? String(lease.tenantId) : undefined);
          if (!signer.clientUserId) {
            // Warning: Embedded signing requires clientUserId. If missing, they will get an email.
            this.logger.warn(`Tenant recipient ${recipient.email} missing userId, defaulting to email flow.`);
          }
        } else {
          signer.clientUserId = recipient.userId ? String(recipient.userId) : undefined;
        }

        // Add signature tabs
        const signHere = new (docusign as any).SignHere();
        signHere.anchorString = '**signature_1**';
        signHere.anchorYOffset = '10';
        signHere.anchorUnits = 'pixels';
        signHere.anchorXOffset = '20';

        const tabs = new (docusign as any).Tabs();
        tabs.signHereTabs = [signHere];
        signer.tabs = tabs;

        signers.push(signer);
      } else {
        // Create carbon copy
        const cc = new (docusign as any).CarbonCopy();
        cc.email = recipient.email;
        cc.name = recipient.name;
        cc.recipientId = recipientId; // String ID (e.g., "1", "2"), not a number
        cc.routingOrder = routingOrder;
        carbonCopies.push(cc);
      }
    });

    const recipients = new (docusign as any).Recipients();
    if (signers.length > 0) {
      recipients.signers = signers;
    }
    if (carbonCopies.length > 0) {
      recipients.carbonCopies = carbonCopies;
    }
    env.recipients = recipients;

    // Set envelope status: 'sent' to send immediately, 'created' for draft
    env.status = 'sent';

    return env;
  }

  /**
   * Generates a simple HTML lease document if no document is available
   */
  private generateLeaseDocumentHtml(lease: any, dto: CreateEnvelopeDto): string {
    const tenantName = lease.tenant?.name || 'Tenant';
    const propertyName = lease.unit?.property?.name || 'Property';
    const unitNumber = lease.unit?.unitNumber || 'N/A';
    const rentAmount = lease.rentAmount
      ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(lease.rentAmount)
      : lease.monthlyRent
        ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(lease.monthlyRent)
        : 'TBD';

    return `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <title>Lease Agreement</title>
  </head>
  <body style="font-family: Arial, sans-serif; margin: 2em; line-height: 1.6;">
    <h1 style="color: #1a1a1a; border-bottom: 2px solid #333; padding-bottom: 0.5em;">
      Lease Agreement
    </h1>
    
    <div style="margin-top: 2em;">
      <h2>Property Information</h2>
      <p><strong>Property:</strong> ${propertyName}</p>
      <p><strong>Unit Number:</strong> ${unitNumber}</p>
      <p><strong>Monthly Rent:</strong> ${rentAmount}</p>
    </div>

    <div style="margin-top: 2em;">
      <h2>Tenant Information</h2>
      <p><strong>Tenant Name:</strong> ${tenantName}</p>
      <p><strong>Email:</strong> ${lease.tenant?.email || 'N/A'}</p>
    </div>

    <div style="margin-top: 2em;">
      <h2>Lease Terms</h2>
      ${dto.message ? `<p>${dto.message}</p>` : ''}
      <p>By signing below, you agree to the terms and conditions of this lease agreement.</p>
    </div>

    <div style="margin-top: 3em; border-top: 1px solid #ccc; padding-top: 2em;">
      <h3>Signature</h3>
      <p>Please sign below to indicate your agreement:</p>
      <p style="color: white; font-size: 0.1px;">**signature_1**</p>
      <div style="border: 1px solid #ccc; min-height: 100px; margin-top: 1em; padding: 1em;">
        <p style="color: #999;">Signature will appear here</p>
      </div>
    </div>

    <div style="margin-top: 2em; font-size: 0.9em; color: #666;">
      <p>This is a legally binding document. Please review all terms before signing.</p>
    </div>
  </body>
</html>
    `.trim();
  }

  /**
   * Creates envelope using generic HTTP API (for HelloSign or other providers)
   */
  private async createGenericProviderEnvelope(
    provider: EsignProvider,
    dto: CreateEnvelopeDto,
    lease: any,
  ): Promise<ProviderEnvelopeResponse> {
    const payload = {
      templateId: dto.templateId,
      message: dto.message,
      lease: {
        id: lease.id,
        tenant: lease.tenant,
        unit: lease.unit,
      },
      recipients: dto.recipients,
    };

    // Use stored providerBaseURL instead of re-reading config
    if (!this.providerBaseURL || !this.isValidUrl(this.providerBaseURL)) {
      this.logger.debug('No provider base URL configured, using mock envelope');
      return this.createMockEnvelopeResponse(dto);
    }

    try {
      const endpointUrl = this.buildProviderEndpoint(provider, '/envelopes');
      const response = await this.httpClient.request<{ envelopeId: string; status: string; recipients?: ProviderRecipient[] }>({
        method: 'POST',
        url: endpointUrl,
        data: payload,
        headers: this.buildProviderHeaders(provider),
      });

      return {
        envelopeId: response.data.envelopeId,
        status: this.mapEnvelopeStatus(response.data.status) ?? EsignEnvelopeStatus.SENT,
        providerStatus: response.data.status,
        recipients: response.data.recipients ?? [],
        metadata: response.data as Record<string, unknown>,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Provider request failed, using mock envelope. Error: ${errorMessage}`);
      return this.createMockEnvelopeResponse(dto);
    }
  }

  /**
   * Creates a mock envelope response when provider is not configured
   */
  private createMockEnvelopeResponse(dto: CreateEnvelopeDto): ProviderEnvelopeResponse {
    return {
      envelopeId: randomUUID(),
      status: EsignEnvelopeStatus.SENT,
      providerStatus: 'SENT',
      recipients: dto.recipients.map((recipient, index) => ({
        email: recipient.email,
        recipientId: `recipient-${index}`,
      })),
      metadata: {
        mock: true,
        message: 'Mock envelope - provider not configured',
      },
    };
  }

  private async requestRecipientView(envelope: EsignEnvelope, recipientId: string | null | undefined, returnUrl: string) {
    // Always validate returnUrl first
    const safeReturnUrl = this.validateReturnUrl(returnUrl);

    if (!recipientId) {
      this.logger.warn(`No recipientId provided for envelope ${envelope.id}, using fallback URL`);
      return `${safeReturnUrl}?envelope=${envelope.providerEnvelopeId}`;
    }

    // For DocuSign, use the SDK directly
    if (envelope.provider === EsignProvider.DOCUSIGN) {
      return this.requestDocuSignRecipientView(envelope, recipientId, safeReturnUrl);
    }

    // For other providers, use HTTP API
    if (!this.providerBaseURL || !this.isValidUrl(this.providerBaseURL)) {
      this.logger.debug('No provider base URL configured, using fallback URL');
      return `${safeReturnUrl}?envelope=${envelope.providerEnvelopeId}&recipient=${recipientId}`;
    }

    try {
      const endpointUrl = this.buildProviderEndpoint(envelope.provider, `/envelopes/${envelope.providerEnvelopeId}/views/recipient`);
      const response = await this.httpClient.request<{ url: string }>({
        method: 'POST',
        url: endpointUrl,
        data: {
          recipientId,
          returnUrl: safeReturnUrl,
        },
        headers: this.buildProviderHeaders(envelope.provider),
      });

      // Validate the response URL
      if (response.data?.url && this.isValidUrl(response.data.url)) {
        return response.data.url;
      } else {
        throw new Error('Invalid URL received from provider');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Check if it's specifically an "Invalid URL" error from axios
      if (errorMessage.includes('Invalid URL') || errorMessage.includes('TypeError')) {
        this.logger.warn(`Invalid URL error when fetching recipient view. BaseURL: ${this.providerBaseURL}, ReturnURL: ${returnUrl}. Using fallback.`);
      } else {
        this.logger.warn(`Failed to fetch recipient view URL from provider, using fallback. Error: ${errorMessage}`);
      }

      // Use fallback URL (already validated)
      return `${safeReturnUrl}?envelope=${envelope.providerEnvelopeId}&recipient=${recipientId}`;
    }
  }

  /**
   * Requests a recipient view URL from DocuSign using the SDK
   */
  /**
   * Requests a recipient view URL from DocuSign using the SDK
   */
  private async requestDocuSignRecipientView(
    envelope: EsignEnvelope,
    recipientId: string,
    returnUrl: string,
  ): Promise<string> {
    const basePath = this.providerBaseURL || this.configService.get<string>('ESIGN_PROVIDER_BASE_URL');
    const accountId = this.configService.get<string>('ESIGN_PROVIDER_ACCOUNT_ID');

    if (!basePath || !accountId) {
      this.logger.warn('DocuSign configuration incomplete, using fallback URL');
      return `${returnUrl}?envelope=${envelope.providerEnvelopeId}&recipient=${recipientId}&error=config_error`;
    }

    // Get participant from database to get email and name
    const participant = await this.prisma.esignParticipant.findFirst({
      where: {
        envelopeId: envelope.id,
        recipientId: recipientId,
      },
    });

    if (!participant) {
      this.logger.error(`Participant not found for envelope ${envelope.id} with recipientId ${recipientId}`);
      // Return a safe fallback that will show "Invalid Recipient" on frontend
      return `${returnUrl}?envelope=${envelope.providerEnvelopeId}&recipient=${recipientId}&error=invalid_recipient`;
    }

    if (!participant.email) {
      this.logger.error(`Participant ${participant.id} has no email address`);
      // Return a safe fallback
      return `${returnUrl}?envelope=${envelope.providerEnvelopeId}&recipient=${recipientId}&error=missing_email`;
    }

    try {
      // Ensure we have a valid access token
      const accessToken = await this.ensureValidToken();
      if (!accessToken) {
        this.logger.warn('No valid access token available, using fallback URL');
        return `${returnUrl}?envelope=${envelope.providerEnvelopeId}&recipient=${recipientId}&error=token_invalid`;
      }

      // Initialize DocuSign API client
      const dsApiClient = new docusign.ApiClient();
      dsApiClient.setBasePath(basePath);
      dsApiClient.addDefaultHeader('Authorization', `Bearer ${accessToken}`);

      // Create recipient view request with required fields
      // We construct the payload manually to use with axios
      const viewRequest = {
        recipientId: recipientId, // String ID (e.g., "1", "2"), not GUID
        returnUrl: returnUrl,
        authenticationMethod: 'email', // Use email authentication for embedded signing
        email: participant.email, // Required for embedded signing
        userName: participant.name, // Required for embedded signing
        clientUserId: participant.userId ? String(participant.userId) : undefined,
      };

      // Request the recipient view using direct HTTP call
      const fullUrl = `${basePath}/accounts/${accountId}/envelopes/${envelope.providerEnvelopeId}/views/recipient`;
      this.logger.log(`Requesting recipient view at: ${fullUrl} for user ${participant.email} (ClientUserID: ${viewRequest.clientUserId})`);

      const response = await axios.post(
        fullUrl,
        viewRequest,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      const results = response.data;

      if (results.url) {
        this.logger.log(`DocuSign recipient view URL generated for envelope ${envelope.providerEnvelopeId}`);
        return results.url;
      } else {
        throw new Error('No URL returned from DocuSign recipient view request');
      }
    } catch (error) {
      const parsedError = this.parseDocuSignError(error);
      this.logger.error(`Failed to get DocuSign recipient view: ${parsedError.message}`);

      if (parsedError.code) {
        this.logger.error(`DocuSign Error Code: ${parsedError.code}`);
      }

      // Provide user-friendly error message based on error type
      let errorParam = 'view_failed';
      if (parsedError.code === 'INVALID_RECIPIENT') {
        errorParam = 'invalid_recipient';
      } else if (parsedError.code === 'TOKEN_EXPIRED' || parsedError.message.includes('token')) {
        errorParam = 'token_expired';
      } else if (parsedError.code === 'UNKNOWN_ENVELOPE_RECIPIENT') {
        // This often happens if clientUserId doesn't match what was sent during envelope creation
        errorParam = 'recipient_mismatch';
        this.logger.warn('Possible clientUserId mismatch. Ensure the user ID matches what was used to create the envelope.');
      } else if (parsedError.code === 'ENVELOPE_INVALID_STATUS') {
        // Envelope might be voided or completed
        errorParam = 'envelope_status_invalid';
      }

      // Fallback to a URL that will show an error message
      return `${returnUrl}?envelope=${envelope.providerEnvelopeId}&recipient=${recipientId}&error=${errorParam}`;
    }
  }

  private validateReturnUrl(returnUrl: string): string {
    try {
      // Handle empty or null returnUrl
      if (!returnUrl || typeof returnUrl !== 'string' || returnUrl.trim() === '') {
        const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
        return `${frontendUrl}/my-lease`;
      }

      // Trim whitespace
      const trimmed = returnUrl.trim();

      // If it's already a valid absolute URL, return it
      if (this.isValidUrl(trimmed)) {
        return trimmed;
      }

      // If it's a relative path, make it absolute using frontend URL
      if (trimmed.startsWith('/')) {
        const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
        const fullUrl = `${frontendUrl}${trimmed}`;

        // Validate the constructed URL
        if (this.isValidUrl(fullUrl)) {
          return fullUrl;
        }
      }

      // If it's a protocol-relative URL (//example.com), add https:
      if (trimmed.startsWith('//')) {
        const httpsUrl = `https:${trimmed}`;
        if (this.isValidUrl(httpsUrl)) {
          return httpsUrl;
        }
      }

      // Fallback to a safe default
      const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
      this.logger.debug(`Invalid returnUrl format: "${returnUrl}", using fallback: ${frontendUrl}/my-lease`);
      return `${frontendUrl}/my-lease`;
    } catch (error) {
      // Fallback to a safe default on any error
      const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
      this.logger.warn(`Error validating returnUrl: "${returnUrl}", using fallback: ${frontendUrl}/my-lease`, error);
      return `${frontendUrl}/my-lease`;
    }
  }

  private mapEnvelopeStatus(status?: string): EsignEnvelopeStatus | undefined {
    if (!status) {
      return undefined;
    }

    const normalized = status.toUpperCase();
    switch (normalized) {
      case 'CREATED':
        return EsignEnvelopeStatus.CREATED;
      case 'SENT':
      case 'IN_PROGRESS':
        return EsignEnvelopeStatus.SENT;
      case 'DELIVERED':
        return EsignEnvelopeStatus.DELIVERED;
      case 'COMPLETED':
        return EsignEnvelopeStatus.COMPLETED;
      case 'DECLINED':
        return EsignEnvelopeStatus.DECLINED;
      case 'VOIDED':
        return EsignEnvelopeStatus.VOIDED;
      default:
        return EsignEnvelopeStatus.ERROR;
    }
  }

  private mapParticipantStatus(status?: string): EsignParticipantStatus | undefined {
    if (!status) {
      return undefined;
    }

    const normalized = status.toUpperCase();
    switch (normalized) {
      case 'CREATED':
        return EsignParticipantStatus.CREATED;
      case 'SENT':
      case 'DELIVERED':
        return EsignParticipantStatus.SENT;
      case 'COMPLETED':
      case 'SIGNED':
        return EsignParticipantStatus.SIGNED;
      case 'DECLINED':
        return EsignParticipantStatus.DECLINED;
      case 'VIEWED':
        return EsignParticipantStatus.VIEWED;
      default:
        return EsignParticipantStatus.ERROR;
    }
  }

  async sendRemindersForPendingEnvelopes() {
    const reminderIntervalDays = this.configService.get<number>('ESIGN_REMINDER_INTERVAL_DAYS', 3);
    const maxReminders = this.configService.get<number>('ESIGN_MAX_REMINDERS', 3);
    const enabled = this.configService.get<boolean>('ESIGN_REMINDER_ENABLED', true);

    if (!enabled) {
      this.logger.debug('E-signature reminders are disabled');
      return { sent: 0, skipped: 0 };
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - reminderIntervalDays);
    cutoffDate.setHours(0, 0, 0, 0);

    // Find pending envelopes that haven't been updated recently
    const pendingEnvelopes = await this.prisma.esignEnvelope.findMany({
      where: {
        status: {
          in: [EsignEnvelopeStatus.SENT, EsignEnvelopeStatus.DELIVERED],
        },
        updatedAt: {
          lte: cutoffDate,
        },
      },
      include: {
        participants: {
          where: {
            status: {
              notIn: [EsignParticipantStatus.SIGNED, EsignParticipantStatus.DECLINED],
            },
          },
        },
        lease: {
          include: { tenant: true },
        },
      },
    });

    let sentCount = 0;
    let skippedCount = 0;

    for (const envelope of pendingEnvelopes) {
      if (envelope.participants.length === 0) {
        continue; // No pending participants
      }

      const metadata = (envelope.providerMetadata as Record<string, unknown>) || {};
      const reminderCount = ((metadata.reminderCount as number) || 0);

      if (reminderCount >= maxReminders) {
        this.logger.debug(`Skipping envelope ${envelope.id} - max reminders (${maxReminders}) reached`);
        skippedCount++;
        continue;
      }

      // Send reminders to all pending participants
        for (const participant of envelope.participants) {
          try {
            await this.notificationsService.sendSignatureAlert({
              event: 'REQUESTED',
              envelopeId: envelope.id,
              leaseId: envelope.leaseId.toString(),
              participantName: participant.name,
              userId: participant.userId ?? undefined,
              email: participant.email,
              phone: participant.phone ?? undefined,
          });

          sentCount++;
        } catch (error) {
          this.logger.error(
            `Failed to send reminder to participant ${participant.id} for envelope ${envelope.id}: ${error}`,
          );
        }
      }

      // Update reminder count
      try {
        await this.prisma.esignEnvelope.update({
          where: { id: envelope.id },
          data: {
            providerMetadata: {
              ...metadata,
              reminderCount: reminderCount + 1,
              lastReminderAt: new Date().toISOString(),
            } as Prisma.JsonValue,
          },
        });
      } catch (error) {
        this.logger.error(`Failed to update reminder count for envelope ${envelope.id}: ${error}`);
      }
    }

    this.logger.log(
      `E-signature reminders: ${sentCount} sent, ${skippedCount} skipped (max reminders reached)`,
    );

    return { sent: sentCount, skipped: skippedCount };
  }

  private parseNumericId(value: string | number, field: string): string {
    return String(value);
  }

  /**
   * Builds the correct API endpoint URL for the given provider
   * DocuSign requires account ID in the path, other providers use generic paths
   */
  private buildProviderEndpoint(provider: EsignProvider, path: string): string {
    if (provider === EsignProvider.DOCUSIGN) {
      const accountId = this.configService.get<string>('ESIGN_PROVIDER_ACCOUNT_ID');
      if (!accountId) {
        throw new Error('ESIGN_PROVIDER_ACCOUNT_ID is required for DocuSign');
      }
      // DocuSign requires account ID in path: /accounts/{accountId}/envelopes/...
      if (path.startsWith('/envelopes')) {
        return `/accounts/${accountId}${path}`;
      }
      // If path already includes /accounts, use as-is
      return path;
    }
    // Other providers use generic paths
    return path;
  }

  private buildProviderHeaders(provider: EsignProvider) {
    const token = this.configService.get<string>('ESIGN_PROVIDER_API_KEY');
    const accountId = this.configService.get<string>('ESIGN_PROVIDER_ACCOUNT_ID');
    const headers: Record<string, string> = {};

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    if (accountId) {
      headers['X-Esign-Account'] = accountId;
    }

    headers['X-Esign-Provider'] = provider;

    return headers;
  }

  /**
   * Parses DocuSign API errors and extracts error codes and messages
   * Returns a user-friendly error object
   */
  private parseDocuSignError(error: unknown): { code: string | null; message: string; details?: any } {
    const defaultMessage = error instanceof Error ? error.message : String(error);

    if (!error || typeof error !== 'object') {
      return { code: null, message: defaultMessage };
    }

    // Check for DocuSign API error response
    if ('response' in error) {
      const apiError = error as any;
      const responseBody = apiError.response?.body || apiError.response?.data;

      if (responseBody) {
        const errorCode = responseBody.errorCode || responseBody.error_code || null;
        const errorMessage = responseBody.message || responseBody.error_description || defaultMessage;

        // Map common DocuSign error codes to user-friendly messages
        const errorCodeMap: Record<string, string> = {
          'INVALID_RECIPIENT': 'Invalid recipient ID. The recipient may not exist or may have already signed.',
          'TOKEN_EXPIRED': 'Authentication token has expired. Please refresh your credentials.',
          'INVALID_TOKEN': 'Invalid authentication token. Please check your API credentials.',
          'ENVELOPE_NOT_FOUND': 'Envelope not found. It may have been deleted or the ID is incorrect.',
          'DOCUMENT_NOT_FOUND': 'Document not found in the envelope.',
          'INVALID_DOCUMENT': 'Invalid document format or document is too large.',
          'INVALID_REQUEST_BODY': 'Invalid request. Please check all required fields are provided.',
          'ACCOUNT_NOT_FOUND': 'Account ID not found. Please verify your account ID is correct.',
        };

        const userFriendlyMessage = errorCode && errorCodeMap[errorCode]
          ? `${errorCodeMap[errorCode]} (${errorMessage})`
          : errorMessage;

        return {
          code: errorCode,
          message: errorMessage,

          details: responseBody,
        };
      }
    }

    // Check for network/connection errors
    if (error instanceof Error) {
      if (error.message.includes('ECONNREFUSED') || error.message.includes('timeout')) {
        return {
          code: 'CONNECTION_ERROR',
          message: 'Unable to connect to DocuSign API. Please check your network connection and API endpoint.',
        };
      }

      if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        return {
          code: 'UNAUTHORIZED',
          message: 'Authentication failed. Please check your API credentials and token.',
        };
      }

      if (error.message.includes('404') || error.message.includes('Not Found')) {
        return {
          code: 'NOT_FOUND',
          message: 'Resource not found. Please verify the envelope or recipient ID is correct.',
        };
      }
    }

    return { code: null, message: defaultMessage };
  }
}
// @ts-nocheck
