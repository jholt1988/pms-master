param(
  [string]$BaseUrl = "http://localhost:3001",
  [string]$ApiPrefix = "/api",
  [string]$AuthToken = $null
)

$env:BASE_URL = $BaseUrl
$env:API_PREFIX = $ApiPrefix
if ($AuthToken) { $env:AUTH_TOKEN = $AuthToken }

# Ensure node dependencies (axios) are available - install locally if missing
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$nodeScript = Join-Path $scriptDir 'run-smoke-tests.js'

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Error "Node.js is not available on PATH. Please install Node.js to run smoke tests."
  exit 1
}

# Attempt to install axios locally to the scripts folder if not present
Push-Location $scriptDir
if (-not (Test-Path "node_modules/axios")) {
  Write-Output "Installing axios locally for smoke tests..."
  npm init -y | Out-Null
  npm install axios --no-audit --no-fund | Out-Null
}

Write-Output "Running smoke tests against $BaseUrl (prefix $ApiPrefix)"
node $nodeScript
$exit = $LASTEXITCODE
Pop-Location
exit $exit
