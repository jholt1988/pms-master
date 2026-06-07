import { execFileSync } from 'child_process';
import { resolve } from 'path';

describe('OpenAPI contract hardening', () => {
  it('enforces migrated envelope, route, security, and ownership invariants', () => {
    const script = resolve(__dirname, '..', '..', 'scripts', 'check-openapi-contract-hardening.js');
    expect(() => execFileSync(process.execPath, [script], { stdio: 'pipe' })).not.toThrow();
  });
});
