#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ ! -f "ops/.env.prod" ]]; then
  echo "Missing ops/.env.prod (copy ops/.env.prod.example first)."
  exit 1
fi

echo "Pulling latest main..."
git checkout main
git pull origin main

echo "Pulling release images..."
docker compose --env-file ops/.env.prod -f docker-compose.yml -f docker-compose.prod.yml pull backend frontend

echo "Running database migrations..."
docker compose --env-file ops/.env.prod -f docker-compose.yml -f docker-compose.prod.yml run --rm backend-migrate

echo "Starting stack..."
docker compose --env-file ops/.env.prod -f docker-compose.yml -f docker-compose.prod.yml up -d --no-build

echo "Deploy complete. Run smoke checklist: reports/SMOKE_CHECKLIST_POST_P2.md"
