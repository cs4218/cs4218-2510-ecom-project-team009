#!/bin/bash

# Checkout Flow Stress Test Runner for Virtual Vault E-Commerce
# Test Plan: 50 → 100 → 150 → 200 → 300 → 400 → 500 → 600 → 750 → 1000 users over 30 minutes

set -e

echo "=========================================="
echo "Virtual Vault - Checkout Flow Stress Test"
echo "50 → 100 → 150 → 200 → 300 → 400 → 500 → 600 → 750 → 1000 Users"
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

# Check if database has products
echo "Checking if database has test data..."
PRODUCT_COUNT=$(curl -s http://localhost:6060/api/v1/product/product-count | grep -o '"total":[0-9]*' | grep -o '[0-9]*' || echo "0")
if [ "$PRODUCT_COUNT" -lt 10 ]; then
    echo "⚠️  Database has only $PRODUCT_COUNT products (need at least 10)"
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

# Check if test users exist
echo "Checking if checkout test users are seeded..."
# We can't easily check MongoDB from bash, so we'll assume users are seeded if the seed script was run
if [ ! -f "performance-testing/scenarios/checkout-flow/test-data/checkout-users.csv" ]; then
    echo "❌ User credentials CSV file not found"
    echo "Please seed checkout users with: npm run seed-checkout-users"
    exit 1
fi
USER_COUNT=$(wc -l < performance-testing/scenarios/checkout-flow/test-data/checkout-users.csv)
USER_COUNT=$((USER_COUNT - 1))  # Subtract header row
if [ "$USER_COUNT" -lt 1000 ]; then
    echo "⚠️  CSV has only $USER_COUNT users (need 1000)"
    echo "Please seed checkout users with: npm run seed-checkout-users"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    echo "✅ CSV file has $USER_COUNT user credentials"
fi
echo ""

# Check Braintree configuration
echo "Checking Braintree configuration..."
if ! grep -q "BRAINTREE_MERCHANT_ID" .env; then
    echo "⚠️  Braintree credentials not found in .env"
    echo "Please configure Braintree sandbox credentials"
    read -p "Continue anyway? (payment requests will fail) (y/n) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    echo "✅ Braintree credentials configured"
fi
echo ""

# Generate timestamp for result files
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
RESULT_FILE="performance-testing/results/checkout-stress-${TIMESTAMP}.jtl"
REPORT_DIR="performance-testing/reports/checkout-stress-${TIMESTAMP}"

echo "Test Configuration:"
echo "  - Phase 1 (0-3 min):     50 users  (baseline)"
echo "  - Phase 2 (3-6 min):     100 users (+50)"
echo "  - Phase 3 (6-9 min):     150 users (+50)"
echo "  - Phase 4 (9-12 min):    200 users (+50)"
echo "  - Phase 5 (12-15 min):   300 users (+100)"
echo "  - Phase 6 (15-18 min):   400 users (+100)"
echo "  - Phase 7 (18-21 min):   500 users (+100)"
echo "  - Phase 8 (21-24 min):   600 users (+100)"
echo "  - Phase 9 (24-27 min):   750 users (+150)"
echo "  - Phase 10 (27-30 min):  1000 users (+250) - PEAK"
echo ""
echo "  - Duration: 30 minutes"
echo "  - User flow: Login → Get Braintree Token → Process Payment"
echo "  - Think time: 5 seconds between checkout attempts"
echo ""
echo "  - Result file: ${RESULT_FILE}"
echo "  - Report dir: ${REPORT_DIR}"
echo ""

# IMPORTANT: Warn about database cleanup
echo "⚠️  WARNING:"
echo "  This test will create thousands of orders in your database!"
echo "  Consider cleaning up after the test with:"
echo "  mongosh virtual-vault --eval 'db.orders.deleteMany({})'"
echo ""

# Ask for confirmation
read -p "Start checkout flow stress test? This will take 30 minutes. (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Test cancelled"
    exit 1
fi

echo ""
echo "=========================================="
echo "STARTING CHECKOUT FLOW STRESS TEST"
echo "=========================================="
echo ""
echo "📊 Monitor system during test:"
echo "   Terminal 1: watch -n 1 'curl -s http://localhost:6060/api/v1/product/product-count'"
echo "   Terminal 2: top -pid \$(lsof -ti:6060)"
echo "   Terminal 3: mongosh virtual-vault --eval \"db.orders.countDocuments({})\""
echo "   Terminal 4: mongosh --eval \"db.serverStatus().connections\""
echo ""
echo "Test starting in 5 seconds..."
sleep 5

# Create results directory if it doesn't exist
mkdir -p performance-testing/results
mkdir -p performance-testing/reports

# Run JMeter in non-GUI mode
jmeter -n \
  -t performance-testing/scenarios/checkout-flow/stress-test.jmx \
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
echo "  2. Identify the breaking point (where response times > 5s or errors > 5%)"
echo "  3. Compare with homepage browsing test results"
echo "  4. Analyze write-heavy operation bottlenecks"
echo ""
echo "Cleanup (optional):"
echo "  mongosh virtual-vault --eval 'db.orders.deleteMany({})'"
echo ""
