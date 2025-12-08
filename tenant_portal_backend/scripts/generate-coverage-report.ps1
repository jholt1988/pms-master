# P0-004: Generate Coverage Reports (PowerShell)
# Generates both unit test and E2E test coverage reports

Write-Host "🧪 Generating Test Coverage Reports..." -ForegroundColor Cyan

# Unit test coverage
Write-Host "📊 Running unit tests with coverage..." -ForegroundColor Yellow
npm run test:coverage

# E2E test coverage
Write-Host "📊 Running E2E tests with coverage..." -ForegroundColor Yellow
npm run test:e2e:coverage

# Display results
Write-Host "`n📈 Coverage reports generated:" -ForegroundColor Green
Write-Host "  - Unit tests: coverage/index.html" -ForegroundColor White
Write-Host "  - E2E tests: coverage/e2e/index.html" -ForegroundColor White

# Open HTML report (Windows)
if (Test-Path "coverage/index.html") {
    Write-Host "`nOpening coverage report..." -ForegroundColor Cyan
    Start-Process "coverage/index.html"
}

