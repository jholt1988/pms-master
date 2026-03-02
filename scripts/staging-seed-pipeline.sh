#!/usr/bin/env bash
set -euo pipefail

# PMS-F-01 staging/demo pipeline helper
# Usage:
#   BASE_URL=https://staging.example.com API_PREFIX=/api AUTH_TOKEN=... ./scripts/staging-seed-pipeline.sh

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/tenant_portal_backend"

echo "[1/5] Installing backend deps"
cd "$BACKEND_DIR"
npm ci

echo "[2/5] Applying migrations"
npx prisma migrate deploy

echo "[3/5] Seeding deterministic demo org/data"
npx ts-node scripts/dev-seed-inspection-demo.ts

echo "[4/5] Verifying seed coverage"
node scripts/check-seed-coverage.ts || true

echo "[5/5] Running smoke checks"
cd "$ROOT_DIR/scripts/smoke-tests"
npm ci
cd "$ROOT_DIR"
node scripts/smoke-tests/run-smoke-tests.js

echo "✅ Staging seed pipeline completed"
