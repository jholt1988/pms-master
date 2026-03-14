# Ops P0 — Production Config Verification (Stripe + Core Runtime)
Date: 2026-03-15
Owner: App Lead (primary), SRE On-call (secondary)
Status: Draft for launch execution

## Purpose
Executable pre-GO checklist to verify production configuration, with evidence capture format suitable for release sign-off.

## Scope
- Production secret presence and non-placeholder validation
- Stripe live configuration correctness
- Webhook endpoint/signature readiness
- Production runtime sanity (health + CORS/API URL alignment)

---

## A. Verification Checklist (Run in order)

### A1) Secret Inventory Presence Check
**Owner:** App Lead  
**Type:** Non-destructive  

**Command (local repo key-name audit only):**
```bash
python3 - <<'PY'
from pathlib import Path
req=[]
for l in Path('ops/.env.prod.example').read_text().splitlines():
    l=l.strip()
    if not l or l.startswith('#') or '=' not in l: continue
    req.append(l.split('=',1)[0])
prod_keys=set()
for l in Path('ops/.env.prod').read_text().splitlines():
    l=l.strip()
    if not l or l.startswith('#') or '=' not in l: continue
    prod_keys.add(l.split('=',1)[0])
missing=[k for k in req if k not in prod_keys]
print('MISSING:', ','.join(missing) if missing else 'NONE')
PY
```

**Pass criteria:** `MISSING: NONE`  
**Current known gap:** `STRIPE_SECRET_KEY` was previously missing (P0 blocker).

---

### A2) Placeholder/Invalid Value Check (No secret leak)
**Owner:** App Lead  
**Type:** Non-destructive  

**Command:**
```bash
python3 - <<'PY'
from pathlib import Path
bad_tokens=('example.com','replace-with','changeme','xxx','TODO','<')
findings=[]
for i,l in enumerate(Path('ops/.env.prod').read_text().splitlines(),1):
    s=l.strip()
    if not s or s.startswith('#') or '=' not in s: continue
    k,v=s.split('=',1)
    low=v.lower()
    if any(t.lower() in low for t in bad_tokens):
        findings.append((i,k))
print('PLACEHOLDER_KEYS:', findings if findings else 'NONE')
PY
```

**Pass criteria:** `PLACEHOLDER_KEYS: NONE` for launch-critical keys.

---

### A3) Stripe Live Key Format + Account Match
**Owner:** App Lead  
**Type:** Manual verification (provider/API)

**Needs Manual Verification** (runtime/provider access not available in repo).

**Exact command:**
```bash
stripe whoami
```
Then validate key type and permissions in Stripe Dashboard (Live mode).

**Pass criteria:**
- Live secret key configured (starts with `sk_live_`)
- Key belongs to intended production Stripe account
- Required permissions enabled for payment intents/webhooks

---

### A4) Stripe Webhook Signature + Endpoint Verification
**Owner:** App Lead + SRE  
**Type:** Manual verification

**Needs Manual Verification**.

**Exact commands:**
```bash
# 1) Confirm prod webhook endpoint is reachable
curl -i https://<PROD_API_HOST>/api/payments/webhook

# 2) Trigger Stripe test event to production endpoint (run from Stripe CLI/authenticated env)
stripe trigger payment_intent.succeeded
```

**Pass criteria:**
- Endpoint responds (expected 2xx/4xx by route behavior, not network failure)
- Stripe Dashboard shows successful delivery (2xx) for recent event
- Backend logs confirm signature verification success (`STRIPE_WEBHOOK_SECRET` valid)

---

### A5) Production Health Endpoints
**Owner:** SRE On-call  
**Type:** Non-destructive

**Command:**
```bash
curl -fsS https://<PROD_API_HOST>/health && echo
curl -fsS https://<PROD_API_HOST>/health/readiness && echo
curl -fsS https://<PROD_API_HOST>/health/liveness && echo
```

**Pass criteria:** All endpoints return success and expected payload.

---

### A6) Frontend/API/CORS Alignment
**Owner:** SRE + App Lead  
**Type:** Manual verification

**Needs Manual Verification** (live domain required).

**Exact commands:**
```bash
# Verify frontend references intended API origin
curl -s https://<PROD_APP_HOST> | head -n 60

# Verify CORS allowlist includes app host in runtime env source
grep -n '^ALLOWED_ORIGINS=' ops/.env.prod
```

**Pass criteria:**
- App host and API host align with launch domains
- `ALLOWED_ORIGINS` includes exact production frontend origin(s)

---

## B. Evidence Capture Template (copy for each check)

```markdown
### Check ID: A<n>
- Owner:
- Date/Time (TZ):
- Command(s) executed:
- Output summary (no secrets):
- Artifact link/screenshot/log:
- Result: PASS / FAIL / NEEDS MANUAL VERIFICATION
- Notes / follow-up:
```

---

## C. Sign-off Block
- App Lead: ____________________  Date/Time: __________
- SRE On-call: _________________  Date/Time: __________
- Release Manager: _____________  Date/Time: __________

## D. Launch Gate Decision (Config)
- [ ] PASS — all A1–A6 passed and evidence attached
- [ ] FAIL — at least one P0 item unresolved
- [ ] CONDITIONAL — only non-P0 manual evidence pending
