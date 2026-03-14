# Security Secret Exposure Inventory (P0)

Date: 2026-03-15  
Scope: `pms-master` repository working tree (excluding `.git` internals); focused on private keys and high-risk secrets committed as plaintext.

## Executive finding
**Confirmed critical exposure exists in tracked files.**
At minimum, one active private key is committed in plaintext, and multiple tracked env files contain secret-bearing variables with values set.

## Confirmed exposures (actionable)

| Severity | File path | Evidence | Why this is sensitive | Required owner action |
|---|---|---|---|---|
| P0 | `docusign_private_key.pem` | Line 1 starts with `-----BEGIN PRIVATE KEY-----` | Private signing/auth key material; compromise enables impersonation/JWT abuse depending on integration setup | Security + Integration owner: revoke/rotate DocuSign keypair immediately; remove file from repo state; validate replacement secret delivery channel |
| P1 | `ops/.env.prod` | Contains `JWT_SECRET` and `STRIPE_WEBHOOK_SECRET` keys with values set | Production auth/session and webhook verification secrets in tracked file | Platform/Ops owner: rotate secrets, migrate to secret manager, replace tracked values with placeholders |
| P1 | `ops/.env.dev` | Contains `JWT_SECRET` key with value set | Environment secret committed in repo; can be reused across envs by mistake | Platform owner: rotate if shared/reused; replace with non-secret placeholder |
| P1 | `ops/.env.supabase` | Contains `JWT_SECRET` key with value set | JWT signing secret in tracked file | Platform owner: rotate and move to managed secret store |
| P1 | `tenant_portal_backend/.env.inspection` | Contains `OPENAI_API_KEY` key with value set | Third-party API credential in tracked file | Backend owner: revoke/regenerate API key and remove tracked secret |

## Notes on evidence handling
- Secret **values are intentionally redacted** in this report.
- Evidence references are based on local file inspection and should be re-validated in CI with secret scanning outputs attached.
- Additional key/cert-like text exists under `node_modules/` and docs/examples; those are generally vendor/test artifacts and **not treated as production secret exposure** unless proven live.

## Quick verification commands (non-destructive)
Run from repo root:

```bash
# 1) Confirm PEM private key exposure
grep -n "BEGIN PRIVATE KEY" docusign_private_key.pem

# 2) List tracked env files with potential secret keys (redacted output)
python3 - <<'PY'
from pathlib import Path
import subprocess
keys = ["SECRET", "TOKEN", "PASSWORD", "API_KEY", "PRIVATE_KEY"]
tracked = subprocess.check_output(["git", "ls-files"], text=True).splitlines()
for rel in tracked:
    if "/.env" in rel or rel.endswith(".env") or rel.endswith(".env.prod") or rel.endswith(".env.dev") or rel.endswith(".env.supabase"):
        p = Path(rel)
        if not p.exists():
            continue
        for i, line in enumerate(p.read_text(errors="ignore").splitlines(), 1):
            if "=" not in line or line.strip().startswith("#"):
                continue
            k = line.split("=", 1)[0].strip().upper()
            if any(token in k for token in keys):
                print(f"{rel}:{i}:{k}=<redacted>")
PY
```

## Incident classification recommendation
- **Classification:** Security incident / credential exposure in source control
- **Initial severity:** **High/Critical** (because private key material is present in repo)
- **Release impact:** Maintains current **NO-GO** until closure evidence is complete.
