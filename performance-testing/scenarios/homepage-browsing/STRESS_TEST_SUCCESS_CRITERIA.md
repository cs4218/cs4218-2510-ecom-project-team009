# Stress Test Success Criteria - Homepage Browsing Flow

## Test Overview
**Scenario**: Homepage Browsing (Categories → Products → Product Images)
**Test Type**: Progressive Stress Test
**Load Pattern**: 50 → 150 → 300 → 500 → 750 → 1000 concurrent users over 30 minutes
**Test Duration**: 30 minutes (6 phases × 5 minutes each)

---

## 1. Performance SLAs (Service Level Agreements)

### Response Time Targets

| Phase | Users | p50 (Median) | p95 | p99 | Max Acceptable |
|-------|-------|--------------|-----|-----|----------------|
| **Phase 1-2** (Baseline) | 50-150 | < 200ms | < 500ms | < 1000ms | 1500ms |
| **Phase 3-4** (Moderate Stress) | 300-500 | < 500ms | < 1500ms | < 2500ms | 3000ms |
| **Phase 5-6** (High Stress) | 750-1000 | < 1000ms | < 3000ms | < 5000ms | 8000ms |

**Note**: Image requests (GET Product Photo) allowed 2x higher response times

### Throughput Targets

| Phase | Users | Min Requests/sec | Target Requests/sec |
|-------|-------|------------------|---------------------|
| Phase 1 | 50 | 20 req/s | 25 req/s |
| Phase 2 | 150 | 60 req/s | 75 req/s |
| Phase 3 | 300 | 120 req/s | 150 req/s |
| Phase 4 | 500 | 200 req/s | 250 req/s |
| Phase 5 | 750 | 300 req/s | 375 req/s |
| Phase 6 | 1000 | 400 req/s | 500 req/s |

---

## 2. Error Rate Thresholds

### Acceptable Error Rates

| Error Rate | Status | Action Required |
|------------|--------|-----------------|
| **0% - 1%** | ✅ **PASS** | System performing well |
| **1% - 5%** | ⚠️ **MARGINAL** | Investigate bottlenecks, acceptable for high stress phases |
| **5% - 10%** | ❌ **FAIL** | Critical issues, optimization required |
| **> 10%** | 🔴 **CRITICAL FAIL** | System breaking down, immediate action required |

### Error Rate by Phase

| Phase | Users | Maximum Acceptable Error Rate |
|-------|-------|-------------------------------|
| Phase 1-2 | 50-150 | **0%** (baseline must be error-free) |
| Phase 3-4 | 300-500 | **< 2%** (minimal errors acceptable) |
| Phase 5-6 | 750-1000 | **< 5%** (stress conditions, some errors expected) |

---

## 3. Breaking Point Definition

### What Constitutes a "Breaking Point"?

The breaking point is identified when **ANY** of the following occur:

1. **Error Rate ≥ 5%** for 3+ consecutive minutes
2. **p95 Response Time > 5000ms** (5 seconds) sustained
3. **p99 Response Time > 10000ms** (10 seconds)
4. **Server crashes** or becomes unresponsive (HTTP 5xx errors > 10%)
5. **Throughput degrades** by > 50% from previous phase
6. **Connection timeouts** exceed 2% of requests

### Expected Breaking Point Range

**Target**: System should handle **500-750 users** before breaking
- ✅ **Excellent**: Breaking point at 750+ users
- ✅ **Good**: Breaking point at 500-750 users
- ⚠️ **Acceptable**: Breaking point at 300-500 users
- ❌ **Poor**: Breaking point < 300 users

---

## 4. System Stability Criteria

### No Critical Failures

| Criteria | Requirement | Monitoring Method |
|----------|-------------|-------------------|
| **Server Uptime** | Must remain responsive for entire 30 minutes | `curl http://localhost:6060/api/v1/product/product-count` |
| **No Crashes** | Zero application restarts required | Monitor process with `top -pid $(lsof -ti:6060)` |
| **No Memory Leaks** | Memory usage increases < 20% per phase | Monitor RSS memory with `top` |
| **Database Connections** | MongoDB connections < 500 simultaneous | `mongosh --eval "db.serverStatus().connections"` |
| **No Data Corruption** | Product count remains 50 throughout test | Verify with `/api/v1/product/product-count` |

---

## 5. Pass/Fail Criteria

### Overall Test Result

**PASS** if ALL of the following are true:
- ✅ Phase 1-2 (50-150 users) have **0% error rate**
- ✅ Phase 1-3 (50-300 users) meet **p95 < 1500ms**
- ✅ Error rate never exceeds **5%** across all phases
- ✅ Breaking point occurs at **≥ 300 users**
- ✅ No server crashes or critical failures
- ✅ No data corruption (product count remains 50)

**MARGINAL PASS** if ALL of the following are true:
- ✅ Phase 1-2 (50-150 users) have **< 1% error rate**
- ✅ Phase 1-3 (50-300 users) meet **p95 < 2500ms**
- ✅ Error rate never exceeds **10%**
- ✅ Breaking point occurs at **≥ 150 users**
- ⚠️ May have minor issues but system remains stable

**FAIL** if ANY of the following occur:
- ❌ Phase 1-2 (baseline) have **> 1% error rate**
- ❌ Error rate exceeds **10%** at any phase
- ❌ Breaking point occurs at **< 150 users**
- ❌ Server crashes or requires restart
- ❌ Data corruption detected

---

## 6. Assertion-Based Success Tracking

### JMeter Assertions Configured

All HTTP requests include the following automatic validations:

#### Response Code Assertion
- **Expected**: HTTP 200
- **Action on Failure**: Mark sample as failed (increases error %)

