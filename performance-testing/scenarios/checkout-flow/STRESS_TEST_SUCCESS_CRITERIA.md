# Stress Test Success Criteria - Checkout Flow

## Test Overview
**Scenario**: Checkout Flow (Login → Get Payment Token → Process Payment)
**Test Type**: Write-Heavy Stress Test
**Load Pattern**: 10 → 25 → 50 → 100 → 150 → 200 concurrent users over 18 minutes
**Test Duration**: 18 minutes (6 phases × 3 minutes each)

---

## 1. Performance SLAs (Service Level Agreements)

### Response Time Targets

| Phase | Users | p50 (Median) | p95 | p99 | Max Acceptable |
|-------|-------|--------------|-----|-----|----------------|
| **Phase 1-2** (Baseline) | 10-25 | < 300ms | < 500ms | < 1000ms | 1500ms |
| **Phase 3-4** (Moderate Stress) | 50-100 | < 500ms | < 1500ms | < 3000ms | 4000ms |
| **Phase 5-6** (High Stress) | 150-200 | < 1000ms | < 3000ms | < 6000ms | 10000ms |

**Note**: Payment requests (POST /braintree/payment) allowed up to 3000ms response time due to external Braintree API

### Response Time Targets by Endpoint

| Endpoint | Baseline (10-25 users) | Moderate Stress (50-100 users) | High Stress (150-200 users) |
|----------|----------------------|------------------------------|---------------------------|
| **POST Login** | < 500ms | < 1000ms | < 2000ms |
| **GET Braintree Token** | < 1000ms | < 2000ms | < 3000ms |
| **POST Payment** | < 3000ms | < 5000ms | < 8000ms |

### Throughput Targets

| Phase | Users | Min Orders/min | Target Orders/min |
|-------|-------|----------------|-------------------|
| Phase 1 | 10 | 10 orders/min | 12 orders/min |
| Phase 2 | 25 | 20 orders/min | 25 orders/min |
| Phase 3 | 50 | 30 orders/min | 40 orders/min |
| Phase 4 | 100 | 50 orders/min | 60 orders/min |
| Phase 5 | 150 | 60 orders/min | 75 orders/min |
| Phase 6 | 200 | 70 orders/min | 80 orders/min |

---

## 2. Error Rate Thresholds

### Acceptable Error Rates

| Error Rate | Status | Action Required |
|------------|--------|-----------------|
| **0% - 1%** | ✅ **PASS** | System performing well |
| **1% - 2%** | ✅ **ACCEPTABLE** | Minor issues, within tolerance (external API dependency) |
| **2% - 5%** | ⚠️ **MARGINAL** | Investigate bottlenecks, acceptable for high stress phases |
| **5% - 10%** | ❌ **FAIL** | Critical issues, optimization required |
| **> 10%** | 🔴 **CRITICAL FAIL** | System breaking down, immediate action required |

**Note**: Higher error tolerance (2% vs 0%) due to Braintree sandbox API rate limits

### Error Rate by Phase

| Phase | Users | Maximum Acceptable Error Rate |
|-------|-------|-------------------------------|
| Phase 1-2 | 10-25 | **< 1%** (baseline should be nearly error-free) |
| Phase 3-4 | 50-100 | **< 2%** (minimal errors acceptable) |
| Phase 5-6 | 150-200 | **< 5%** (stress conditions, some errors expected) |

---

## 3. Breaking Point Definition

### What Constitutes a "Breaking Point"?

The breaking point is identified when **ANY** of the following occur:

1. **Error Rate ≥ 5%** for 2+ consecutive minutes
2. **p95 Response Time > 5000ms** (5 seconds) sustained for login/token requests
3. **p95 Response Time > 8000ms** (8 seconds) for payment requests
4. **Server crashes** or becomes unresponsive (HTTP 5xx errors > 10%)
5. **Throughput degrades** by > 50% from previous phase
6. **Connection timeouts** exceed 2% of requests
7. **Braintree API rate limit** exceeded (expect at 50-100 concurrent transactions/sec)

### Expected Breaking Point Range

**Target**: System should handle **100-150 users** before breaking (write-heavy operations)

- ✅ **Excellent**: Breaking point at 150+ users
- ✅ **Good**: Breaking point at 100-150 users
- ⚠️ **Acceptable**: Breaking point at 50-100 users
- ❌ **Poor**: Breaking point < 50 users

**Rationale**: Checkout flow is write-heavy (order creation, payment processing) vs homepage browsing (read-heavy), so breaking point expected at lower user count.

---

## 4. System Stability Criteria

