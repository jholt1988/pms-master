#!/bin/bash
#
# Runs the Property OS simulation harness against a target PMS endpoint.
#

set -euo pipefail

# --- Configuration ---
SIM_HARNESS_DIR="pms-master/tools/simulation/property-os-v1.6/sim_harness"
DEFAULT_ENDPOINT="http://localhost:3000/api/v1/model/predict"
DEFAULT_N_SAMPLES=200

# --- Argument Parsing ---
TARGET_ENDPOINT="${1:-$DEFAULT_ENDPOINT}"
N_SAMPLES="${2:-$DEFAULT_N_SAMPLES}"

# --- Main Logic ---
echo "Running Property OS Simulation..."
echo "Target endpoint: $TARGET_ENDPOINT"
echo "Number of samples: $N_SAMPLES"
echo ""

# Activate virtual environment if it exists
if [ -d "$SIM_HARNESS_DIR/.venv" ]; then
    source "$SIM_HARNESS_DIR/.venv/bin/activate"
fi

# Run the simulation
python3 "$SIM_HARNESS_DIR/run.py" \
    --endpoint "$TARGET_ENDPOINT" \
    --samples "$N_SAMPLES" \
    --output-dir "reports/sim/property-os-v1.6"

echo ""
echo "Simulation run complete."
echo "Reports generated in: reports/sim/property-os-v1.6"
