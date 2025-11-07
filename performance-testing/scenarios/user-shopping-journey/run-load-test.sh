#!/bin/bash

# Get the script's directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

# Cleanup function to be called on exit or error
cleanup_on_exit() {
  local exit_code=$?
  if [ $exit_code -ne 0 ]; then
    echo ""
    echo "Test failed or interrupted! Cleaning up seeded data..."
    cd "$PROJECT_ROOT"
    node "$SCRIPT_DIR/cleanup.js"
    if [ $? -eq 0 ]; then
      echo "Cleanup completed successfully"
    else
      echo "Cleanup encountered issues - please check manually"
    fi
  fi
}

# Set up trap to cleanup on EXIT (normal or error)
trap cleanup_on_exit EXIT

echo "=== Load Test: User Shopping Journey ==="
echo ""

# Step 1: Seed test users
echo "[1/5] Seeding 25 test users..."
node "$PROJECT_ROOT/performance-testing/data/seed-load-test-users.js"

if [ $? -ne 0 ]; then
  echo "ERROR: Failed to seed users"
  exit 1
fi

echo ""

# Step 2: Run JMeter load test
echo "[2/5] Running JMeter load test (~8 minutes for 2 phases)..."
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
cd "$SCRIPT_DIR"
jmeter -n -t load-test.jmx \
  -l results/results_${TIMESTAMP}.jtl \
  -e -o results/report_${TIMESTAMP}

if [ $? -ne 0 ]; then
  echo ""
  echo "ERROR: JMeter test failed"
  exit 1
fi

# Step 3: Report generated
echo ""
echo "[3/5] Test completed! Report generated at:"
echo "       results/report_${TIMESTAMP}/index.html"

# Step 4: Cleanup
echo ""
echo "[4/5] Cleaning up test data..."
cd "$PROJECT_ROOT"
node "$SCRIPT_DIR/cleanup.js"

if [ $? -ne 0 ]; then
  echo "⚠️  Cleanup encountered issues - please check manually"
  exit 1
fi

# Step 5: Done
echo ""
echo "[5/5] Load test complete! All test data cleaned up."
echo ""
echo "Open report: open results/report_${TIMESTAMP}/index.html"
echo ""

# Exit successfully (trap will not cleanup on success due to exit code 0)
exit 0
