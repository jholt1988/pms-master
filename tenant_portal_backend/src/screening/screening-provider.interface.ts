/**
 * ScreeningProvider — abstraction for tenant screening integrations.
 *
 * Phase 1A delivers a `stub` provider for CI/dev. Real providers
 * (TransUnion ShareAble, Experian Connect, etc.) implement this
 * interface and are registered via provider config.
 */

export interface ScreeningApplicant {
  applicationId: number;
  fullName: string;
  email: string;
  phoneNumber?: string;
  ssnLast4?: string;
  dateOfBirth?: string;
  currentAddress?: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
}

export interface ScreeningResult {
  provider: string;
  externalId: string;
  status: 'COMPLETE' | 'FAILED';
  creditScore?: number;
  incomeVerified?: boolean;
  identityVerified?: boolean;
  backgroundClear?: boolean;
  evictionHistory?: boolean;
  criminalHistory?: boolean;
  recommendation?: 'RECOMMEND' | 'REVIEW' | 'DECLINE';
  riskFlags?: Array<{ code: string; severity: 'LOW' | 'MEDIUM' | 'HIGH'; description: string }>;
  rawReport?: Record<string, unknown>;
  errorMessage?: string;
  completedAt: Date;
}

export interface ScreeningProvider {
  /** Unique provider identifier (e.g. "transunion", "experian", "stub") */
  readonly id: string;

  /**
   * Submit a screening request to the provider.
   * Returns an external reference ID that can be used for polling/webhooks.
   */
  submit(applicant: ScreeningApplicant): Promise<{ externalId: string }>;

  /**
   * Poll for completed results. Returns null if still processing.
   * Real providers may use webhooks instead — this is the synchronous fallback.
   */
  getResult(externalId: string): Promise<ScreeningResult | null>;

  /**
   * Health check — verify the provider is reachable.
   * Used by CI smoke tests and operational monitoring.
   */
  healthCheck(): Promise<boolean>;
}
