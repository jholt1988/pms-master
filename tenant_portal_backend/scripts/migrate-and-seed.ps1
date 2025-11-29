# ============================================
# Database Migration and Seeding Script (PowerShell)
# ============================================
# This script runs migrations and seeds the database with real-world data
#
# Usage:
#   .\scripts\migrate-and-seed.ps1
#

$ErrorActionPreference = "Stop"

Write-Host "[START] Starting Database Migration and Seeding Process..." -ForegroundColor Cyan
Write-Host ""

# Check if we're in the correct directory
if (-not (Test-Path "prisma\schema.prisma")) {
    Write-Host "[ERROR] Error: prisma\schema.prisma not found" -ForegroundColor Red
    Write-Host "Please run this script from the tenant_portal_backend directory" -ForegroundColor Yellow
    exit 1
}

# Step 1: Validate Prisma Schema
Write-Host "[STEP] Step 1: Validating Prisma schema..." -ForegroundColor Yellow
npx prisma validate
if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] Schema is valid" -ForegroundColor Green
} else {
    Write-Host "[ERROR] Schema validation failed" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Step 2: Generate Prisma Client
Write-Host "[STEP] Step 2: Generating Prisma client..." -ForegroundColor Yellow
npx prisma generate
if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] Prisma client generated" -ForegroundColor Green
} else {
    Write-Host "[ERROR] Failed to generate Prisma client" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Step 3: Run Migrations
Write-Host "[STEP] Step 3: Running database migrations..." -ForegroundColor Yellow
npx prisma migrate deploy
if ($LASTEXITCODE -ne 0) {
    Write-Host "[WARNING] Migration deploy failed, trying migrate dev..." -ForegroundColor Yellow
    npx prisma migrate dev --name real_world_data
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Migration failed" -ForegroundColor Red
        exit 1
    }
}
Write-Host "[OK] Migrations applied successfully" -ForegroundColor Green
Write-Host ""

# Step 4: Seed with Real-World Data
Write-Host "[STEP] Step 4: Seeding database with real-world data..." -ForegroundColor Yellow
Write-Host "This will populate the database with:"
Write-Host "  - 16 users (4 property managers, 13 tenants)"
Write-Host "  - 15 properties"
Write-Host "  - 26 units"
Write-Host "  - 13 active leases"
Write-Host "  - Sample maintenance requests, invoices, payments, expenses"
Write-Host ""
$response = Read-Host "Continue with seeding? (y/n)"
if ($response -ne "y" -and $response -ne "Y") {
    Write-Host "[WARNING] Seeding cancelled" -ForegroundColor Yellow
    exit 0
}

# Check if seed script exists
if (Test-Path "prisma\seed-real-data.ts") {
    Write-Host "Using real-world data seed script..." -ForegroundColor Cyan
    npx ts-node prisma/seed-real-data.ts
} elseif (Test-Path "prisma\seed.ts") {
    Write-Host "Using default seed script..." -ForegroundColor Cyan
    npx ts-node prisma/seed.ts
} else {
    Write-Host "[ERROR] No seed script found" -ForegroundColor Red
    exit 1
}

if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] Database seeded successfully" -ForegroundColor Green
} else {
    Write-Host "[ERROR] Seeding failed" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Final Summary
Write-Host "[OK] Migration and seeding completed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "[NEXT] Next Steps:" -ForegroundColor Cyan
Write-Host "   1. Verify data in Prisma Studio: npx prisma studio"
Write-Host "   2. Start backend server: npm run start:dev"
Write-Host "   3. Test login with seeded credentials"
Write-Host ""
Write-Host "[INFO] Seeded User Credentials:" -ForegroundColor Cyan
Write-Host "   Property Manager: admin / admin123"
Write-Host "   Property Manager: jholt / adminpass"
Write-Host "   Tenant: mark_donna / tenantpass123"
Write-Host "   Tenant: steve / tenantpass123"
Write-Host "   (See seed script for full list)"
