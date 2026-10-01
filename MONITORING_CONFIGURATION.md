# Batch Transfer Modal - Production Monitoring & Alerting

## Overview

This guide sets up comprehensive monitoring for the batch transfer modal feature in production.

---

## 📊 Key Metrics to Track

### Success Metrics

```typescript
// Events to log for success tracking
trackEvent('batch_transfer_initiated', {
  recipient_count: number;
  total_quantity: number;
  timestamp: ISO8601;
  user_id: string;
});

trackEvent('batch_transfer_submitted', {
  recipient_count: number;
  total_quantity: number;
  timestamp: ISO8601;
});

trackEvent('batch_transfer_completed', {
  recipient_count: number;
  total_quantity: number;
  duration_ms: number;
  tx_hash?: string;
  timestamp: ISO8601;
});
```

### Error Metrics

```typescript
// Events to log for error tracking
trackEvent('batch_transfer_failed', {
  error_type: string;
  error_message: string;
  recipient_count: number;
  total_quantity: number;
  failure_point: 'validation' | 'submission' | 'contract';
  timestamp: ISO8601;
});

trackEvent('batch_transfer_validation_error', {
  error_type: 'invalid_address' | 'invalid_quantity' | 'insufficient_balance';
  row_index: number;
  timestamp: ISO8601;
});
```

---

## 🎯 Monitoring Dashboards

### Dashboard 1: Real-Time Operations

**Metrics**:

- Total transfers initiated (today)
- Total transfers completed (today)
- Completion rate (%)
- Average recipients per transfer
- Average quantity per transfer
- Error rate (%)
- Average response time (ms)

**Update Frequency**: Real-time (refresh every 10s)

**Alert Thresholds**:

- 🔴 Error rate > 5% → Critical alert
- 🔴 Completion rate < 90% → Critical alert
- 🟡 Response time > 5000ms → Warning alert
- 🟡 Error rate > 2% → Warning alert

---

### Dashboard 2: Error Analysis

**Metrics**:

- Errors by type (validation, network, contract)
- Errors by hour
- Failed transfers by recipient count
- Validation errors trend
- Submission errors trend

**Update Frequency**: Every 5 minutes

**Alert Thresholds**:

- 🔴 New error type detected → Investigation alert
- 🔴 Error spike (2x normal) → Alert
- 🟡 Specific error > 50% of total → Warning

---

### Dashboard 3: Performance Monitoring

**Metrics**:

- Modal open time (p50, p95, p99)
- Validation time (p50, p95, p99)
- Network request time (p50, p95, p99)
- Total submit time (p50, p95, p99)
- Memory usage
- CPU usage

**Update Frequency**: Every minute

**Alert Thresholds**:

- 🔴 p99 response time > 10s → Critical
- 🔴 Memory leak detected (increasing over time) → Alert
- 🟡 p95 response time > 5s → Warning
- 🟡 p50 response time > 2s → Info

---

### Dashboard 4: User Behavior

**Metrics**:

- Daily active users using feature
- Weekly active users using feature
- Average transfers per user per day
- Repeat user rate (%)
- Feature adoption trend

**Update Frequency**: Every hour

**Alert Thresholds**:

- 🟡 Adoption rate declining > 10% → Review alert
- 🟡 Daily active users drop > 20% → Investigation

---

## 🔔 Alert Configuration

### Critical Alerts (Page on-call engineer)

```yaml
alerts:
   - name: 'Error Rate Critical'
     condition: error_rate > 5%
     duration: 5 minutes
     action: page_oncall_now
     severity: critical

   - name: 'Completion Rate Critical'
     condition: completion_rate < 90%
     duration: 5 minutes
     action: page_oncall_now
     severity: critical

   - name: 'Service Unavailable'
     condition: response_time > 30000
     duration: 2 minutes
     action: page_oncall_now
     severity: critical

   - name: 'Database Connection Failure'
     condition: db_connection_errors > 10
     duration: 1 minute
     action: page_oncall_now
     severity: critical
```

### Warning Alerts (Notify on Slack)

