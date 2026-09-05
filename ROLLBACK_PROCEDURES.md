# Batch Transfer Modal - Rollback & Disaster Recovery Procedures

## Overview

This document provides comprehensive rollback procedures, disaster recovery plans, and decision trees for the batch transfer modal feature in production.

---

## 🚨 When to Rollback

### Decision Tree: Should We Rollback?

```
┌─────────────────────────────────────┐
│  CRITICAL ISSUE DETECTED            │
└──────────────┬──────────────────────┘
               │
        ┌──────▼──────────┐
        │ Can we fix in   │
        │ < 15 minutes?   │
        └─┬────────────┬──┘
          │            │
         YES           NO
          │            │
    ┌─────▼─┐    ┌─────▼──────────┐
    │ FIX   │    │ What's the     │
    │ IN    │    │ impact?        │
    │PLACE  │    └─────┬──────────┘
    └───────┘          │
                  ┌─────┴──────────┐
                  │                │
              DATA LOSS      NO DATA LOSS
              DATA CORRUPT   NOT URGENT
                  │                │
            ┌─────▼──┐        ┌────▼────┐
            │ROLLBACK│        │Can we    │
            │ ASAP   │        │workaround│
            └────────┘        └─┬────┬───┘
                               │    │
                              YES   NO
                               │    │
                         ┌─────▼┐ ┌▼─────┐
                         │USE   │ │DECIDE│
                         │WORK  │ │LATER │
                         │AROUND│ └──────┘
                         └──────┘
```

---

## 📋 Rollback Criteria

### Automatic Rollback Triggers

Deploy auto-rollback if:

```yaml
triggers:
   error_rate:
      threshold: 10%
      duration: 5 minutes
      action: auto_rollback

   response_time:
      threshold: 30000ms
      duration: 5 minutes
      action: auto_rollback

   contract_failures:
      threshold: 20
      duration: 1 minute
      action: auto_rollback

   data_corruption:
      detected: true
      action: immediate_rollback
```

### Manual Rollback Decision Criteria

| Criterion         | Rollback      | Continue        |
| ----------------- | ------------- | --------------- |
| **Error Rate**    | > 5%          | < 5%            |
| **Response Time** | p95 > 10s     | p95 < 5s        |
| **Data Loss**     | Any           | None            |
| **User Impact**   | > 50%         | < 50%           |
| **Fix Available** | No (< 30 min) | Yes (< 30 min)  |
| **Criticality**   | Critical      | High/Medium/Low |
| **Time to Fix**   | > 1 hour      | < 1 hour        |

---

## 🔄 Rollback Execution

### Step-by-Step Rollback Procedure

#### Phase 1: Assessment (2-3 minutes)

```
[ ] 1. Confirm the issue (not a false alarm)
[ ] 2. Verify error rate or impact level
[ ] 3. Check if fix is possible quickly (< 15 min)
[ ] 4. Notify team lead
[ ] 5. Post to #incidents: "Assessing for rollback"
[ ] 6. Get approval from team lead/manager
```

**Decision Point**:

- If fix possible in < 15 min → Skip to Phase 4 (Fix in Place)
- If critical issue or fix > 30 min → Continue to Phase 2

---

#### Phase 2: Preparation (2-3 minutes)

```
[ ] 1. Identify previous stable version
[ ] 2. Verify rollback process is documented
[ ] 3. Prepare rollback command
[ ] 4. Test rollback locally (if time allows)
[ ] 5. Brief team on rollback plan
[ ] 6. Prepare communication template
[ ] 7. Notify stakeholders: "Preparing rollback"
```

**Rollback Command** (Docker example):

```bash
# Get previous image tag
PREV_TAG=$(docker image ls accesslayer-client --format "{{.Tag}}" | sort | tail -2 | head -1)
echo "Rolling back to: $PREV_TAG"

# Stop current deployment
kubectl set image deployment/accesslayer-client \
  app=docker.io/accesslayer/accesslayer-client:$PREV_TAG

# Wait for rollout
kubectl rollout status deployment/accesslayer-client

# Verify
kubectl get pods
```

---

#### Phase 3: Execution (5-10 minutes)

```
[ ] 1. Final confirmation from team lead
[ ] 2. Execute rollback command
[ ] 3. Monitor rollout status
[ ] 4. Verify pods are running
[ ] 5. Post to #incidents: "Rollback executed"
[ ] 6. Clear cache (if needed)
[ ] 7. Verify feature working on previous version
```

