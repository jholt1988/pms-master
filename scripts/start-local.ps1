# Start PMS Master locally on Docker and rebuild images.
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

$EnvFile = "ops/.env.dev"
if (-not (Test-Path $EnvFile)) {
    if (Test-Path "ops/.env.prod.example") {
        Write-Host "ops/.env.dev not found; seeding from ops/.env.prod.example"
        Copy-Item "ops/.env.prod.example" $EnvFile
    } else {
        throw "Missing $EnvFile and no example to seed from."
    }
}

Write-Host "Building and starting stack (rebuild images)..."
docker compose --env-file $EnvFile up -d --build postgres redis rabbitmq mil backend

Write-Host "Running Prisma migrations..."
docker compose --env-file $EnvFile --profile tools run --rm backend-migrate

Write-Host "Seeding demo data (user stories)..."
$env:DATABASE_URL = "postgresql://pms:pms@localhost:5432/pms?schema=public"
npx ts-node scripts/seed-user-stories.ts

Write-Host "Stack is up."
Write-Host "  docker compose --env-file $EnvFile logs -f backend"
Write-Host "  docker compose --env-file $EnvFile ps"
