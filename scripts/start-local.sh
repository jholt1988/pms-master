#!/usr/bin/env bash
# Start PMS Master locally on Docker and rebuild images.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

ENV_FILE="ops/.env.dev"
if [[ ! -f "$ENV_FILE" ]]; then
  if [[ -f "ops/.env.prod.example" ]]; then
    echo "ops/.env.dev not found; seeding from ops/.env.prod.example"
    cp ops/.env.prod.example "$ENV_FILE"
  else
    echo "Missing $ENV_FILE and no example to seed from." >&2
    exit 1
  fi
fi

echo "Building and starting stack (rebuild images)..."
docker compose --env-file "$ENV_FILE" up -d --build postgres redis rabbitmq mil backend

echo "Running Prisma migrations..."
docker compose --env-file "$ENV_FILE" --profile tools run --rm backend-migrate

echo "Seeding demo data (user stories)..."
DATABASE_URL="postgresql://pms:pms@localhost:${POSTGRES_PORT:-5432}/pms?schema=public" npx ts-node scripts/seed-user-stories.ts || true

echo "Stack is up. Useful commands:"
echo "  docker compose --env-file $ENV_FILE logs -f backend"
echo "  docker compose --env-file $ENV_FILE ps"
