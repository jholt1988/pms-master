#!/bin/bash
# Start All Services Script
# Starts frontend, backend, rent optimization ML service, and ngrok tunnel

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

# Parse arguments
SKIP_NGROK=false
SKIP_RENT_OPT=false
NGROK_AUTHTOKEN=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-ngrok)
            SKIP_NGROK=true
            shift
            ;;
        --skip-rent-opt)
            SKIP_RENT_OPT=true
            shift
            ;;
        --ngrok-authtoken)
            NGROK_AUTHTOKEN="$2"
            shift 2
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

echo -e "${CYAN}🚀 Starting All Services...${NC}"
echo ""

# Get the project root directory (parent of scripts folder)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
FRONTEND_DIR="$PROJECT_ROOT/tenant_portal_app"
BACKEND_DIR="$PROJECT_ROOT/tenant_portal_backend"
RENT_OPT_DIR="$PROJECT_ROOT/rent_optimization_ml"

# Function to check if a port is in use
check_port() {
    local port=$1
    if command -v nc >/dev/null 2>&1; then
        nc -z localhost "$port" 2>/dev/null
    elif command -v netcat >/dev/null 2>&1; then
        netcat -z localhost "$port" 2>/dev/null
    else
        # Fallback: try to connect
        timeout 1 bash -c "echo > /dev/tcp/localhost/$port" 2>/dev/null
    fi
}

# Function to wait for a service to be ready
wait_for_service() {
    local name=$1
    local port=$2
    local max_wait=${3:-30}
    local elapsed=0
    
    echo -e "${YELLOW}⏳ Waiting for $name to start...${NC}"
    while [ $elapsed -lt $max_wait ]; do
        if check_port "$port"; then
            echo -e "${GREEN}✅ $name is ready on port $port${NC}"
            return 0
        fi
        sleep 1
        elapsed=$((elapsed + 1))
    done
    echo -e "${YELLOW}⚠️  $name did not start within $max_wait seconds${NC}"
    return 1
}

# Check prerequisites
echo -e "${CYAN}📋 Checking prerequisites...${NC}"

# Check Node.js
if command -v node >/dev/null 2>&1; then
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✅ Node.js: $NODE_VERSION${NC}"
else
    echo -e "${RED}❌ Node.js not found. Please install Node.js.${NC}"
    exit 1
fi

# Check Python
if command -v python3 >/dev/null 2>&1; then
    PYTHON_VERSION=$(python3 --version 2>&1)
    echo -e "${GREEN}✅ Python: $PYTHON_VERSION${NC}"
    PYTHON_CMD="python3"
elif command -v python >/dev/null 2>&1; then
    PYTHON_VERSION=$(python --version 2>&1)
    echo -e "${GREEN}✅ Python: $PYTHON_VERSION${NC}"
    PYTHON_CMD="python"
else
    echo -e "${RED}❌ Python not found. Please install Python 3.9+.${NC}"
    exit 1
fi

# Check ngrok (if not skipping)
if [ "$SKIP_NGROK" = false ]; then
    if command -v ngrok >/dev/null 2>&1; then
        NGROK_VERSION=$(ngrok version 2>&1 | head -n 1)
        echo -e "${GREEN}✅ ngrok: $NGROK_VERSION${NC}"
    else
        echo -e "${YELLOW}⚠️  ngrok not found. Install from https://ngrok.com/download${NC}"
        echo -e "${YELLOW}   Or run with --skip-ngrok to skip ngrok${NC}"
        SKIP_NGROK=true
    fi
fi

echo ""

# Start Rent Optimization ML Service
if [ "$SKIP_RENT_OPT" = false ]; then
    echo -e "${CYAN}🤖 Starting Rent Optimization ML Service (Port 8000)...${NC}"
    
    if [ ! -d "$RENT_OPT_DIR" ]; then
        echo -e "${YELLOW}⚠️  Rent optimization directory not found: $RENT_OPT_DIR${NC}"
        echo -e "${YELLOW}   Skipping rent optimization service...${NC}"
        SKIP_RENT_OPT=true
    else
        # Check if virtual environment exists
        VENV_PATH="$RENT_OPT_DIR/venv"
        if [ -d "$VENV_PATH" ]; then
            PYTHON_EXE="$VENV_PATH/bin/python"
            if [ ! -f "$PYTHON_EXE" ]; then
                PYTHON_EXE="$PYTHON_CMD"
            fi
        else
            PYTHON_EXE="$PYTHON_CMD"
            echo -e "${YELLOW}⚠️  Virtual environment not found. Using system Python.${NC}"
        fi
        
        # Start the service in background
        cd "$RENT_OPT_DIR"
        if [ -f "$VENV_PATH/bin/activate" ]; then
            source "$VENV_PATH/bin/activate"
        fi
        $PYTHON_EXE main.py > /tmp/rent-opt.log 2>&1 &
        RENT_OPT_PID=$!
        echo "   Started in background (PID: $RENT_OPT_PID)"
        cd "$PROJECT_ROOT"
        sleep 2
        wait_for_service "Rent Optimization ML" 8000
    fi
    echo ""
fi