**Git Rollback** (if needed):

```bash
# Get previous commit
git log --oneline -n 5
# Shows: abc123 Add batch transfer feature
#        def456 Previous stable version

# Revert deployment config
git revert abc123
git push origin main

# Or reset (CAREFUL - only if not pushed)
git reset --hard def456
```

---

#### Phase 4: Monitoring (30+ minutes)

```
[ ] 1. Watch error rate (should drop)
[ ] 2. Check response times (should improve)
[ ] 3. Monitor for new issues
[ ] 4. Check user reports (should stop)
[ ] 5. Update status page: "ROLLED BACK"
[ ] 6. Post updates to #incidents every 5 min
[ ] 7. Verify all metrics normal
```

**Success Criteria for Rollback**:

- Error rate drops below 1% (from > 5%)
- Response time p95 < 2s (from > 10s)
- No new user complaints
- System stable for 15+ minutes

---

#### Phase 5: Communication (Ongoing)

**Immediate Notification** (< 1 min):

```
Subject: [ROLLBACK] Batch Transfer - Incident Response

Hi all,

We've rolled back the batch transfer feature due to
[brief issue description]. We'll investigate and
redeploy after fixes.

Status: Rolled back
Impact: Feature temporarily unavailable
ETA: [Estimated time]
```

**Status Updates** (Every 15 min):

```
Status Update #1: [HH:MM UTC]
- Rollback successful
- System stable
- Investigating root cause
- Next update in 15 minutes
```

**Final Communication** (After stability confirmed):

```
Subject: [RESOLVED] Batch Transfer - Rollback Complete

The feature has been temporarily disabled while we
investigate and fix the issue. We'll redeploy once
we've verified the fix.

Timeline:
- Issue detected: [HH:MM]
- Rollback executed: [HH:MM]
- System stable: [HH:MM]

Root Cause: [Explanation]
Next Steps: [What we're doing]

Thank you for your patience.
```

---

### Alternative: Partial Rollback (Feature Flags)

If you can disable the feature without full deployment rollback:

```typescript
// In BatchTransferModal.tsx
const FEATURE_ENABLED = process.env.REACT_APP_BATCH_TRANSFER_ENABLED === 'true';

export function BatchTransferModal() {
  if (!FEATURE_ENABLED) {
    return <div>Feature temporarily unavailable</div>;
  }

  // ... normal component code
}
```

**Disable Feature Flag** (Faster than code rollback):

```bash
# Update environment variable
kubectl set env deployment/accesslayer-client \
  REACT_APP_BATCH_TRANSFER_ENABLED=false

# Or update configmap
kubectl edit configmap app-config
# Change: BATCH_TRANSFER_ENABLED: "false"

# Redeploy app (picks up new config)
kubectl rollout restart deployment/accesslayer-client
```

**Advantage**: No code change needed, can toggle on/off instantly

---

## 💾 Data Recovery

### Data Loss Scenarios

#### Scenario 1: Corrupted Transfer Records

**Problem**: Transfer records showing incorrect state

**Recovery Steps**:

1. [ ] Stop accepting new transfers (disable feature)
2. [ ] Backup corrupted database
3. [ ] Query transaction history from blockchain
4. [ ] Reconcile: Compare DB vs blockchain
5. [ ] Correct any discrepancies
6. [ ] Verify data integrity
7. [ ] Re-enable feature
8. [ ] Notify affected users

**SQL Queries**:

```sql
-- Find corrupted records
SELECT * FROM batch_transfers
WHERE status = 'completed'
  AND amount != (SELECT SUM(quantity) FROM recipients WHERE transfer_id = id);

-- Backup before any changes
CREATE TABLE batch_transfers_backup AS
SELECT * FROM batch_transfers;

-- Fix amounts
UPDATE batch_transfers SET amount = (
  SELECT SUM(quantity) FROM recipients WHERE transfer_id = id
) WHERE status = 'completed';

-- Verify fix
SELECT * FROM batch_transfers
WHERE status = 'completed'
  AND amount = (SELECT SUM(quantity) FROM recipients WHERE transfer_id = id);
```

---

#### Scenario 2: Lost Transactions

**Problem**: User claims transfer was submitted but not recorded

**Recovery Steps**:

1. [ ] Query blockchain for user's transfers
2. [ ] Check if transfer succeeded on-chain
3. [ ] If yes → Manually create DB record
4. [ ] If no → Investigate why submission failed
5. [ ] Provide appropriate user response
6. [ ] Retry if needed

**Recovery Script**:

```sql
-- Check for missing records
SELECT tx_hash, recipient_address, amount, timestamp
FROM blockchain_transfers
WHERE user_id = 'user123'
  AND tx_hash NOT IN (SELECT tx_hash FROM batch_transfers);

-- Insert missing record
INSERT INTO batch_transfers (
  user_id, tx_hash, status, amount, created_at
) VALUES (
  'user123', 'tx123abc', 'completed', 100, NOW()
);

-- Insert recipients
INSERT INTO recipients (transfer_id, wallet_address, quantity)
VALUES (LAST_INSERT_ID(), 'GXXX...', 50);
```

---

#### Scenario 3: Balance Mismatch

**Problem**: User balance doesn't match expected amount

**Recovery Steps**:

1. [ ] Query user's transfer history
2. [ ] Calculate expected balance
3. [ ] Compare to actual balance
4. [ ] Identify discrepancy
5. [ ] Determine root cause
6. [ ] Correct if data error
7. [ ] Alert user if needed

**Balance Audit Query**:

```sql
-- Calculate expected balance
SELECT
  u.id,
  u.wallet_address,
  u.current_balance,
  (
    SELECT COALESCE(SUM(initial_balance), 0)
    FROM user_snapshots
    WHERE user_id = u.id
    ORDER BY created_at DESC
    LIMIT 1
  ) - (
    SELECT COALESCE(SUM(amount), 0)
    FROM batch_transfers
    WHERE user_id = u.id AND status = 'completed'
  ) as calculated_balance,
  (
    SELECT COALESCE(SUM(initial_balance), 0)
    FROM user_snapshots
    WHERE user_id = u.id
    ORDER BY created_at DESC
    LIMIT 1
  ) - (
    SELECT COALESCE(SUM(amount), 0)
    FROM batch_transfers
    WHERE user_id = u.id AND status = 'completed'
  ) - u.current_balance as discrepancy
FROM users u
WHERE u.current_balance != (
  SELECT COALESCE(SUM(initial_balance), 0)
  FROM user_snapshots
  WHERE user_id = u.id
  ORDER BY created_at DESC
  LIMIT 1
) - (
  SELECT COALESCE(SUM(amount), 0)
  FROM batch_transfers
  WHERE user_id = u.id AND status = 'completed'
);
```

---

## 📊 Disaster Recovery Plan

### Backup Strategy

**Database Backups**:

```
Frequency: Hourly
Retention: 30 days
Location: S3 + on-premise
Type: Full + Incremental
Tested: Weekly
```

**Code Backups**:

```
Location: GitHub (git history)
Retention: Indefinite
Branches: main (production), develop, feature branches
Tags: Version tags on releases
```

**Configuration Backups**:

```
Location: Version control + S3
Retention: 1 year
Items: ENV files, secrets (encrypted), configs
```

---

### Disaster Recovery Time Objectives (RTOs)

| Disaster           | RTO     | Actions                     |
| ------------------ | ------- | --------------------------- |
| Single pod failure | 5 min   | Kubernetes auto-restarts    |
| Database failure   | 15 min  | Failover to replica         |
| Data corruption    | 30 min  | Restore from backup         |
| Complete outage    | 1 hour  | Full rebuild + restore      |
| Security breach    | 2 hours | Investigation + remediation |

---

### Recovery Procedures by Severity

#### Recovery 1: Single Service Instance Down

```
Detection: Health check fails
Time: Automatic, < 5 min

Recovery Steps:
1. [ ] Kubernetes detects pod failure
2. [ ] Auto-restart pod
3. [ ] Verify pod is healthy
4. [ ] Monitor for any issues
5. [ ] If persists, manual intervention

No action needed (automatic recovery)
```

---

#### Recovery 2: Database Replication Lag

```
Detection: Replication lag > 1 minute
Time: 5-15 minutes

Recovery Steps:
1. [ ] Alert fires
2. [ ] Check primary database health
3. [ ] Check replication status
4. [ ] If primary issue → Failover to replica
5. [ ] Verify data consistency
6. [ ] Reconnect applications
7. [ ] Monitor replication recovery
```

---

#### Recovery 3: Data Corruption