#### Duration Assertion
- **GET Categories**: < 500ms
- **GET Products**: < 500ms
- **GET Product Photo**: < 1000ms (images allowed more time)
- **Action on Failure**: Mark sample as failed if response time exceeds threshold

### How Assertions Impact Results

- **Failed Assertions** → Counted as **errors** in JMeter reports
- Use **Error %** column in Summary Report to track assertion failures
- Breaking point = when **error % ≥ 5%** sustained for 3+ minutes

---

## 7. Reporting Requirements

### Minimum Data to Report

Your stress test report MUST include:

1. **Test Configuration Summary**
   - Date/time of test execution
   - Duration: 30 minutes
   - Load pattern: 50 → 1000 users
   - JMX file: `stress-test.jmx`

2. **Results by Phase** (table format)
   - Users per phase
   - Throughput (req/s)
   - Error rate (%)
   - Response times (p50, p95, p99)

3. **Breaking Point Analysis**
   - At what user count did the system break? (if applicable)
   - What was the failure symptom? (error rate, response time, crash)
   - Which endpoint failed first? (Categories, Products, or Photos)

4. **Bottleneck Identification**
   - CPU utilization during peak load
   - Memory usage trend
   - Database connection count
   - Disk I/O (if applicable)

5. **Pass/Fail Verdict**
   - Final verdict: PASS / MARGINAL PASS / FAIL
   - Justification based on criteria above
   - Recommendations for improvement

### Example Verdict Statement

> **Verdict: PASS**
>
> The system successfully handled 500 concurrent users with 0% error rate and p95 response time of 1200ms. Breaking point occurred at 750 users when error rate reached 6% (categories endpoint timing out). Phase 1-3 (50-300 users) met all SLA requirements. No server crashes or data corruption detected.
>
> **Recommendation**: Optimize category retrieval query (add database index on `slug` field) to improve performance under high load.

---

## 8. Success Criteria Checklist

Use this checklist when analyzing test results:

### Baseline Performance (Phase 1-2: 50-150 Users)
- [ ] Error rate = 0%
- [ ] p95 response time < 500ms
- [ ] Throughput ≥ 60 req/s (Phase 2)
- [ ] No server errors (5xx responses)

### Moderate Stress (Phase 3-4: 300-500 Users)
- [ ] Error rate < 2%
- [ ] p95 response time < 1500ms
- [ ] Throughput ≥ 200 req/s (Phase 4)
- [ ] Server remains stable (no crashes)

### High Stress (Phase 5-6: 750-1000 Users)
- [ ] Error rate < 5% (breaking point may occur here)
- [ ] p95 response time < 3000ms
- [ ] Throughput ≥ 300 req/s (Phase 5)
- [ ] Identify breaking point user count

### System Stability
- [ ] No application crashes or restarts
- [ ] No memory leaks (< 20% memory increase per phase)
- [ ] Database connections < 500
- [ ] Product count remains 50 (no data corruption)

### Breaking Point Analysis
- [ ] Breaking point identified at ≥ 300 users
- [ ] Breaking point cause documented (error rate, timeout, crash)
- [ ] Bottleneck identified (CPU, DB, network, etc.)

### Final Verdict
- [ ] Overall result: PASS / MARGINAL PASS / FAIL
- [ ] Justification documented
- [ ] Recommendations provided

---

## 9. Next Steps After Test Completion

1. **Open HTML Report**: `open performance-testing/reports/stress-progressive-TIMESTAMP/index.html`
2. **Review Summary Report**: Check error %, throughput, response times
3. **Analyze Response Time Trends**: Look for degradation points in graphs
4. **Identify Bottlenecks**: Review monitoring data (CPU, memory, DB connections)
5. **Document Findings**: Use `STRESS_TEST_RESULTS_TEMPLATE.md` (if available)
6. **Make Recommendations**: Suggest optimizations based on bottlenecks found

---

## 10. Common Issues and Troubleshooting

### If Error Rate is High (> 5%)

**Possible Causes**:
- Database query performance (missing indexes)
- Insufficient database connections (MongoDB connection pool too small)
- CPU bottleneck (insufficient server resources)
- Network timeouts (keepalive settings)

**Investigation Steps**:
1. Check which endpoint has highest error rate (Categories, Products, or Photos)
2. Review backend logs for error messages
3. Check MongoDB slow query log
4. Monitor CPU and memory usage during peak load

### If Response Times Are Slow (p95 > 3000ms)

**Possible Causes**:
- Unoptimized database queries (no indexes)
- Large payload sizes (images too large)
- Insufficient server resources (CPU, RAM)
- Database connection exhaustion

**Investigation Steps**:
1. Profile database queries with MongoDB explain
2. Check image sizes (should be ~100-200 bytes for 1×1 PNG placeholders)
3. Verify server has adequate CPU/RAM (recommend 4+ CPU cores, 8GB RAM)
4. Check database connection pool configuration

### If Server Crashes

**Possible Causes**:
- Memory leak (not releasing resources)
- Uncaught exceptions in code
- Database connection exhaustion
- Event loop blocking (synchronous operations)

**Investigation Steps**:
1. Review server logs for crash messages
2. Check for memory leaks with `top` (RSS memory)
3. Verify error handling in route controllers
4. Add more logging to identify crash trigger

---

## References

- JMeter Test Plan: `performance-testing/scenarios/homepage-browsing/stress-test.jmx`
- Run Script: `performance-testing/scenarios/homepage-browsing/run-stress-test.sh`
- Monitoring Guide: `performance-testing/MONITORING_GUIDE.md` (if exists)
- Results Template: `performance-testing/STRESS_TEST_RESULTS_TEMPLATE.md` (if exists)

---

**Last Updated**: 2025-11-05
**Author**: CS4218 Team
**Test Version**: 1.0