### No Critical Failures

| Criteria | Requirement | Monitoring Method |
|----------|-------------|-------------------|
| **Server Uptime** | Must remain responsive for entire 18 minutes | `curl http://localhost:8080/api/v1/product/product-count` |
| **No Crashes** | Zero application restarts required | Monitor process with `top -pid $(lsof -ti:8080)` |
| **No Memory Leaks** | Memory usage increases < 30% per phase | Monitor RSS memory with `top` |
| **Database Connections** | MongoDB connections < 500 simultaneous | `mongosh --eval "db.serverStatus().connections"` |
| **No Data Corruption** | Order count increases correctly | `mongosh virtual-vault --eval "db.orders.countDocuments({})"` |
| **Braintree API Health** | Braintree token requests succeed > 95% | Check Braintree sandbox logs |

---

## 5. Pass/Fail Criteria

### Overall Test Result

**PASS** if ALL of the following are true:
- ✅ Phase 1-2 (10-25 users) have **< 1% error rate**
- ✅ Phase 1-3 (10-50 users) meet **p95 < 1500ms**
- ✅ Error rate never exceeds **5%** across all phases
- ✅ Breaking point occurs at **≥ 50 users**
- ✅ No server crashes or critical failures
- ✅ Orders created successfully (verify database integrity)
- ✅ Payment endpoint p95 < 3000ms for phases 1-2

**MARGINAL PASS** if ALL of the following are true:
- ✅ Phase 1-2 (10-25 users) have **< 2% error rate**
- ✅ Phase 1-3 (10-50 users) meet **p95 < 2500ms**
- ✅ Error rate never exceeds **10%**
- ✅ Breaking point occurs at **≥ 25 users**
- ⚠️ May have minor Braintree API issues but system remains stable

**FAIL** if ANY of the following occur:
- ❌ Phase 1-2 (baseline) have **> 2% error rate**
- ❌ Error rate exceeds **10%** at any phase
- ❌ Breaking point occurs at **< 25 users**
- ❌ Server crashes or requires restart
- ❌ Data corruption detected (duplicate orders, failed transactions with created orders)
- ❌ Payment endpoint p95 > 5000ms at baseline (10-25 users)

---

## 6. Assertion-Based Success Tracking

### JMeter Assertions Configured

All HTTP requests include the following automatic validations:

#### Response Code Assertion
- **Expected**: HTTP 200
- **Action on Failure**: Mark sample as failed (increases error %)

#### Duration Assertion
- **POST Login**: < 500ms
- **GET Braintree Token**: < 1000ms
- **POST Payment**: < 3000ms (external API tolerance)
- **Action on Failure**: Mark sample as failed if response time exceeds threshold

#### JSON Assertions (Functional Validation)
- **Login Response**: Verify `$.token` exists
- **Token Response**: Verify `$.clientToken` exists
- **Payment Response**: Verify `$.success = true` or `$.ok = true`

### How Assertions Impact Results

- **Failed Assertions** → Counted as **errors** in JMeter reports
- Use **Error %** column in Summary Report to track assertion failures
- Breaking point = when **error % ≥ 5%** sustained for 2+ minutes

---

## 7. Reporting Requirements

### Minimum Data to Report

Your stress test report MUST include:

1. **Test Configuration Summary**
   - Date/time of test execution
   - Duration: 18 minutes
   - Load pattern: 10 → 200 users (6 phases × 3 minutes)
   - JMX file: `stress-test.jmx`
   - Test users: 200 users (testuser1@example.com to testuser200@example.com)

2. **Results by Phase** (table format)
   - Users per phase
   - Throughput (orders/min)
   - Error rate (%)
   - Response times by endpoint (p50, p95, p99)

3. **Breaking Point Analysis**
   - At what user count did the system break? (if applicable)
   - What was the failure symptom? (error rate, response time, crash, Braintree limit)
   - Which endpoint failed first? (Login, Token, or Payment)

4. **Bottleneck Identification**
   - CPU utilization during peak load
   - Memory usage trend
   - Database connection count
   - Database write performance (orders/sec)
   - Braintree API latency trend

5. **Database Integrity Verification**
   - Total orders created during test
   - No duplicate orders detected
   - No orphaned transactions (payment succeeded but order creation failed)
   - Sample query: `db.orders.countDocuments({})` before/after test

6. **Comparison with Homepage Browsing Test**
   - Breaking point difference (expected: checkout < homepage)
   - Throughput comparison (orders/min vs pages/min)
   - Response time comparison (write-heavy vs read-heavy)

