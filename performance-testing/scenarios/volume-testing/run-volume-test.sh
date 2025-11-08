#!/bin/bash

# Volume Test Runner for Virtual Vault E-Commerce
# Tests: 100 → 1K → 10K → 50K → 100K products with constant 100 users

set -e

echo "=========================================="
echo "Virtual Vault - Volume Testing"
echo "Testing with increasing data volumes"
echo "=========================================="
echo ""

# Check backend
echo "Checking if backend is running on port 6060..."
if ! curl -s http://localhost:6060/api/v1/product/product-count > /dev/null; then
    echo "❌ Backend is not running on port 6060"
    echo "Please start the backend with: npm run server"
    exit 1
fi
echo "✅ Backend is running"
echo ""

# Volume levels to test
VOLUMES=("1000:small" "10000:medium" "50000:large" "100000:xlarge")

# Generate timestamp
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
RESULTS_DIR="performance-testing/results/volume-${TIMESTAMP}"
mkdir -p "${RESULTS_DIR}"

echo "Test Configuration:"
echo "  - Fixed users: 100 concurrent users"
echo "  - Volume levels: 1K → 10K → 50K → 100K products"
echo "  - Duration per level: 2 minutes"
echo "  - Total test time: ~10 minutes"
echo ""
echo "  - Results directory: ${RESULTS_DIR}"
echo ""

read -p "Start volume testing? This will take ~10 minutes. (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Test cancelled"
    exit 1
fi

echo ""
echo "=========================================="
echo "STARTING VOLUME TESTS"
echo "=========================================="
echo ""

for volume in "${VOLUMES[@]}"; do
    IFS=':' read -r count level <<< "$volume"
    
    echo ""
    echo "=========================================="
    echo "Volume Level: ${level} (${count} products)"
    echo "=========================================="
    echo ""
    
    # Seed database with volume data
    echo "Seeding database with ${count} products..."
    node performance-testing/data/seed-volume-data.js "${level}"
    
    # Verify seeding
    ACTUAL_COUNT=$(curl -s http://localhost:6060/api/v1/product/product-count | grep -o '"total":[0-9]*' | grep -o '[0-9]*' || echo "0")
    echo "✓ Database seeded with ${ACTUAL_COUNT} products"
    echo ""
    
    # Run JMeter test
    RESULT_FILE="${RESULTS_DIR}/${level}-${count}.jtl"
    REPORT_DIR="${RESULTS_DIR}/${level}-${count}-report"
    
    echo "Running JMeter test for ${level} volume..."
    jmeter -n \
      -t performance-testing/scenarios/volume-testing/volume-test.jmx \
      -l "${RESULT_FILE}" \
      -e \
      -o "${REPORT_DIR}" \
      -Jvolume_level="${level}" \
      -Jproduct_count="${count}"
    
    echo "✓ Completed ${level} volume test"
    echo "  Results: ${RESULT_FILE}"
    echo "  Report: ${REPORT_DIR}/index.html"
done

echo ""
echo "=========================================="
echo "All Volume Tests Completed!"
echo "=========================================="
echo ""
echo "Results saved to: ${RESULTS_DIR}"
echo ""
echo "Summary of tests:"
for volume in "${VOLUMES[@]}"; do
    IFS=':' read -r count level <<< "$volume"
    echo "  - ${level} (${count} products): ${RESULTS_DIR}/${level}-${count}-report/index.html"
done
echo ""
echo "Next steps:"
echo "  1. Compare response times across volume levels"
echo "  2. Create graphs showing response time vs. data volume"
echo "  3. Identify performance degradation thresholds"
echo ""