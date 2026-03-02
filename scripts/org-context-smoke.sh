#!/usr/bin/env bash
set -euo pipefail

# OrgContextGuard smoke checks
# Usage:
#   API_BASE="http://localhost:3000/api" \
#   PM_TOKEN="..." \
#   TENANT_TOKEN="..." \
#   ./scripts/org-context-smoke.sh
#
# Notes:
# - PM_TOKEN should belong to a non-tenant user that is a member of exactly one org.
# - TENANT_TOKEN should belong to a tenant user (OrgContextGuard should allow through).

API_BASE="${API_BASE:-http://localhost:3000/api}"
PM_TOKEN="${PM_TOKEN:-}"
TENANT_TOKEN="${TENANT_TOKEN:-}"

if [[ -z "$PM_TOKEN" ]]; then
  echo "PM_TOKEN is required" >&2
  exit 1
fi

pm_get() {
  local path="$1"
  echo "[PM] GET $path"
  curl -sS -o /dev/null -w "  -> %{http_code}\n" \
    -H "Authorization: Bearer $PM_TOKEN" \
    "$API_BASE/$path"
}

tenant_get() {
  local path="$1"
  if [[ -z "$TENANT_TOKEN" ]]; then
    echo "[TENANT] GET $path (skipped: TENANT_TOKEN not set)"
    return
  fi
  echo "[TENANT] GET $path"
  curl -sS -o /dev/null -w "  -> %{http_code}\n" \
    -H "Authorization: Bearer $TENANT_TOKEN" \
    "$API_BASE/$path"
}

# Core org-guarded endpoints (PM)
pm_get "maintenance"
pm_get "properties"
pm_get "leases"
pm_get "payments"
pm_get "billing/plans"
pm_get "reporting/summary"
pm_get "rent-optimization"
pm_get "security-events"
pm_get "schedule"
pm_get "documents"
pm_get "notifications"
pm_get "messaging/conversations"

# Tenant checks (expected to pass where tenant access is valid)
tenant_get "maintenance"
tenant_get "inspections"
tenant_get "dashboard/tenant"

echo "Done. Review HTTP status codes for 200/403/401 as expected."