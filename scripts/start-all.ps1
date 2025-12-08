# Start All Services Script
# Starts frontend, backend, rent optimization ML service, and ngrok tunnel

param(
    [switch]$SkipNgrok,
    [switch]$SkipRentOpt,
    [string]$NgrokAuthtoken
)

$ErrorActionPreference = "Stop"

Write-Host "[*] Starting All Services..." -ForegroundColor Cyan
Write-Host ""

# Get the project root directory (parent of scripts folder)
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$FrontendDir = Join-Path $ProjectRoot "tenant_portal_app"
$BackendDir = Join-Path $ProjectRoot "tenant_portal_backend"
$RentOptDir = Join-Path $ProjectRoot "rent_optimization_ml"

# Function to check if a port is in use
function Test-Port {
    param([int]$Port)
    $connection = Test-NetConnection -ComputerName localhost -Port $Port -WarningAction SilentlyContinue -InformationLevel Quiet
    return $connection
}

# Function to wait for a service to be ready
function Wait-ForService {
    param(
        [string]$Name,
        [int]$Port,
        [int]$MaxWaitSeconds = 30
    )
    $elapsed = 0
    Write-Host "[...] Waiting for $Name to start..." -ForegroundColor Yellow
    while ($elapsed -lt $MaxWaitSeconds) {
        if (Test-Port -Port $Port) {
            Write-Host "[OK] $Name is ready on port $Port" -ForegroundColor Green
            return $true
        }
        Start-Sleep -Seconds 1
        $elapsed++
    }
    Write-Host "[!] $Name did not start within $MaxWaitSeconds seconds" -ForegroundColor Yellow
    return $false
}

# Check prerequisites
Write-Host "[*] Checking prerequisites..." -ForegroundColor Cyan

# Check Node.js
try {
    $nodeVersion = node --version
    Write-Host "[OK] Node.js: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Node.js not found. Please install Node.js." -ForegroundColor Red
    exit 1
}

# Check Python
try {
    $pythonVersion = python --version 2>&1
    Write-Host "[OK] Python: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Python not found. Please install Python 3.9+." -ForegroundColor Red
    exit 1
}

# Check ngrok (if not skipping)
if (-not $SkipNgrok) {
    try {
        $ngrokVersion = ngrok version 2>&1
        Write-Host "[OK] ngrok: $ngrokVersion" -ForegroundColor Green
    } catch {
        Write-Host "[!] ngrok not found. Install from https://ngrok.com/download" -ForegroundColor Yellow
        Write-Host "   Or run with -SkipNgrok to skip ngrok" -ForegroundColor Yellow
        $SkipNgrok = $true
    }
}

Write-Host ""

