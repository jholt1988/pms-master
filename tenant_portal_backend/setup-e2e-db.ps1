# E2E Test Database Setup Script
# Run this from PowerShell in the tenant_portal_backend directory

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "E2E Test Database Setup" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$DB_USER = "postgres"
$DB_PASSWORD = "jordan"
$DB_HOST = "localhost"
$DB_PORT = "5432"
$DB_NAME = "tenant_portal_test"
$DATABASE_URL = "postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?schema=public_"

# Set PGPASSWORD environment variable for PostgreSQL commands
$env:PGPASSWORD = $DB_PASSWORD

Write-Host "Step 1: Checking PostgreSQL connection..." -ForegroundColor Yellow
try {
    $result = & psql -U $DB_USER -h $DB_HOST -p $DB_PORT -c "SELECT version();" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ PostgreSQL is accessible" -ForegroundColor Green
    } else {
        Write-Host "✗ Cannot connect to PostgreSQL" -ForegroundColor Red
        Write-Host "  Error: $result" -ForegroundColor Red
        Write-Host "  Please ensure PostgreSQL is running and credentials are correct" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "✗ PostgreSQL psql command not found" -ForegroundColor Red
    Write-Host "  Please ensure PostgreSQL is installed and in your PATH" -ForegroundColor Red
    Write-Host "  Error: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Step 2: Creating test database..." -ForegroundColor Yellow
$dbExists =& psql -U $DB_USER -h $DB_HOST -p $DB_PORT -lqt 2>$null | Select-String -Pattern $DB_NAME
if ($dbExists) {
    Write-Host "! Database '$DB_NAME' already exists" -ForegroundColor Yellow
    $response = Read-Host "Do you want to drop and recreate it? (y/N)"
    if ($response -eq 'y' -or $response -eq 'Y') {
        Write-Host "  Dropping existing database..." -ForegroundColor Yellow
        $dropResult = & psql -U $DB_USER -h $DB_HOST -p $DB_PORT -c "DROP DATABASE IF EXISTS $DB_NAME;" 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Host "  Warning: Error dropping database: $dropResult" -ForegroundColor Yellow
        }
        Write-Host "  Creating fresh database..." -ForegroundColor Yellow
        $createResult = & createdb -U $DB_USER -h $DB_HOST -p $DB_PORT $DB_NAME 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ Database recreated" -ForegroundColor Green
        } else {
            Write-Host "✗ Failed to create database: $createResult" -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "  Using existing database" -ForegroundColor Yellow
    }
} else {
    $createResult = & createdb -U $DB_USER -h $DB_HOST -p $DB_PORT $DB_NAME 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Database '$DB_NAME' created" -ForegroundColor Green
    } else {
        Write-Host "✗ Failed to create database: $createResult" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "Step 3: Running Prisma migrations..." -ForegroundColor Yellow
$env:DATABASE_URL = $DATABASE_URL
$migrationResult = & npx prisma migrate deploy 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Migrations applied successfully" -ForegroundColor Green
} else {
    Write-Host "✗ Failed to apply migrations" -ForegroundColor Red
    Write-Host "  Error output: $migrationResult" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Step 4: Verifying database schema..." -ForegroundColor Yellow
$tableCount = & psql -U $DB_USER -h $DB_HOST -p $DB_PORT -d $DB_NAME -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public_' OR table_schema='public';" 2>$null
$tableCount = $tableCount.Trim()
if ($tableCount -match '^\d+$' -and [int]$tableCount -gt 20) {
    Write-Host "✓ Database schema looks good ($tableCount tables found)" -ForegroundColor Green
} else {
    Write-Host "! Warning: Only $tableCount tables found (expected 30+)" -ForegroundColor Yellow
    Write-Host "  This might indicate migration issues" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "==================================" -ForegroundColor Cyan
Write-Host "Setup Complete!" -ForegroundColor Green
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Database URL:" -ForegroundColor Cyan
Write-Host $DATABASE_URL -ForegroundColor White
Write-Host ""
Write-Host "Run E2E tests with:" -ForegroundColor Cyan
Write-Host "  npm run test:e2e" -ForegroundColor White
Write-Host ""
Write-Host "Or run all tests:" -ForegroundColor Cyan
Write-Host "  npm test               # Unit tests only (141 tests)" -ForegroundColor White
Write-Host "  npm run test:e2e       # E2E tests only (59 tests)" -ForegroundColor White
Write-Host ""
