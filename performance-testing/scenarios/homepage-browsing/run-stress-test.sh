#!/bin/bash

# Progressive Stress Test Runner for Virtual Vault E-Commerce
# Test Plan: 50 → 150 → 300 → 500 → 750 → 1000 users over 30 minutes

set -e

echo "=========================================="
echo "Virtual Vault - Progressive Stress Test"
echo "50 → 150 → 300 → 500 → 750 → 1000 Users"
echo "=========================================="
echo ""

# Check if backend is running
echo "Checking if backend is running on port 6060..."
if ! curl -s http://localhost:6060/api/v1/product/product-count > /dev/null; then
    echo "❌ Backend is not running on port 6060"
    echo "Please start the backend with: npm run server"
    exit 1
fi
echo "✅ Backend is running"
echo ""

# Check if database is seeded
echo "Checking if database has test data..."
PRODUCT_COUNT=$(curl -s http://localhost:6060/api/v1/product/product-count | grep -o '"total":[0-9]*' | grep -o '[0-9]*' || echo "0")
if [ "$PRODUCT_COUNT" -lt 50 ]; then
    echo "⚠️  Database has only $PRODUCT_COUNT products (need at least 50)"
    echo "Please seed the database with: npm run seed-stress-test"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    echo "✅ Database has $PRODUCT_COUNT products"
fi
echo ""

# Generate timestamp for result files
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
RESULT_FILE="performance-testing/results/stress-progressive-${TIMESTAMP}.jtl"
REPORT_DIR="performance-testing/reports/stress-progressive-${TIMESTAMP}"

echo "Test Configuration:"
echo "  - Phase 1 (0-5 min):   50 users  (baseline)"
echo "  - Phase 2 (5-10 min):  150 users (+100)"
echo "  - Phase 3 (10-15 min): 300 users (+150)"
echo "  - Phase 4 (15-20 min): 500 users (+200)"
echo "  - Phase 5 (20-25 min): 750 users (+250)"
echo "  - Phase 6 (25-30 min): 1000 users (+250) - PEAK"
echo ""
echo "  - Duration: 30 minutes"
echo "  - User flow: Load categories → Load 12 products → Load 12 images"
echo "  - Think time: 2 seconds between iterations"
echo ""
echo "  - Result file: ${RESULT_FILE}"
echo "  - Report dir: ${REPORT_DIR}"
echo ""

# Ask for confirmation
read -p "Start progressive stress test? This will take 30 minutes. (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Test cancelled"
    exit 1
fi

echo ""
echo "=========================================="
echo "STARTING STRESS TEST"
echo "=========================================="
echo ""
echo "📊 Monitor system during test:"
echo "   Terminal 1: watch -n 1 'curl -s http://localhost:6060/api/v1/product/product-count'"
echo "   Terminal 2: top -pid \$(lsof -ti:6060)"
echo "   Terminal 3: mongosh --eval \"db.serverStatus().connections\""
echo ""
echo "Test starting in 5 seconds..."
sleep 5

# Run JMeter in non-GUI mode
jmeter -n \
  -t performance-testing/scenarios/homepage-browsing/stress-test.jmx \
  -l "${RESULT_FILE}" \
  -e \
  -o "${REPORT_DIR}"

echo ""
echo "=========================================="
echo "Test Completed!"
echo "=========================================="
echo ""
echo "Results saved to:"
echo "  - Raw data: ${RESULT_FILE}"
echo "  - HTML report: ${REPORT_DIR}/index.html"
echo ""
echo "Open HTML report with:"
echo "  open ${REPORT_DIR}/index.html"
echo ""
echo "Next steps:"
echo "  1. Review the HTML report"
echo "  2. Identify the breaking point (where response times > 3s or errors > 5%)"
echo ""
