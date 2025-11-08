#!/bin/bash

# Spike Test Runner for Virtual Vault E-Commerce
# Test Plan: 100 baseline → INSTANT 1000 users → 100 recovery (10 min total)

set -e

echo "=========================================="
echo "Virtual Vault - Spike Test"
echo "100 → INSTANT 1000 → 100 Users"
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
RESULT_FILE="results/spike-${TIMESTAMP}.jtl"
REPORT_DIR="reports/spike-${TIMESTAMP}"

echo "Test Configuration:"
echo "  - Phase 1 (0-5 min):    100 users (baseline - gradual ramp)"
echo "  - Phase 2 (5-8 min):    1000 users (INSTANT SPIKE +900 in 1 second!)"
echo "  - Phase 3 (8-10 min):   100 users (recovery - verify stability)"
echo ""
echo "  - Total Duration: 10 minutes"
echo "  - Spike Magnitude: 10x traffic increase in 1 second"
echo "  - User flow: Categories → Products → Images → Filters"
echo "  - Think time: 1-2 seconds between iterations"
echo ""
echo "  - Result file: ${RESULT_FILE}"
echo "  - Report dir: ${REPORT_DIR}"
echo ""

# Ask for confirmation
read -p "Start spike test? This will take 10 minutes. (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Test cancelled"
    exit 1
fi

echo ""
echo "=========================================="
echo "STARTING SPIKE TEST"
echo "=========================================="
echo ""
echo "📊 Monitor system during test:"
echo "   Terminal 1: watch -n 1 'curl -s http://localhost:6060/api/v1/product/product-count'"
echo "   Terminal 2: top -pid \$(lsof -ti:6060)"
echo "   Terminal 3: mongosh --eval \"db.serverStatus().connections\""
echo ""
echo "⚡ SPIKE occurs at 5:00 mark - watch for:"
echo "   - Response time spike"
echo "   - Error rate increase"
echo "   - CPU/Memory surge"
echo "   - Database connection pool usage"
echo ""
echo "Test starting in 5 seconds..."
sleep 5

# Run JMeter in non-GUI mode
jmeter -n \
  -t spike-test.jmx \
  -l "${RESULT_FILE}" \
  -e \
  -o "${REPORT_DIR}"

echo ""
echo "=========================================="
echo "Spike Test Completed!"
echo "=========================================="
echo ""
echo "Results saved to:"
echo "  - Raw data: ${RESULT_FILE}"
echo "  - HTML report: ${REPORT_DIR}/index.html"
echo ""
echo "Open HTML report with:"
echo "  open ${REPORT_DIR}/index.html"
echo ""
echo "🔍 Key Metrics to Analyze:"
echo "  1. Response Time Graph - Look for spike at 5:00 mark"
echo "  2. Error Rate - Should stay below 5% during spike"
echo "  3. Throughput - Should remain stable or gracefully degrade"
echo "  4. Recovery Time - How long to return to baseline performance?"
echo ""
echo "✅ PASS Criteria:"
echo "   - 90% of requests complete successfully during spike"
echo "   - Response times recover to baseline within 2 minutes"
echo "   - No system crashes or unrecoverable errors"
echo ""
echo "❌ FAIL Criteria:"
echo "   - Error rate > 10% during spike"
echo "   - System crashes or becomes unresponsive"
echo "   - Response times don't recover after spike ends"
echo ""