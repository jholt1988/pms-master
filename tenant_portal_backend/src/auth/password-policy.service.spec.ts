import { ConfigService } from '@nestjs/config';
import { PasswordPolicyService } from './password-policy.service';

describe('PasswordPolicyService', () => {
  const mk = (values: Record<string, string | number | undefined>) => {
    const config = { get: jest.fn((k: string) => values[k]) } as unknown as ConfigService;
    return new PasswordPolicyService(config);
  };

  it('uses defaults when env not set', () => {
    const svc = mk({});
    expect(svc.policy.minLength).toBe(8);
    expect(svc.policy.requireUppercase).toBe(true);
    expect(svc.policy.requireNumbers).toBe(true);
    expect(svc.policy.requireSpecialChars).toBe(false);
  });

  it('parses boolean and numeric env overrides', () => {
    const svc = mk({
      AUTH_PASSWORD_MIN_LENGTH: 12,
      AUTH_PASSWORD_REQUIRE_UPPERCASE: 'false',
      AUTH_PASSWORD_REQUIRE_LOWERCASE: 'true',
      AUTH_PASSWORD_REQUIRE_NUMBER: '0',
      AUTH_PASSWORD_REQUIRE_SYMBOL: 'yes',
    });
    expect(svc.policy).toMatchObject({
      minLength: 12,
      requireUppercase: false,
      requireLowercase: true,
      requireNumber: false,
      requireSymbol: true,
    });
  });

  it('validates failures by policy', () => {
    const svc = mk({});
    const failures = svc.validate('abc');
    expect(failures.join(' | ')).toContain('at least 8');
    expect(failures.join(' | ')).toContain('uppercase');
    expect(failures.join(' | ')).toContain('number');
  });
});
