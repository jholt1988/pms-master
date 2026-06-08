const REDACTED = '[REDACTED]';

const SENSITIVE_KEY_PATTERNS = [
  /password/i,
  /passcode/i,
  /token/i,
  /secret/i,
  /authorization/i,
  /cookie/i,
  /ssn/i,
  /socialSecurity/i,
  /taxId/i,
  /ein/i,
  /routingNumber/i,
  /accountNumber/i,
  /cardNumber/i,
  /clientSecret/i,
  /client_secret/i,
  /idempotencyKey/i,
  /email/i,
  /phone/i,
];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SSN_PATTERN = /^\d{3}-?\d{2}-?\d{4}$/;
const PHONE_PATTERN = /^\+?1?[\s.-]?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}$/;
const BEARER_PATTERN = /^Bearer\s+\S+/i;

export function redactPii<T>(value: T): T {
  return redactValue(value, new WeakSet()) as T;
}

function redactValue(value: unknown, seen: WeakSet<object>): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === 'string') {
    return redactString(value);
  }

  if (typeof value !== 'object') {
    return value;
  }

  if (value instanceof Date) {
    return value;
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: redactString(value.message),
    };
  }

  if (seen.has(value)) {
    return '[Circular]';
  }
  seen.add(value);

  if (Array.isArray(value)) {
    return value.map((item) => redactValue(item, seen));
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, child]) => [
      key,
      isSensitiveKey(key) ? REDACTED : redactValue(child, seen),
    ]),
  );
}

function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key));
}

function redactString(value: string): string {
  const trimmed = value.trim();
  if (
    EMAIL_PATTERN.test(trimmed) ||
    SSN_PATTERN.test(trimmed) ||
    PHONE_PATTERN.test(trimmed) ||
    BEARER_PATTERN.test(trimmed)
  ) {
    return REDACTED;
  }

  return value;
}
