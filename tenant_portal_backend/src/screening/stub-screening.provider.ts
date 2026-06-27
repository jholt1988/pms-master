import { Injectable, Logger } from '@nestjs/common';
import {
  ScreeningProvider,
  ScreeningApplicant,
  ScreeningResult,
} from './screening-provider.interface';

/**
 * StubScreeningProvider — deterministic stub for CI, dev, and e2e testing.
 *
 * Does NOT call any external service. All results are generated from simple
 * rules based on the applicant data. This mirrors what a real provider's
 * sandbox environment would do, without the cost or network dependency.
 *
 * Real providers (TransUnion, Experian) implement ScreeningProvider and
 * are injected via the provider registry.
 */
@Injectable()
export class StubScreeningProvider implements ScreeningProvider {
  readonly id = 'stub';
  private readonly logger = new Logger(StubScreeningProvider.name);
  private results = new Map<
    string,
    { externalId: string; result: ScreeningResult }
  >();

  async submit(applicant: ScreeningApplicant): Promise<{ externalId: string }> {
    const externalId = `stub-sr-${applicant.applicationId}-${Date.now()}`;

    // Simulate an async delay (real providers take seconds to minutes)
    this.logger.debug(`[stub] screening requested for app #${applicant.applicationId}`);

    const result: ScreeningResult = this.generateResult(applicant, externalId);
    this.results.set(externalId, { externalId, result });

    return { externalId };
  }

  async getResult(externalId: string): Promise<ScreeningResult | null> {
    const entry = this.results.get(externalId);
    if (!entry) return null;

    // Stub is always complete immediately (real providers may need polling)
    return entry.result;
  }

  async healthCheck(): Promise<boolean> {
    // Stub is always healthy
    return true;
  }

  private generateResult(
    applicant: ScreeningApplicant,
    externalId: string,
  ): ScreeningResult {
    // Deterministic rule: applications with SSN last 4 "0000" simulate failure
    const isFailure = applicant.ssnLast4 === '0000';

    if (isFailure) {
      return {
        provider: this.id,
        externalId,
        status: 'FAILED',
        errorMessage: 'Unable to verify identity — SSN mismatch (stub)',
        completedAt: new Date(),
      };
    }

    return {
      provider: this.id,
      externalId,
      status: 'COMPLETE',
      creditScore: 680 + Math.floor(Math.abs(this.hashCode(applicant.email)) % 170),
      incomeVerified: true,
      identityVerified: true,
      backgroundClear: true,
      evictionHistory: false,
      criminalHistory: false,
      recommendation: 'RECOMMEND',
      riskFlags: [],
      completedAt: new Date(),
    };
  }

  private hashCode(s: string): number {
    let hash = 0;
    for (let i = 0; i < s.length; i++) {
      const chr = s.charCodeAt(i);
      hash = (hash << 5) - hash + chr;
      hash |= 0; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }
}
