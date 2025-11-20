import { SyndicationChannel } from '@prisma/client';

export interface ListingSyndicationAdapter {
  readonly channel: SyndicationChannel;
  buildPayload(snapshot: PropertyMarketingSnapshot): Record<string, unknown>;
  send(payload: Record<string, unknown>, credentials: ChannelCredential): Promise<SyndicationResult>;
  validate(payload: Record<string, unknown>): void;
}

export interface PropertyMarketingSnapshot {
  property: { id: number; name: string; address: string };
  marketingProfile?: {
    minRent?: number | null;
    maxRent?: number | null;
    availabilityStatus?: string | null;
    availableOn?: string | Date | null;
    marketingHeadline?: string | null;
    marketingDescription?: string | null;
  } | null;
  photos: { url: string; caption?: string | null; isPrimary?: boolean | null }[];
  amenities: { key: string; label: string; isFeatured?: boolean | null }[];
  unitCount: number;
}

export interface ChannelCredential {
  apiKey?: string | null;
  clientId?: string | null;
  clientSecret?: string | null;
  username?: string | null;
  password?: string | null;
  ftpHost?: string | null;
  ftpUsername?: string | null;
  ftpPassword?: string | null;
  endpoint?: string | null;
  active?: boolean | null;
}

export interface SyndicationResult {
  success: boolean;
  message?: string;
  externalId?: string;
  rawResponse?: unknown;
}
