import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { GLOBAL_PREFIX_EXCLUDE } from '../src/config/global-prefix';

/**
 * Deliberately-excluded `api/...` dual-mounts: controllers that intentionally
 * serve an `api/<resource>` path which is listed in GLOBAL_PREFIX_EXCLUDE (so
 * the global prefix is NOT applied and it does NOT become /api/api/...).
 * These are backward-compat mounts for external integrations, not bugs.
 */
const ALLOWED_API_MOUNTS = new Set(
  GLOBAL_PREFIX_EXCLUDE.filter((e): e is string => typeof e === 'string')
    .map((e) => e.replace(/^\/+/, '').toLowerCase())
    // keep only the concrete `api/<x>` entries (drop wildcards + non-api rules)
    .filter((e) => e.startsWith('api/') && !e.includes('(')),
);

/**
 * Regression guard for the "double-prefix" bug (ADR-001, Problem A).
 *
 * The app applies a single global prefix `api` at bootstrap
 * (`app.setGlobalPrefix('api')`). Any controller that *also* declares an
 * `api/...` path in its `@Controller()` decorator resolves to `/api/api/...`,
 * silently breaking the frontend contract.
 *
 * This test statically scans every `*.controller.ts` under `src/` and asserts
 * that no `@Controller()` path segment begins with `api`. It is DB-free and does
 * not boot the Nest application, so it runs anywhere.
 */

const SRC_DIR = join(__dirname, '..', 'src');

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const s = statSync(full);
    if (s.isDirectory()) {
      if (entry === 'node_modules' || entry === 'dist') continue;
      out.push(...walk(full));
    } else if (entry.endsWith('.controller.ts') && !entry.endsWith('.spec.ts')) {
      out.push(full);
    }
  }
  return out;
}

/**
 * Extract every path string declared in `@Controller(...)` in a source file.
 * Handles both the single-string form `@Controller('foo')` and the array form
 * `@Controller(['foo', 'api/foo'])` — the latter is how the double-prefix bug
 * hid inside the tours/leasing/esignature controllers.
 */
function extractControllerPaths(source: string): string[] {
  const paths: string[] = [];
  const controllerRe = /@Controller\(\s*([^)]*)\)/g;
  const stringRe = /(['"`])([^'"`]*)\1/g;
  let c: RegExpExecArray | null;
  while ((c = controllerRe.exec(source)) !== null) {
    const args = c[1];
    let s: RegExpExecArray | null;
    while ((s = stringRe.exec(args)) !== null) {
      paths.push(s[2]);
    }
    stringRe.lastIndex = 0;
  }
  return paths;
}

describe('API prefix hygiene (ADR-001 Problem A)', () => {
  const controllerFiles = walk(SRC_DIR);

  it('finds controller files to scan', () => {
    expect(controllerFiles.length).toBeGreaterThan(0);
  });

  it('no @Controller() declares an "api" path segment (would double-prefix to /api/api)', () => {
    const offenders: Array<{ file: string; path: string }> = [];

    for (const file of controllerFiles) {
      const source = readFileSync(file, 'utf8');
      for (const path of extractControllerPaths(source)) {
        const normalized = path.replace(/^\/+/, '').toLowerCase();
        if (normalized === 'api' || normalized.startsWith('api/')) {
          if (ALLOWED_API_MOUNTS.has(normalized)) continue; // deliberate excluded dual-mount
          offenders.push({ file: file.replace(SRC_DIR, 'src'), path });
        }
      }
    }

    if (offenders.length > 0) {
      const detail = offenders
        .map((o) => `  ${o.file}: @Controller('${o.path}')`)
        .join('\n');
      throw new Error(
        `Controllers must not self-declare the global 'api' prefix ` +
          `(it double-prefixes to /api/api). Offenders:\n${detail}`,
      );
    }

    expect(offenders).toEqual([]);
  });
});
