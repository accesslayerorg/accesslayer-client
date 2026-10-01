# Batch Transfer Modal - Enhancements Roadmap

## Overview

This document outlines potential enhancements and the path to implement them. The current implementation is production-ready (Phase 1). Below are planned phases for future development.

---

## 📊 Current Status: Phase 1 ✅

**Completed Features**:

- ✅ Batch transfer to up to 10 recipients
- ✅ Real-time validation
- ✅ Balance checking
- ✅ Responsive design
- ✅ Error handling
- ✅ Optimistic updates

**Known Limitations** (by design):

- Max 10 recipients (hard limit)
- Regex address validation (no checksum)
- No duplicate detection
- Demo mode (needs contract)

---

## 📅 Phase 2: Enhanced Validation (1-2 weeks)

### 2.1: Checksum Address Validation

**Goal**: Verify Stellar address checksums for additional security

**Implementation**:

```typescript
// Add to src/utils/stellarValidation.ts
import * as StellarSDK from 'stellar-sdk';

export function isValidStellarAddress(address: string): boolean {
	// Check format
	if (!/^G[A-Z2-7]{55}$/.test(address)) {
		return false;
	}

	// Check checksum (Stellar SDK)
	try {
		return StellarSDK.StrKey.isValidEd25519PublicKey(address);
	} catch {
		return false;
	}
}
```

**Changes Required**:

- Update STELLAR_ADDRESS_RE usage
- Replace with isValidStellarAddress() call
- Add Stellar SDK dependency

**Testing**:

- Valid addresses pass
- Invalid addresses fail
- Checksum validation works

**Files to Update**:

- `src/components/common/BatchTransferModal.tsx`
- `src/utils/stellarValidation.ts` (new)

---

### 2.2: Duplicate Address Detection

**Goal**: Prevent transferring to same address multiple times in batch

**Implementation**:

```typescript
// In BatchTransferModal.tsx useMemo
const { rowErrors } = useMemo(() => {
	const errors = new Map<string, string>();
	const seen = new Set<string>();

	for (const row of rows) {
		const addr = row.recipientAddress.trim();

		// Check for duplicates
		if (addr && seen.has(addr)) {
			errors.set(row.id, 'Duplicate address in batch');
		}

		seen.add(addr);
	}

	return { rowErrors: errors };
}, [rows]);
```

**Expected Impact**:

- Prevents accidental duplicates
- Better user guidance
- Enhanced data validation

**Implementation Time**: 1-2 hours

---

### 2.3: Recipient Validation API

**Goal**: Real-time check if recipient addresses are active/valid on chain

**Implementation**:

```typescript
// In BatchTransferModal.tsx
const validateRecipient = async (address: string) => {
	try {
		const response = await fetch(`/api/wallet/validate/${address}`);
		const data = await response.json();
		return data.isValid;
	} catch {
		return true; // Assume valid if can't reach API
	}
};

// Use in validation:
const isValidRecipient = await validateRecipient(row.recipientAddress);
if (!isValidRecipient) {
	errors.set(row.id, 'Recipient address not found');
}
```

**Requirements**:

- Backend API endpoint for validation
- Rate limiting to prevent abuse
- Error handling for API failures

**Implementation Time**: 2-3 hours

---

## 📅 Phase 3: Template System (2-3 weeks)

### 3.1: Save Transfer Templates

**Goal**: Let users save recipient lists as templates for reuse

**Data Structure**:

```typescript
interface TransferTemplate {
	id: string;
	name: string;
	creatorId: string;
	recipients: Array<{
		address: string;
		label?: string;
	}>;
	createdAt: Date;
	updatedAt: Date;
}
```

**Implementation**:

```typescript
// New component: TransferTemplateManager.tsx
export function TransferTemplateManager() {
	const [templates, setTemplates] = useState<TransferTemplate[]>([]);

	const saveTemplate = async (name: string, recipients: TransferRow[]) => {
		const template: TransferTemplate = {
			id: uuid(),
			name,
			creatorId,
			recipients: recipients.map(r => ({
				address: r.recipientAddress,
				label: r.label, // Optional label
			})),
			createdAt: new Date(),
			updatedAt: new Date(),
		};

		// Save to backend
		await saveToDatabase(template);
		setTemplates([...templates, template]);
	};
}
```

**UI Changes**:

- "Save as Template" button in modal
- Template library button on portfolio row
- Load template dialog with list

**Storage**:

- Database table: `transfer_templates`
- User-scoped (private to each user)
- Soft delete support

**Implementation Time**: 3-4 hours

---

### 3.2: Quick Recipient Labels

**Goal**: Add optional labels to recipients for organization