7. **Pass/Fail Verdict**
   - Final verdict: PASS / MARGINAL PASS / FAIL
   - Justification based on criteria above
   - Recommendations for improvement

### Example Verdict Statement

> **Verdict: PASS**
>
> The system successfully handled 100 concurrent checkout sessions with 1.2% error rate and p95 response time of 1800ms (login: 450ms, token: 900ms, payment: 2400ms). Breaking point occurred at 150 users when error rate reached 6% due to Braintree API rate limiting. Phase 1-3 (10-50 users) met all SLA requirements. No server crashes or data corruption detected. 14,280 orders created successfully during the 18-minute test.
>
> **Recommendations**:
> 1. Implement Braintree API request queuing to handle rate limits gracefully
> 2. Add database write optimization (connection pooling from 10 to 20)
> 3. Consider async order creation with job queue for >100 concurrent users

---

## 8. Success Criteria Checklist

Use this checklist when analyzing test results:

### Baseline Performance (Phase 1-2: 10-25 Users)
- [ ] Error rate < 1%
- [ ] Login p95 < 500ms
- [ ] Token p95 < 1000ms
- [ ] Payment p95 < 3000ms
- [ ] Throughput ≥ 20 orders/min (Phase 2)
- [ ] No server errors (5xx responses)

### Moderate Stress (Phase 3-4: 50-100 Users)
- [ ] Error rate < 2%
- [ ] Login p95 < 1000ms
- [ ] Token p95 < 2000ms
- [ ] Payment p95 < 5000ms
- [ ] Throughput ≥ 50 orders/min (Phase 4)
- [ ] Server remains stable (no crashes)
- [ ] Database write performance acceptable

### High Stress (Phase 5-6: 150-200 Users)
- [ ] Error rate < 5% (breaking point may occur here)
- [ ] Login p95 < 2000ms
- [ ] Token p95 < 3000ms
- [ ] Payment p95 < 8000ms
- [ ] Throughput ≥ 60 orders/min (Phase 5)
- [ ] Identify breaking point user count
- [ ] Braintree API rate limit behavior documented

### System Stability
- [ ] No application crashes or restarts
- [ ] No memory leaks (< 30% memory increase per phase)
- [ ] Database connections < 500
- [ ] Database integrity maintained (no duplicate/orphaned orders)
- [ ] JWT token generation performance acceptable

### Breaking Point Analysis
- [ ] Breaking point identified at ≥ 50 users
- [ ] Breaking point cause documented (Braintree API, DB write, CPU, etc.)
- [ ] Bottleneck identified (payment API, database write contention, JWT generation)

### Database Integrity
- [ ] Order count matches expected (number of successful payments)
- [ ] No duplicate orders created
- [ ] No failed transactions with created orders (transactional integrity)
- [ ] Sample verification query executed

### Final Verdict
- [ ] Overall result: PASS / MARGINAL PASS / FAIL
- [ ] Justification documented
- [ ] Comparison with homepage browsing test included
- [ ] Recommendations provided

---

## 9. Next Steps After Test Completion

1. **Open HTML Report**: `open performance-testing/reports/checkout-stress-TIMESTAMP/index.html`
2. **Review Summary Report**: Check error %, throughput, response times by endpoint
3. **Analyze Response Time Trends**: Look for degradation points in graphs
4. **Verify Database Integrity**: Count orders created, check for duplicates
5. **Identify Bottlenecks**: Review monitoring data (CPU, memory, DB connections, Braintree API)
6. **Compare with Homepage Test**: Contrast read-heavy vs write-heavy performance
7. **Document Findings**: Use template or create summary report
8. **Make Recommendations**: Suggest optimizations (connection pooling, async processing, caching)

---

## 10. Common Issues and Troubleshooting

### If Error Rate is High (> 5%)

**Possible Causes**:
- Braintree API rate limiting (sandbox has lower limits than production)
- Database write contention (order creation bottleneck)
- JWT token generation overhead (BCrypt CPU-intensive)
- MongoDB connection pool exhaustion
- Payment transaction rollback issues

**Investigation Steps**:
1. Check which endpoint has highest error rate (Login, Token, or Payment)
2. Review Braintree sandbox logs for rate limit errors
3. Check MongoDB slow query log for write operations
4. Monitor CPU usage during login (BCrypt password hashing)
5. Verify database connection pool configuration

### If Response Times Are Slow (p95 > 5000ms)

**Possible Causes**:
- Braintree payment API latency (external dependency)
- Database write lock contention (concurrent order creation)
- Insufficient database indexes (buyer, status fields)
- JWT token generation overhead
- Database connection pool too small

