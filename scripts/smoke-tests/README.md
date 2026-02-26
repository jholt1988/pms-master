Smoke tests for Property Management backend

Files:
- `run-smoke-tests.js` - Node script that calls a small set of endpoints and verifies expected status codes.
- `run-smoke-tests.ps1` - PowerShell wrapper that sets environment variables and installs `axios` locally if needed.

Usage (cross-platform):

- Run directly with node (requires axios installed):

```powershell
# From repo root
node scripts\smoke-tests\run-smoke-tests.js
```

- Provide a JWT for authenticated tests via AUTH_TOKEN env var (or TOKEN):

```powershell
$env:AUTH_TOKEN = 'ey...'
node scripts\smoke-tests\run-smoke-tests.js
```

- Use the PowerShell wrapper (Windows):

```powershell
# From repo root
.\scripts\smoke-tests\run-smoke-tests.ps1 -BaseUrl 'http://localhost:3001' -ApiPrefix '/api'
```

Environment variables:
- BASE_URL (default: http://localhost:3001)
- API_PREFIX (default: /api)
- AUTH_TOKEN or TOKEN (optional) - JWT to use for protected endpoints
- TIMEOUT_MS (optional) - request timeout in ms

Exit codes:
- 0: all tests passed
- non-zero: one or more tests failed
