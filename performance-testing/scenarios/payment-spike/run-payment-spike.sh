#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

cleanup_on_exit() {
  local exit_code=$?
  if [ $exit_code -ne 0 ]; then
    echo ""
    echo "Test failed! Cleaning up..."
    node "$SCRIPT_DIR/cleanup.js"
  fi
}

trap cleanup_on_exit EXIT

echo "==========================================="
echo "Payment Spike Test"
echo "100 → 500 (INSTANT) → 100 Users"
echo "==========================================="
echo ""

echo "[1/5] Checking backend..."
if ! curl -s http://localhost:6060/api/v1/product/product-count > /dev/null; then
    echo "❌ Backend not running on port 6060"
    exit 1
fi
echo "✅ Backend is running"
echo ""

echo "[2/5] Seeding 100 test users..."
node "$SCRIPT_DIR/seed-users.js"
if [ $? -ne 0 ]; then
  echo "ERROR: Failed to seed users"
  exit 1
fi
echo ""

echo "[3/5] Running payment spike test (10 minutes)..."
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
cd "$SCRIPT_DIR"
jmeter -n -t payment-spike-test.jmx \
  -l results/results_${TIMESTAMP}.jtl \
  -e -o results/report_${TIMESTAMP}

if [ $? -ne 0 ]; then
  echo ""
  echo "ERROR: JMeter test failed"
  exit 1
fi

echo ""
echo "[4/5] Test completed! Report:"
echo "       results/report_${TIMESTAMP}/index.html"
echo ""

echo "[5/5] Cleaning up test data..."
node "$SCRIPT_DIR/cleanup.js"

echo ""
echo "==========================================="
echo "Payment spike test complete!"
echo "==========================================="
echo ""
echo "📊 View report:"
echo "   open results/report_${TIMESTAMP}/index.html"
echo ""

exit 0