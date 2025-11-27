import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumber: boolean;
  requireNumbers: boolean;
  requireSymbol: boolean;
  requireSpecialChars: boolean;
}

@Injectable()
export class PasswordPolicyService {
  constructor(private readonly configService: ConfigService) {}

  get policy(): PasswordPolicy {
    const basePolicy = {
      minLength: Number(this.configService.get<number>('AUTH_PASSWORD_MIN_LENGTH') ?? 8),
      requireUppercase: this.getBoolean('AUTH_PASSWORD_REQUIRE_UPPERCASE', true),
      requireLowercase: this.getBoolean('AUTH_PASSWORD_REQUIRE_LOWERCASE', true),
      requireNumber: this.getBoolean('AUTH_PASSWORD_REQUIRE_NUMBER', true),
      requireSymbol: this.getBoolean('AUTH_PASSWORD_REQUIRE_SYMBOL', false),
    };

    return {
      ...basePolicy,
      requireNumbers: basePolicy.requireNumber,
      requireSpecialChars: basePolicy.requireSymbol,
    };
  }

  validate(password: string): string[] {
    const failures: string[] = [];
    const policy = this.policy;

    if (password.length < policy.minLength) {
      failures.push(`Password must be at least ${policy.minLength} characters long.`);
    }
    if (policy.requireUppercase && !/[A-Z]/.test(password)) {
      failures.push('Password must contain at least one uppercase letter.');
    }
    if (policy.requireLowercase && !/[a-z]/.test(password)) {
      failures.push('Password must contain at least one lowercase letter.');
    }
    if (policy.requireNumber && !/[0-9]/.test(password)) {
      failures.push('Password must contain at least one number.');
    }
    if (policy.requireSymbol && !/[^A-Za-z0-9]/.test(password)) {
      failures.push('Password must contain at least one symbol.');
    }

    return failures;
  }

  private getBoolean(key: string, defaultValue: boolean): boolean {
    const value = this.configService.get<string>(key);
    if (value === undefined || value === null) {
      return defaultValue;
    }
    return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
  }
}
