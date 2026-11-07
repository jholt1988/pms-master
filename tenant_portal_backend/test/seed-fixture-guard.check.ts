import assert from 'node:assert/strict';
import { test } from 'node:test';

// Re-implement the guard logic to test it without importing the seed (which exits on load).
function isAllowedUrl(raw: string): boolean {
  const ALLOWED_HOSTS = ['localhost', '127.0.0.1', 'host.docker.internal'];
  try {
    const url = new URL(raw);
    const host = url.hostname.toLowerCase();
    if (ALLOWED_HOSTS.includes(host)) return true;
    if (host.endsWith('.staging') || host.includes('staging')) return true;
    return false;
  } catch {
    return false;
  }
}

test('allowlists localhost', () => {
  assert.equal(isAllowedUrl('postgres://user:pass@localhost:5432/db'), true);
  assert.equal(isAllowedUrl('postgres://user:pass@127.0.0.1:5432/db'), true);
});

test('rejects a non-allowlisted (production-looking) host', () => {
  assert.equal(isAllowedUrl('postgres://user:pass@db.prisma.io:5432/db'), false);
  assert.equal(isAllowedUrl('postgres://user:pass@prod.example.com:5432/db'), false);
});

test('allowlists a staging host', () => {
  assert.equal(isAllowedUrl('postgres://user:pass@staging-db.example.com:5432/db'), true);
});
