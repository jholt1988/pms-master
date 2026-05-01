$ErrorActionPreference = "Stop"

$RootDir = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $RootDir

if (!(Test-Path "ops/.env.prod")) {
  Write-Error "Missing ops/.env.prod (copy ops/.env.prod.example first)."
}

Write-Host "Pulling latest main..."
git checkout main
git pull origin main

Write-Host "Pulling release images..."
docker compose --env-file ".\ops\.env.prod" -f docker-compose.yml -f docker-compose.prod.yml pull backend frontend

Write-Host "Running database migrations..."
docker compose --env-file ".\ops\.env.prod" -f docker-compose.yml -f docker-compose.prod.yml run --rm backend-migrate

Write-Host "Starting stack..."
docker compose --env-file ".\ops\.env.prod" -f docker-compose.yml -f docker-compose.prod.yml up -d --no-build

Write-Host "Deploy complete. Run smoke checklist: reports/SMOKE_CHECKLIST_POST_P2.md"
