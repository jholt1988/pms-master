const target = process.env.OPERATOR_APP_URL ?? 'http://127.0.0.1:3000';

const requiredHeaders = {
  'content-security-policy': [
    "default-src 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
  ],
  'x-frame-options': ['DENY'],
  'x-content-type-options': ['nosniff'],
  'referrer-policy': ['strict-origin-when-cross-origin'],
  'permissions-policy': ['camera=()', 'microphone=()', 'geolocation=()'],
};

const response = await fetch(target, { method: 'HEAD' });

if (!response.ok) {
  throw new Error(`Expected ${target} to return 2xx, received ${response.status}`);
}

const failures = [];

for (const [header, expectedValues] of Object.entries(requiredHeaders)) {
  const actual = response.headers.get(header);
  if (!actual) {
    failures.push(`${header}: missing`);
    continue;
  }

  for (const expected of expectedValues) {
    if (!actual.includes(expected)) {
      failures.push(`${header}: missing ${expected}`);
    }
  }
}

if (failures.length > 0) {
  throw new Error(`Security header check failed:\n${failures.join('\n')}`);
}

console.log(`Security headers OK for ${target}`);