**Investigation Steps**:
1. Profile Braintree API response times separately
2. Check database write performance with MongoDB profiler
3. Verify indexes on `orders` collection (buyer, status, createdAt)
4. Monitor JWT generation time (should be < 100ms)
5. Increase database connection pool size (default 10 → 20)

### If Server Crashes

**Possible Causes**:
- Memory leak in payment processing
- Uncaught exceptions in order creation
- Database connection exhaustion
- Braintree API timeout handling

**Investigation Steps**:
1. Review server logs for crash messages around payment processing
2. Check for memory leaks with `top` (RSS memory)
3. Verify error handling in `brainTreePaymentController`
4. Add more logging to order creation flow
5. Check Braintree SDK error handling

### If Braintree API Fails

**Possible Causes**:
- Sandbox rate limit exceeded (50-100 req/sec)
- Invalid `fake-valid-nonce` configuration
- Braintree credentials misconfigured
- Network timeout to Braintree servers

**Investigation Steps**:
1. Verify Braintree credentials in `.env`
2. Test manual checkout to confirm Braintree setup
3. Check Braintree sandbox dashboard for rate limit notifications
4. Consider implementing retry logic for transient failures
5. Add Braintree API request queuing for high concurrency

### If Database Integrity Issues

**Possible Causes**:
- Race conditions in order creation
- Failed transaction rollback (payment succeeded but order creation failed)
- Duplicate order creation on retry
- Network interruption during write

**Investigation Steps**:
1. Query for duplicate orders: `db.orders.aggregate([{$group: {_id: "$buyer", count: {$sum: 1}}}, {$match: {count: {$gt: 1}}}])`
2. Check for orphaned payments (Braintree transaction without order)
3. Verify transactional integrity in `brainTreePaymentController`
4. Add unique constraints or idempotency keys
5. Implement two-phase commit if necessary

---

## 11. Advanced Analysis Points

### Transaction Success Rate by Phase

Track these metrics per phase:

| Phase | Users | Total Payments | Successful | Failed | Success Rate |
|-------|-------|----------------|------------|--------|--------------|
| Phase 1 | 10 | ~120 | ? | ? | ? % |
| Phase 2 | 25 | ~300 | ? | ? | ? % |
| Phase 3 | 50 | ~600 | ? | ? | ? % |
| Phase 4 | 100 | ~900 | ? | ? | ? % |
| Phase 5 | 150 | ~1200 | ? | ? | ? % |
| Phase 6 | 200 | ~1500 | ? | ? | ? % |

### Response Time Distribution

Compare p50, p95, p99 across phases to identify non-linear degradation:

**Linear Degradation** (acceptable):
- User count doubles → Response time doubles

**Exponential Degradation** (bottleneck):
- User count doubles → Response time 3-4x increase

### Throughput Saturation

Monitor if throughput plateaus or declines:

**Healthy System**:
- Throughput increases with user count (up to breaking point)

**Saturated System**:
- Throughput plateaus despite increased users
- Indicates resource exhaustion (CPU, DB, API limit)

---

## 12. Learning Outcomes

### Read-Heavy vs Write-Heavy Comparison

**Homepage Browsing (Read-Heavy)**:
- Expected breaking point: 500-750 users
- Response time target: p95 < 1500ms
- Bottleneck: Image serving, database read queries

**Checkout Flow (Write-Heavy)**:
- Expected breaking point: 100-150 users (lower)
- Response time target: p95 < 3000ms (higher, due to external API)
- Bottleneck: Braintree API, database write contention, JWT generation

### Key Insights

1. **Write operations require different scaling strategies** than read operations
2. **External API dependencies** introduce latency and rate limit constraints
3. **Database write contention** becomes bottleneck at lower concurrency than reads
4. **Transactional integrity** is critical for payment flows (cannot lose orders)
5. **Async processing** recommended for write-heavy operations at scale

---

## References

- Test Plan: `performance-testing/scenarios/checkout-flow/STRESS_TEST_PLAN.md`
- JMeter Test Plan: `performance-testing/scenarios/checkout-flow/stress-test.jmx`
- Run Script: `performance-testing/scenarios/checkout-flow/run-stress-test.sh`
- User Seed Script: `performance-testing/data/seed-checkout-users.js`
- Comparison Test: `performance-testing/scenarios/homepage-browsing/STRESS_TEST_SUCCESS_CRITERIA.md`

---

**Last Updated**: 2025-11-08
**Author**: CS4218 Team
**Test Version**: 1.0
