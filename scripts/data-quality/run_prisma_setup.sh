#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
BACKEND_DIR="${REPO_ROOT}/tenant_portal_backend"

cd "${BACKEND_DIR}"

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is not set. Prisma commands require a valid database connection." >&2
  exit 1
fi

echo "Running Prisma migrations (deploy)..."
./node_modules/.bin/prisma migrate deploy

echo "Generating Prisma Client..."
./node_modules/.bin/prisma generate

echo "Prisma setup complete."