```yaml
alerts:
   - name: 'High Error Rate'
     condition: error_rate > 2%
     duration: 10 minutes
     action: slack_alert
     severity: warning
     channel: '#batch-transfer-alerts'

   - name: 'Slow Response Time'
     condition: p95_response_time > 5000
     duration: 10 minutes
     action: slack_alert
     severity: warning

   - name: 'High Memory Usage'
     condition: memory_usage > 80%
     duration: 5 minutes
     action: slack_alert
     severity: warning

   - name: 'Contract Rate Limit'
     condition: rate_limit_errors > 5
     duration: 1 hour
     action: slack_alert
     severity: warning
```

### Info Alerts (Log only)

```yaml
alerts:
   - name: 'Unusual Transfer Pattern'
     condition: avg_quantity > 2x_normal
     duration: 1 hour
     action: log_only
     severity: info

   - name: 'New Feature Usage'
     condition: csv_import_used_first_time
     duration: N/A
     action: log_only
     severity: info
```

---

## 📝 Logging Configuration

### Structured Logging Format

```json
{
	"timestamp": "2026-08-28T14:30:00Z",
	"level": "info|warn|error|debug",
	"service": "batch-transfer",
	"event": "batch_transfer_initiated",
	"user_id": "user123",
	"request_id": "req-abc123",
	"data": {
		"recipient_count": 5,
		"total_quantity": 50,
		"creator_id": "creator1"
	},
	"duration_ms": 125,
	"status": "success|failure",
	"error": {
		"code": "VALIDATION_ERROR",
		"message": "Invalid recipient address"
	}
}
```

### Log Levels

**DEBUG** - Development only

```typescript
console.debug('[batch-transfer-debug]', {
	rows: rows,
	validation_state: { totalQuantity, rowErrors, isValid },
	isSubmitting: isSubmitting,
});
```

**INFO** - Important events

```typescript
console.log('[batch-transfer-initiated]', {
	recipient_count: rows.length,
	total_quantity: totalQuantity,
	timestamp: new Date().toISOString(),
});
```

**WARN** - Warnings, edge cases

```typescript
console.warn('[batch-transfer-warning]', {
	message: 'Near maximum recipients',
	recipient_count: rows.length,
	max_recipients: MAX_RECIPIENTS,
});
```

**ERROR** - Failures, exceptions

```typescript
console.error('[batch-transfer-failed]', {
	error_type: error.name,
	error_message: error.message,
	recipient_count: rows.length,
	total_quantity: totalQuantity,
	stack: error.stack,
});
```

---

## 🔍 Log Aggregation

### Set Up ELK Stack (Elasticsearch, Logstash, Kibana)

**Step 1**: Ship logs to Elasticsearch

```javascript
// In your error handler
logToElasticsearch({
	index: 'batch-transfer-logs',
	type: '_doc',
	body: {
		timestamp: new Date(),
		event: 'batch_transfer_failed',
		error_type: error.name,
		user_id: userId,
		...otherData,
	},
});
```

**Step 2**: Create Kibana dashboards

- Dashboard 1: Real-time operations
- Dashboard 2: Error analysis
- Dashboard 3: Performance monitoring
- Dashboard 4: User behavior

**Step 3**: Set up alerts

- Alerts fire when thresholds exceeded
- Route to appropriate channels (PagerDuty, Slack, etc.)

---

## 📊 Grafana Dashboards

### Dashboard Configuration

```yaml
# dashboard.yaml
apiVersion: v1
kind: ConfigMap
metadata:
   name: batch-transfer-dashboard
data:
   dashboard.json: |
      {
        "dashboard": {
          "title": "Batch Transfer Modal - Production",
          "panels": [
            {
              "title": "Total Transfers (Today)",
              "targets": [
                { "expr": "sum(batch_transfer_initiated_total)" }
              ]
            },
            {
              "title": "Error Rate",
              "targets": [
                { "expr": "rate(batch_transfer_errors_total[5m])" }
              ]
            },
            {
              "title": "Average Response Time",
              "targets": [
                { "expr": "avg(batch_transfer_duration_ms)" }
              ]
            },
            {
              "title": "Success Rate",
              "targets": [
                { "expr": "success_rate(batch_transfer)" }
              ]
            }
          ]
        }
      }
```

---

## 🚨 Incident Response

### When Alert Fires

**Tier 1: On-Call Engineer (Critical)**

1. **Acknowledge** alert in PagerDuty (< 2 min)
2. **Assess** severity (5 min)
3. **Communicate** to #incidents channel
4. **Investigate** root cause (15 min)
5. **Implement** fix or rollback (30 min)
6. **Monitor** for stability (30 min)
7. **Document** incident (15 min)

