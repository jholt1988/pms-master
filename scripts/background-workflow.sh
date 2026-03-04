#!/usr/bin/env bash
set -u

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPORT_DIR="$ROOT_DIR/reports/background"
TS="$(date -u +"%Y-%m-%dT%H-%M-%SZ")"
REPORT_FILE="$REPORT_DIR/$TS.md"
LATEST_FILE="$REPORT_DIR/latest.md"

mkdir -p "$REPORT_DIR"

QUICK=0
if [[ "${1:-}" == "--quick" ]]; then
  QUICK=1
fi

PASS=0
WARN=0
FAIL=0

log(){
  printf '%s\n' "$1" | tee -a "$REPORT_FILE" >/dev/null
}

run_step(){
  local name="$1"
  shift
  log "## $name"
  if "$@" >>"$REPORT_FILE" 2>&1; then
    log "- Result: PASS"
    PASS=$((PASS+1))
  else
    log "- Result: FAIL"
    FAIL=$((FAIL+1))
  fi
  log ""
}

warn_step(){
  local name="$1"
  shift
  log "## $name"
  if "$@" >>"$REPORT_FILE" 2>&1; then
    log "- Result: PASS"
    PASS=$((PASS+1))
  else
    log "- Result: WARN"
    WARN=$((WARN+1))
  fi
  log ""
}

log "# PMS Master Background Workflow Report"
log "- Timestamp (UTC): ${TS}"
log "- Mode: $([[ $QUICK -eq 1 ]] && echo quick || echo default)"
log ""

run_step "Repo status snapshot" bash -lc "cd '$ROOT_DIR' && git status --short && git branch --show-current"
run_step "Install integrity" bash -lc "cd '$ROOT_DIR' && corepack pnpm install --frozen-lockfile"

if [[ $QUICK -eq 0 ]]; then
  warn_step "Frontend production build" bash -lc "cd '$ROOT_DIR' && corepack pnpm --filter tenant_portal_app build"
fi

run_step "Prisma client generation" bash -lc "cd '$ROOT_DIR' && corepack pnpm --filter tenant_portal_backend exec prisma generate"

log "## Backend startup + health smoke"
BACKEND_LOG="$REPORT_DIR/backend-$TS.log"
(
  cd "$ROOT_DIR" && corepack pnpm --filter tenant_portal_backend start:check
) >"$BACKEND_LOG" 2>&1 &
BACKEND_PID=$!
sleep 8

if curl -fsS http://127.0.0.1:3001/api/health >>"$REPORT_FILE" 2>&1 && \
   curl -fsS http://127.0.0.1:3001/api/health/readiness >>"$REPORT_FILE" 2>&1; then
  log "- Result: PASS"
  PASS=$((PASS+1))
else
  log "- Result: WARN (backend not healthy in smoke window)"
  WARN=$((WARN+1))
fi

kill "$BACKEND_PID" >/dev/null 2>&1 || true
wait "$BACKEND_PID" >/dev/null 2>&1 || true
log "- Backend log: $BACKEND_LOG"
log ""

log "## Summary"
log "- PASS: $PASS"
log "- WARN: $WARN"
log "- FAIL: $FAIL"

cp "$REPORT_FILE" "$LATEST_FILE"
echo "Report written: $REPORT_FILE"