**Changes**:

```typescript
interface TransferRow {
	id: string;
	recipientAddress: string;
	quantity: string;
	label?: string; // ← NEW
	error?: string;
}
```

**UI**:

```typescript
<input
  type="text"
  placeholder="Optional label (e.g., 'Alice', 'Team')"
  value={row.label || ''}
  onChange={(e) => updateRowLabel(row.id, e.target.value)}
/>
```

**Implementation Time**: 1-2 hours

---

## 📅 Phase 4: Advanced Features (3-4 weeks)

### 4.1: CSV Import

**Goal**: Import recipient list from CSV file

**Implementation**:

```typescript
// Parse CSV
const parseCSV = (content: string): Array<{address: string; qty: number}> => {
  const lines = content.split('\n');
  return lines.map(line => {
    const [address, qty] = line.split(',');
    return { address: address.trim(), qty: Number(qty) };
  });
};

// UI Component
<input
  type="file"
  accept=".csv"
  onChange={(e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const csv = event.target?.result as string;
        const data = parseCSV(csv);
        importRecipients(data);
      };
      reader.readAsText(file);
    }
  }}
/>
```

**CSV Format**:

```
GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX,10
GYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY,20
GZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ,15
```

**Validation**:

- Parse CSV correctly
- Validate each address
- Check total quantity
- Show errors for invalid rows

**Implementation Time**: 3-4 hours

---

### 4.2: Export Transfer History

**Goal**: Export completed transfers for audit/accounting

**Implementation**:

```typescript
// Generate CSV
const generateCSV = (transfers: Transfer[]) => {
	const headers = ['Recipient', 'Quantity', 'Date', 'Status', 'TxHash'];
	const rows = transfers.map(t => [
		t.recipientAddress,
		t.quantity,
		t.completedAt,
		t.status,
		t.txHash,
	]);

	const csv = [headers, ...rows].map(row => row.join(',')).join('\n');

	return csv;
};

// Download
const downloadCSV = () => {
	const csv = generateCSV(transfers);
	const blob = new Blob([csv], { type: 'text/csv' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = `transfers-${new Date().toISOString()}.csv`;
	a.click();
};
```

**UI**:

- "Export to CSV" button in transfer history view
- Optional date range filter
- Show count being exported

**Implementation Time**: 2-3 hours

---

### 4.3: Scheduled Transfers

**Goal**: Schedule transfers to execute at a future time

**Data Structure**:

```typescript
interface ScheduledTransfer {
	id: string;
	creatorId: string;
	recipients: TransferRow[];
	scheduledFor: Date;
	status: 'pending' | 'executed' | 'failed' | 'cancelled';
	createdAt: Date;
	executedAt?: Date;
}
```

**Implementation**:

```typescript
// UI Component: ScheduleTransferModal
<input
  type="datetime-local"
  value={scheduledTime}
  onChange={(e) => setScheduledTime(new Date(e.target.value))}
/>

// Submit handler
const handleSchedule = async () => {
  await api.scheduleTransfer({
    creatorId,
    recipients: rows,
    scheduledFor: scheduledTime,
  });

  showToast.success(`Transfer scheduled for ${scheduledTime}`);
};
```

**Backend Requirements**:

- Background job to execute scheduled transfers
- Retry logic for failed executions
- Notification when executed

**Implementation Time**: 4-5 hours

---

## 📅 Phase 5: Team Features (3-4 weeks)

### 5.1: Multi-Signature Support

**Goal**: Require approval from multiple team members before transfer

**Implementation**:

```typescript
interface TransferApproval {
	id: string;
	transferId: string;
	requiredApprovals: number;
	approvals: Array<{
		userId: string;
		approvedAt: Date;
		signature?: string;
	}>;
	status: 'pending' | 'approved' | 'rejected';
}
```

**Workflow**:

1. User creates transfer
2. Transfer marked as "pending approval"
3. Approvers notified
4. Once N approvals: auto-execute or await final confirm
5. Log all approvals for audit

**Implementation Time**: 5-6 hours

---

### 5.2: Approval Workflow

**Goal**: Require approval workflow before transfers execute

**States**:

```
Draft → Pending Review → Approved → Executing → Completed
                      ↓
                   Rejected
```

**UI Components**:

- Approval queue view
- Approve/reject buttons
- Comment section for feedback
- Audit trail

**Implementation Time**: 4-5 hours

---

### 5.3: Rate Limiting UI

**Goal**: Show user when they're rate-limited with countdown

**Implementation**:

```typescript
// When error response indicates rate-limit:
if (error.message.includes('rate_limited')) {
	const retryAfter = error.retryAfter || 300; // seconds

	// Show countdown timer
	showRateLimitWarning(retryAfter);

	// Disable transfer button with countdown
	// Update every second: "Try again in 4m 30s"
}
```

**Implementation Time**: 2 hours

---

## 🗺️ Implementation Timeline

```
Week 1-2:
  ├─ Phase 2.1: Checksum validation
  ├─ Phase 2.2: Duplicate detection
  └─ Phase 2.3: Recipient validation API

Week 3-4:
  ├─ Phase 3.1: Save templates
  ├─ Phase 3.2: Recipient labels
  └─ Phase 4.1: CSV import

Week 5-6:
  ├─ Phase 4.2: Export history
  ├─ Phase 4.3: Scheduled transfers
  └─ Phase 5.1: Multi-sig support

Week 7-8:
  ├─ Phase 5.2: Approval workflow
  └─ Phase 5.3: Rate limiting UI
```

**Total Estimated Development**: 8-12 weeks

---

## 📋 Enhancement Prioritization

### High Priority (Phase 2-3)

- ✅ Checksum validation (security)
- ✅ Duplicate detection (UX)
- ✅ Templates (efficiency)

### Medium Priority (Phase 4)

- 🔲 CSV import (convenience)
- 🔲 Export history (compliance)
- 🔲 Scheduled transfers (power users)

### Low Priority (Phase 5)

- 🔲 Multi-sig (enterprise)
- 🔲 Approval workflow (governance)
- 🔲 Rate limiting UI (edge case)

---

## 💾 Database Schema Changes

### New Tables (Phase 3+)

**transfer_templates**:

```sql
CREATE TABLE transfer_templates (
  id UUID PRIMARY KEY,
  user_id TEXT NOT NULL,
  creator_id TEXT NOT NULL,
  name TEXT NOT NULL,
  recipients JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP,
  UNIQUE(user_id, creator_id, name)
);
```

**scheduled_transfers**:

```sql
CREATE TABLE scheduled_transfers (
  id UUID PRIMARY KEY,
  user_id TEXT NOT NULL,
  creator_id TEXT NOT NULL,
  recipients JSONB NOT NULL,
  scheduled_for TIMESTAMP NOT NULL,
  status TEXT DEFAULT 'pending',
  executed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**transfer_approvals**:

```sql
CREATE TABLE transfer_approvals (
  id UUID PRIMARY KEY,
  transfer_id UUID NOT NULL,
  required_approvals INTEGER NOT NULL,
  approvers TEXT[] NOT NULL,
  approved_by TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (transfer_id) REFERENCES transfers(id)
);
```

---

## 🧪 Testing Plan for Enhancements

### Phase 2 Testing

- Unit tests for validation functions
- Integration tests with API
- Edge case testing (invalid inputs)

### Phase 3 Testing

- Template CRUD operations
- Import/export functionality
- CSV parsing edge cases

### Phase 4 Testing

- Scheduled execution timing
- Retry logic on failures
- Historical data accuracy

### Phase 5 Testing

- Multi-sig verification
- Approval workflow states
- Rate limiting behavior

---

## 📝 Implementation Guidelines

### For Each Enhancement

1. **Design Phase** (1-2 days)
   - Create detailed spec
   - Sketch UI mockups
   - Plan data structures

2. **Implementation** (2-5 days)
   - Write code
   - Add unit tests
   - Add integration tests

3. **Testing** (1-2 days)
   - Manual testing
   - Edge case testing
   - Performance testing

4. **Review** (1 day)
   - Code review
   - Design review
   - User testing (optional)

5. **Deployment** (1/2 day)
   - Staging deployment
   - Production deployment
   - Monitoring

---

## 🎯 Success Criteria

Each enhancement will be considered successful when:

- ✅ All tests pass
- ✅ Code review approved
- ✅ Performance acceptable
- ✅ No regressions
- ✅ User feedback positive

---

## 📞 Enhancement Requests

To request a new enhancement:

1. Create GitHub issue with:
   - Feature title
   - Use case
   - Acceptance criteria
   - Priority level

2. Team evaluates:
   - Complexity
   - Timeline
   - Business value

3. If approved:
   - Add to roadmap
   - Schedule implementation
   - Create detailed spec

---

## Conclusion

The batch transfer modal has a clear path for enhancement over the coming weeks and months. The current Phase 1 implementation is production-ready, and Phase 2-5 enhancements will add progressively more value for users.

**Current Implementation**: ✅ Ready for production
**Next Phase**: Phase 2 (Validation Enhancements) - Ready to start

**Ready to enhance?** Let's go! 🚀