**Tier 2: Team Lead (Warning)**

1. **Review** alert details
2. **Assess** if critical
3. **Communicate** if escalation needed
4. **Track** for next review meeting

**Tier 3: Development Team (Info)**

1. **Review** in next standup
2. **Add** to roadmap if needed
3. **Document** for future reference

---

## 💾 Data Retention

### Log Retention Policy

| Log Type          | Retention | Archive           |
| ----------------- | --------- | ----------------- |
| Real-time metrics | 24 hours  | 30 days in S3     |
| Application logs  | 7 days    | 90 days in S3     |
| Error logs        | 30 days   | 1 year in glacier |
| Debug logs        | 24 hours  | Not archived      |

### Query Examples

```sql
-- Find all errors for a user
SELECT * FROM logs
WHERE user_id = 'user123'
AND event LIKE 'batch_transfer%'
AND level = 'ERROR'
ORDER BY timestamp DESC;

-- Error rate by hour
SELECT hour, COUNT(*) as total,
  SUM(CASE WHEN status = 'failure' THEN 1 ELSE 0 END) as failures,
  (SUM(CASE WHEN status = 'failure' THEN 1 ELSE 0 END) / COUNT(*)) * 100 as error_rate
FROM logs
WHERE event = 'batch_transfer_submitted'
GROUP BY hour
ORDER BY hour DESC;

-- Slow requests
SELECT * FROM logs
WHERE event = 'batch_transfer_completed'
AND duration_ms > 5000
ORDER BY duration_ms DESC;
```

---

## 🔐 Security Monitoring

### Monitor for

- **Unusual transfer amounts** (far above normal)
- **Rapid transfers** from single user
- **Same recipient** many times in short period
- **Addresses from blacklist** (if applicable)
- **Failed validations** (potential attacks)

### Alerts

```yaml
security_alerts:
   - name: 'Suspicious Activity'
     condition: quantity > 100x_average_user
     action: notify_security
     severity: high

   - name: 'Potential Bot Activity'
     condition: transfers_per_minute > 100
     action: notify_security
     severity: high

   - name: 'Blacklist Address'
     condition: recipient_in_blacklist
     action: block_and_alert
     severity: critical
```

---

## 📈 SLA Targets

### Availability SLA

- **Uptime Target**: 99.9% (< 8.7 hours downtime/month)
- **Response Time Target**: p95 < 5 seconds
- **Error Rate Target**: < 0.5%
- **Deployment Frequency**: At least 2x per week

### Support SLA

- **Critical Issues**: Response < 15 min, Resolution < 1 hour
- **High Priority**: Response < 1 hour, Resolution < 4 hours
- **Medium Priority**: Response < 4 hours, Resolution < 24 hours
- **Low Priority**: Response < 24 hours, Resolution < 1 week

---

## 📊 Weekly Review Checklist

Every Monday, review:

- [ ] Error rate trend (up or down?)
- [ ] Performance trend (faster or slower?)
- [ ] User adoption trend (growing?)
- [ ] Any critical incidents
- [ ] Any warning alerts
- [ ] Infrastructure health
- [ ] Dependencies status
- [ ] Next week's goals

---

## 🎯 Monitoring Success Criteria

You'll know monitoring is working when:

✅ **Responsiveness**: Alerts fire before users notice issues  
✅ **Accuracy**: No false positives, no missed issues  
✅ **Dashboards**: Clear visibility into system health  
✅ **Incidents**: Rapid detection and response  
✅ **Trends**: Early warning of degradation  
✅ **SLA Compliance**: Consistently meet targets

---

## 📞 Emergency Contacts

| Role             | Name | Phone | Slack |
| ---------------- | ---- | ----- | ----- |
| On-Call Engineer | ___  | ___   | ___   |
| Team Lead        | ___  | ___   | ___   |
| DevOps Lead      | ___  | ___   | ___   |
| Security Team    | ___  | ___   | ___   |

---

## Conclusion

This monitoring configuration ensures:

- ✅ Real-time visibility into system health
- ✅ Rapid detection of issues
- ✅ Data-driven decision making
- ✅ SLA compliance
- ✅ Security monitoring
- ✅ User confidence

**Ready to monitor in production!** 🚀