# Start Backend
echo -e "${CYAN}🔧 Starting Backend (Port 3001)...${NC}"

if [ ! -d "$BACKEND_DIR" ]; then
    echo -e "${RED}❌ Backend directory not found: $BACKEND_DIR${NC}"
    exit 1
fi

# Check if backend is already running
if check_port 3001; then
    echo -e "${YELLOW}⚠️  Port 3001 is already in use. Backend may already be running.${NC}"
else
    cd "$BACKEND_DIR"
    npm start > /tmp/backend.log 2>&1 &
    BACKEND_PID=$!
    echo "   Started in background (PID: $BACKEND_PID)"
    cd "$PROJECT_ROOT"
    sleep 3
    wait_for_service "Backend" 3001
fi
echo ""

# Start Frontend
echo -e "${CYAN}🎨 Starting Frontend (Port 3000)...${NC}"

if [ ! -d "$FRONTEND_DIR" ]; then
    echo -e "${RED}❌ Frontend directory not found: $FRONTEND_DIR${NC}"
    exit 1
fi

# Check if frontend is already running
if check_port 3000; then
    echo -e "${YELLOW}⚠️  Port 3000 is already in use. Frontend may already be running.${NC}"
else
    cd "$FRONTEND_DIR"
    npm start > /tmp/frontend.log 2>&1 &
    FRONTEND_PID=$!
    echo "   Started in background (PID: $FRONTEND_PID)"
    cd "$PROJECT_ROOT"
    sleep 2
    echo -e "${GREEN}✅ Frontend starting (may take a moment to compile)...${NC}"
fi
echo ""

# Start ngrok
if [ "$SKIP_NGROK" = false ]; then
    echo -e "${CYAN}🌐 Starting ngrok tunnel (Port 3001)...${NC}"
    
    # Check if ngrok authtoken is needed
    if [ -n "$NGROK_AUTHTOKEN" ]; then
        echo "   Configuring ngrok authtoken..."
        ngrok config add-authtoken "$NGROK_AUTHTOKEN" >/dev/null 2>&1
    fi
    
    # Check if port 3001 is accessible
    if ! check_port 3001; then
        echo -e "${YELLOW}⚠️  Backend (port 3001) is not ready. ngrok may fail.${NC}"
        echo -e "${YELLOW}   Waiting 5 more seconds...${NC}"
        sleep 5
    fi
    
    ngrok http 3001 > /tmp/ngrok.log 2>&1 &
    NGROK_PID=$!
    echo "   Started in background (PID: $NGROK_PID)"
    echo -e "${YELLOW}   ⚠️  Check ngrok dashboard at http://localhost:4040 for HTTPS URL${NC}"
    echo -e "${YELLOW}   Copy the HTTPS URL and configure it in DocuSign webhooks${NC}"
    echo ""
fi

# Summary
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ All Services Started!${NC}"
echo ""
echo -e "${CYAN}📍 Service URLs:${NC}"
echo -e "${WHITE}   Frontend:        http://localhost:3000${NC}"
echo -e "${WHITE}   Backend:         http://localhost:3001${NC}"
if [ "$SKIP_RENT_OPT" = false ]; then
    echo -e "${WHITE}   Rent Optimization: http://localhost:8000${NC}"
    echo -e "${WHITE}   Rent Opt Docs:     http://localhost:8000/docs${NC}"
fi
if [ "$SKIP_NGROK" = false ]; then
    echo -e "${WHITE}   ngrok Dashboard: http://localhost:4040${NC}"
fi
echo ""
echo -e "${CYAN}💡 Tips:${NC}"
echo -e "${WHITE}   - Services are running in the background${NC}"
echo -e "${WHITE}   - Logs are available in /tmp/ directory${NC}"
echo -e "${WHITE}   - Use 'kill $FRONTEND_PID $BACKEND_PID $RENT_OPT_PID $NGROK_PID' to stop all${NC}"
if [ "$SKIP_NGROK" = false ]; then
    echo -e "${WHITE}   - Copy ngrok HTTPS URL to DocuSign webhook configuration${NC}"
fi
echo ""

# Store PIDs for cleanup
echo "FRONTEND_PID=$FRONTEND_PID" > /tmp/pms-services.pids
echo "BACKEND_PID=$BACKEND_PID" >> /tmp/pms-services.pids
if [ "$SKIP_RENT_OPT" = false ]; then
    echo "RENT_OPT_PID=$RENT_OPT_PID" >> /tmp/pms-services.pids
fi
if [ "$SKIP_NGROK" = false ]; then
    echo "NGROK_PID=$NGROK_PID" >> /tmp/pms-services.pids
fi

echo -e "${YELLOW}Press Ctrl+C to stop all services...${NC}"

# Wait for interrupt
trap "echo ''; echo -e '${CYAN}Stopping all services...${NC}'; kill $FRONTEND_PID $BACKEND_PID 2>/dev/null; [ \"\$SKIP_RENT_OPT\" = false ] && kill $RENT_OPT_PID 2>/dev/null; [ \"\$SKIP_NGROK\" = false ] && kill $NGROK_PID 2>/dev/null; exit 0" INT TERM

# Keep script running
wait