# Start Rent Optimization ML Service
if (-not $SkipRentOpt) {
    Write-Host "[*] Starting Rent Optimization ML Service (Port 8000)..." -ForegroundColor Cyan
    
    if (-not (Test-Path $RentOptDir)) {
        Write-Host "[!] Rent optimization directory not found: $RentOptDir" -ForegroundColor Yellow
        Write-Host "   Skipping rent optimization service..." -ForegroundColor Yellow
        $SkipRentOpt = $true
    } else {
        # Check if virtual environment exists
        $venvPath = Join-Path $RentOptDir "venv"
        $activateScript = Join-Path $venvPath "Scripts\Activate.ps1"
        $pythonExe = Join-Path $venvPath "Scripts\python.exe"
        
        if (Test-Path $venvPath) {
            if (Test-Path $pythonExe) {
                Write-Host "   Using virtual environment: $venvPath" -ForegroundColor Gray
            } else {
                $pythonExe = "python"
                Write-Host "[!] Virtual environment found but python.exe not found. Using system Python." -ForegroundColor Yellow
            }
        } else {
            $pythonExe = "python"
            Write-Host "[!] Virtual environment not found. Using system Python." -ForegroundColor Yellow
            Write-Host "   To create venv: cd '$RentOptDir'; python -m venv venv" -ForegroundColor Gray
        }
        
        # Build command to activate venv and start service
        # Use a script block approach to ensure venv activation persists
        $command = @"
`$ErrorActionPreference = 'Stop'
cd '$RentOptDir'
Write-Host '[Rent Optimization ML Service]' -ForegroundColor Cyan
Write-Host 'Working directory: ' -NoNewline; Write-Host (Get-Location) -ForegroundColor Gray
if (Test-Path '$activateScript') {
    Write-Host 'Activating virtual environment...' -ForegroundColor Gray
    & '$activateScript'
    Write-Host 'Virtual environment activated' -ForegroundColor Green
    Write-Host 'Python: ' -NoNewline; python --version
    Write-Host 'Python path: ' -NoNewline; (Get-Command python).Source
} else {
    Write-Host '[!] Virtual environment activation script not found' -ForegroundColor Yellow
    Write-Host 'Using system Python: ' -NoNewline; python --version
}
Write-Host '' 
& '$pythonExe' -m pip install -r requirements.txt
Write-Host 'Dependencies installed' -ForegroundColor Green
Write-Host ''
Write-Host 'Starting FastAPI server...' -ForegroundColor Cyan
Write-Host ''
& '$pythonExe' main.py
Write-Host ''
Write-Host 'Service stopped. Press any key to close...' -ForegroundColor Yellow
`$null = `$Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
"@
        
        $rentOptJob = Start-Process -FilePath "powershell" -ArgumentList @(
            "-NoExit",
            "-ExecutionPolicy", "Bypass",
            "-Command",
            $command
        ) -PassThru
        
        Write-Host "   Started in new window (PID: $($rentOptJob.Id))" -ForegroundColor Gray
        Start-Sleep -Seconds 2
        Wait-ForService -Name "Rent Optimization ML" -Port 8000
    }
    Write-Host ""
}

# Start Backend
Write-Host "[*] Starting Backend (Port 3001)..." -ForegroundColor Cyan

if (-not (Test-Path $BackendDir)) {
    Write-Host "[ERROR] Backend directory not found: $BackendDir" -ForegroundColor Red
    exit 1
}

# Check if backend is already running
if (Test-Port -Port 3001) {
    Write-Host "[!] Port 3001 is already in use. Backend may already be running." -ForegroundColor Yellow
} else {
    # Check if node_modules exists
    $nodeModulesPath = Join-Path $BackendDir "node_modules"
    if (-not (Test-Path $nodeModulesPath)) {
        Write-Host "[!] node_modules not found. Run 'npm install' in backend directory first." -ForegroundColor Yellow
    }
    
    $backendCommand = @"
`$ErrorActionPreference = 'Stop'
cd '$BackendDir'
Write-Host '[Backend Server]' -ForegroundColor Cyan
Write-Host 'Working directory: ' -NoNewline; Write-Host (Get-Location) -ForegroundColor Gray
Write-Host 'Node version: ' -NoNewline; node --version
Write-Host 'NPM version: ' -NoNewline; npm --version
Write-Host ''
Write-Host 'Starting NestJS backend...' -ForegroundColor Cyan
Write-Host ''
npm start
Write-Host ''
Write-Host 'Service stopped. Press any key to close...' -ForegroundColor Yellow
`$null = `$Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
"@
    
    $backendJob = Start-Process -FilePath "powershell" -ArgumentList @(
        "-NoExit",
        "-ExecutionPolicy", "Bypass",
        "-Command",
        $backendCommand
    ) -PassThru
    
    Write-Host "   Started in new window (PID: $($backendJob.Id))" -ForegroundColor Gray
    Start-Sleep -Seconds 3
    Wait-ForService -Name "Backend" -Port 3001
}
Write-Host ""

# Start Frontend
Write-Host "[*] Starting Frontend (Port 3000)..." -ForegroundColor Cyan

if (-not (Test-Path $FrontendDir)) {
    Write-Host "[ERROR] Frontend directory not found: $FrontendDir" -ForegroundColor Red
    exit 1
}

# Check if frontend is already running
if (Test-Port -Port 3000) {
    Write-Host "[!] Port 3000 is already in use. Frontend may already be running." -ForegroundColor Yellow
} else {
    # Check if node_modules exists
    $nodeModulesPath = Join-Path $FrontendDir "node_modules"
    if (-not (Test-Path $nodeModulesPath)) {
        Write-Host "[!] node_modules not found. Run 'npm install' in frontend directory first." -ForegroundColor Yellow
    }
    
    $frontendCommand = @"
`$ErrorActionPreference = 'Stop'
cd '$FrontendDir'
Write-Host '[Frontend App]' -ForegroundColor Cyan
Write-Host 'Working directory: ' -NoNewline; Write-Host (Get-Location) -ForegroundColor Gray
Write-Host 'Node version: ' -NoNewline; node --version
Write-Host 'NPM version: ' -NoNewline; npm --version
Write-Host ''
Write-Host 'Starting Vite dev server...' -ForegroundColor Cyan
Write-Host ''
npm start
Write-Host ''
Write-Host 'Service stopped. Press any key to close...' -ForegroundColor Yellow
`$null = `$Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
"@
    
    $frontendJob = Start-Process -FilePath "powershell" -ArgumentList @(
        "-NoExit",
        "-ExecutionPolicy", "Bypass",
        "-Command",
        $frontendCommand
    ) -PassThru
    
    Write-Host "   Started in new window (PID: $($frontendJob.Id))" -ForegroundColor Gray
    Start-Sleep -Seconds 2
    Write-Host "[OK] Frontend starting (may take a moment to compile)..." -ForegroundColor Green
}
Write-Host ""

# Start ngrok
if (-not $SkipNgrok) {
    Write-Host "[*] Starting ngrok tunnel (Port 3001)..." -ForegroundColor Cyan
    
    # Check if ngrok authtoken is needed
    if ($NgrokAuthtoken) {
        Write-Host "   Configuring ngrok authtoken..." -ForegroundColor Gray
        ngrok config add-authtoken $NgrokAuthtoken 2>&1 | Out-Null
    }
    
    # Check if port 3001 is accessible
    if (-not (Test-Port -Port 3001)) {
        Write-Host "[!] Backend (port 3001) is not ready. ngrok may fail." -ForegroundColor Yellow
        Write-Host "   Waiting 5 more seconds..." -ForegroundColor Yellow
        Start-Sleep -Seconds 5
    }
    
    $ngrokCommand = @"
`$ErrorActionPreference = 'Stop'
Write-Host '[ngrok Tunnel]' -ForegroundColor Cyan
Write-Host 'Tunneling http://localhost:3001' -ForegroundColor Gray
Write-Host 'ngrok version: ' -NoNewline; ngrok version
Write-Host ''
ngrok http 3001
Write-Host ''
Write-Host 'Service stopped. Press any key to close...' -ForegroundColor Yellow
`$null = `$Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
"@
    
    $ngrokJob = Start-Process -FilePath "powershell" -ArgumentList @(
        "-NoExit",
        "-ExecutionPolicy", "Bypass",
        "-Command",
        $ngrokCommand
    ) -PassThru
    
    Write-Host "   Started in new window (PID: $($ngrokJob.Id))" -ForegroundColor Gray
    Write-Host "   [!] Copy the HTTPS URL from ngrok and configure it in DocuSign webhooks" -ForegroundColor Yellow
    Write-Host ""
}

# Summary
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "[OK] All Services Started!" -ForegroundColor Green
Write-Host ""
Write-Host "[*] Service URLs:" -ForegroundColor Cyan
Write-Host "   Frontend:        http://localhost:3000" -ForegroundColor White
Write-Host "   Backend:         http://localhost:3001" -ForegroundColor White
if (-not $SkipRentOpt) {
    Write-Host "   Rent Optimization: http://localhost:8000" -ForegroundColor White
    Write-Host "   Rent Opt Docs:     http://localhost:8000/docs" -ForegroundColor White
}
if (-not $SkipNgrok) {
    Write-Host "   ngrok:           Check ngrok window for HTTPS URL" -ForegroundColor White
    Write-Host "   ngrok Dashboard: http://localhost:4040" -ForegroundColor White
}
Write-Host ""
Write-Host "[*] Tips:" -ForegroundColor Cyan
Write-Host "   - Each service runs in its own window" -ForegroundColor Gray
Write-Host "   - Close individual windows to stop specific services" -ForegroundColor Gray
Write-Host "   - Use Ctrl+C in each window to stop that service" -ForegroundColor Gray
if (-not $SkipNgrok) {
    Write-Host "   - Copy ngrok HTTPS URL to DocuSign webhook configuration" -ForegroundColor Gray
}
Write-Host ""
Write-Host "Press any key to exit this script (services will continue running)..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