```
Detection: Data integrity check fails
Time: 30 min - several hours

Recovery Steps:
1. [ ] Stop application (optional)
2. [ ] Backup current database
3. [ ] Restore from clean backup
4. [ ] Run data validation
5. [ ] Reconcile with blockchain
6. [ ] Correct any discrepancies
7. [ ] Restart application
8. [ ] Notify affected users
```

---

#### Recovery 4: Complete Infrastructure Failure

```
Detection: All services unreachable
Time: 1-2 hours (worst case)

Recovery Steps:
1. [ ] Activate disaster recovery site
2. [ ] Restore from latest backup
3. [ ] Reconfigure DNS
4. [ ] Start all services
5. [ ] Run smoke tests
6. [ ] Verify data integrity
7. [ ] Notify users
8. [ ] Monitor closely
```

---

## 📝 Pre-Incident Preparation

### Daily Backup Checklist

```
[ ] Database backup completed
[ ] Backup integrity verified
[ ] Replication lag normal
[ ] Alerts configured
[ ] On-call engineer briefed
[ ] Communication templates updated
[ ] Runbooks available
```

### Weekly Disaster Recovery Test

```
[ ] Simulate database failure
[ ] Practice failover
[ ] Test backup restore
[ ] Measure recovery time
[ ] Document any issues
[ ] Update procedures if needed
[ ] Brief team on findings
```

### Monthly Full Disaster Drill

```
[ ] Simulate complete outage
[ ] Execute full recovery plan
[ ] Test all backup systems
[ ] Practice communication
[ ] Measure total RTO
[ ] Document lessons learned
[ ] Update all procedures
```

---

## 🔐 Disaster Recovery Kit

### Essential Files to Keep Secure

```
1. Database Credentials
   - Location: Encrypted vault
   - Access: On-call engineer only

2. Backup Access Keys
   - Location: Encrypted vault
   - Access: On-call engineer + DevOps lead

3. DNS Configuration
   - Location: DNS provider dashboard
   - Access: DevOps team

4. Deployment Keys
   - Location: Encrypted vault
   - Access: DevOps team

5. Communication Templates
   - Location: Shared drive
   - Access: All team members
```

---

## 📞 Disaster Recovery Contacts

| Role                | Name | Phone | Email |
| ------------------- | ---- | ----- | ----- |
| DevOps Lead         | ___  | ___   | ___   |
| DBA                 | ___  | ___   | ___   |
| Infrastructure Lead | ___  | ___   | ___   |
| Manager             | ___  | ___   | ___   |
| External Support    | ___  | ___   | ___   |

---

## ✅ Disaster Recovery Readiness Checklist

Before production:

- [ ] Backup system configured
- [ ] Backup tested successfully
- [ ] Restore procedure documented
- [ ] Restore procedure tested
- [ ] RTO targets set
- [ ] RPO targets set
- [ ] Failover procedure documented
- [ ] Failover tested monthly
- [ ] Communication templates prepared
- [ ] Contacts updated
- [ ] On-call trained
- [ ] Runbooks accessible
- [ ] Insurance verified (if applicable)
- [ ] Third-party support contacts
- [ ] Legal notifications prepared

---

## 📋 Post-Recovery Actions

After any disaster recovery activation:

```
Immediately (1 hour):
[ ] Notify stakeholders
[ ] Document timeline
[ ] Begin root cause analysis
[ ] Check data integrity

Within 24 hours:
[ ] Complete incident report
[ ] Schedule post-mortem
[ ] Update procedures if needed
[ ] Conduct drill to verify recovery

Within 1 week:
[ ] Post-mortem meeting completed
[ ] Action items assigned
[ ] New tests created
[ ] Team trained on changes
```

---

## 🎯 Disaster Recovery Success Criteria

- ✅ Can restore from backup in < RTO
- ✅ Data integrity verified after restore
- ✅ Zero data loss (or acceptable RPO)
- ✅ Users notified appropriately
- ✅ Team confident in recovery process
- ✅ Monthly drills successful
- ✅ Documentation current and accessible

---

## Conclusion

This comprehensive rollback and disaster recovery plan ensures:

- ✅ Clear rollback procedures
- ✅ Rapid incident response
- ✅ Data protection and recovery
- ✅ Minimal downtime
- ✅ Team preparedness
- ✅ User confidence

**Your production environment is protected!** 🚀
