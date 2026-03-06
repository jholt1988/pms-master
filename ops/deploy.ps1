$ErrorActionPreference = "Stop"

$RootDir = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $RootDir

if (!(Test-Path "ops/.env.prod")) {
  Write-Error "Missing ops/.env.prod (copy ops/.env.prod.example first)."
}

Write-Host "Pulling latest main..."
git checkout main
git pull origin main

Write-Host "Building and starting stack..."
docker compose --env-file ops/.env.prod -f docker-compose.yml -f docker-compose.prod.yml up -d --build

Write-Host "Deploy complete. Run smoke checklist: reports/SMOKE_CHECKLIST_POST_P2.md"
