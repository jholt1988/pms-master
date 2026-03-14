# Security Preventive Controls (CI + Pre-Commit)

Date: 2026-03-15  
Purpose: Prevent plaintext secret/key commits and enforce release-blocking detection.

## Control set

## 1) Pre-commit secret scanning (developer workstation)
Recommended tool: **gitleaks** via pre-commit hook.

### Install
```bash
# macOS
brew install gitleaks

# Linux (binary)
curl -sSL https://github.com/gitleaks/gitleaks/releases/latest/download/gitleaks_$(uname -s)_x64.tar.gz | tar -xz
sudo mv gitleaks /usr/local/bin/
```

### Hook setup (repo-local)
```bash
cd /root/.openclaw/workspace/pms-master
mkdir -p .githooks
cat > .githooks/pre-commit <<'EOF'
#!/usr/bin/env bash
set -euo pipefail

# Scan staged content for secrets
gitleaks protect --staged --redact --verbose
EOF
chmod +x .githooks/pre-commit
git config core.hooksPath .githooks
```

### Local validation
```bash
gitleaks protect --staged --redact --verbose
```

---

## 2) CI secret scan (required on PR + main)
Use `gitleaks/gitleaks-action` as required status check.

Create `.github/workflows/secret-scan.yml`:

```yaml
name: secret-scan

on:
  pull_request:
  push:
    branches: [ main, master ]

jobs:
  gitleaks:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      security-events: write
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - name: Gitleaks scan
        uses: gitleaks/gitleaks-action@v2
        env:
          GITLEAKS_ENABLE_UPLOAD_ARTIFACT: 'true'
          GITLEAKS_ENABLE_COMMENTS: 'false'
```

Branch protection requirements:
- Require `secret-scan / gitleaks` status check to pass before merge.
- Prevent bypass for non-admin maintainers.

---

## 3) Baseline repo hygiene controls
Update `.gitignore` with at least:

```gitignore
# secrets / key material
*.pem
*.key
*.p12
*.pfx
.env
.env.*
!.env.example
!.env.*.example
```

Add a committed template policy:
- Only `*.example` env files in git.
- Live secrets only in secret manager / deployment platform.

---

## 4) Optional secondary scanner (defense-in-depth)
`detect-secrets` for baseline management:

```bash
pip install detect-secrets
detect-secrets scan --all-files > .secrets.baseline
detect-secrets audit .secrets.baseline
```

CI gate option:
```bash
detect-secrets-hook --baseline .secrets.baseline
```

---

## 5) Concrete closure evidence requirements
For this control rollout, require these artifacts in release folder:
1. Hook enablement proof:
   - Output of `git config core.hooksPath`
   - Sample blocked commit screenshot/log
2. CI proof:
   - Workflow file PR link
   - First successful `secret-scan` run URL
3. Governance proof:
   - Branch protection screenshot showing required check
4. Runtime proof:
   - Statement that production secrets are sourced from secret manager (include key names, not values)

---

## Recommended ownership
- DevEx/Platform: pre-commit + CI setup
- Security Lead: rule tuning, false-positive governance, waiver process
- Release Manager: enforce as go/no-go precondition

## Go/No-Go policy language (ready to paste)
> Release is blocked unless secret scanning passes in CI on the release commit, pre-commit scanning is enabled for contributor workflow, and no live secrets/private keys are present in tracked files.
