$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Resolve-Path (Join-Path $ScriptDir "..\..")
$BackendDir = Join-Path $RepoRoot "tenant_portal_backend"

if (-not $env:DATABASE_URL) {
  Write-Error "DATABASE_URL is not set. Prisma commands require a valid database connection."
  exit 1
}

Set-Location $BackendDir

Write-Host "Running Prisma migrations (deploy)..."
./node_modules/.bin/prisma migrate deploy

Write-Host "Generating Prisma Client..."
./node_modules/.bin/prisma generate

Write-Host "Prisma setup complete."
