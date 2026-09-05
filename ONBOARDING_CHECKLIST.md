# Batch Transfer Modal - Team Onboarding Checklist & Knowledge Base

## 🎯 New Team Member Onboarding

### Week 1: Foundation

#### Day 1: Introduction & Setup (2 hours)

- [ ] Welcome to the team
- [ ] Get access to:
   - [ ] GitHub repository
   - [ ] Slack channels (#batch-transfer, #eng-updates)
   - [ ] Project management tool
   - [ ] Monitoring dashboards
   - [ ] Documentation wiki
- [ ] Clone the repository locally
- [ ] Set up development environment
- [ ] Run `pnpm install` and `pnpm dev`
- [ ] Verify local development server running
- [ ] Read: README.md (10 min)
- [ ] Read: CONTRIBUTING.md (10 min)
- [ ] Introduce yourself in #introductions

**Checklist**:

- [ ] Local dev environment working
- [ ] Can view running app in browser
- [ ] Understand project structure
- [ ] Know who to ask for help

---

#### Day 2: Feature Overview (3 hours)

- [ ] Watch: "Batch Transfer Feature Overview" video (5 min)
- [ ] Read: README_BATCH_TRANSFER.md (15 min)
- [ ] Read: EXECUTIVE_SUMMARY.md (10 min)
- [ ] Review: Quick Reference Cards (15 min)
- [ ] Try: Create a batch transfer yourself (15 min)
- [ ] Ask: Questions in #batch-transfer channel
- [ ] Read: FEATURE_CHECKLIST.md (10 min)

**Checklist**:

- [ ] Understand feature scope and limitations
- [ ] Know the 5 acceptance criteria
- [ ] Can successfully use the feature
- [ ] Know where to find documentation

---

#### Day 3: Technical Deep Dive (4 hours)

- [ ] Read: ARCHITECTURE.md (30 min)
- [ ] Read: DEVELOPER_QUICKSTART.md (30 min)
- [ ] Watch: "Code Walkthrough" video (5 min)
- [ ] Read: Source code (BatchTransferModal.tsx) (45 min)
- [ ] Trace: A transfer request end-to-end (30 min)
- [ ] Review: Implementation checklist (15 min)
- [ ] Setup: IDE extensions/tools as needed (20 min)

**Checklist**:

- [ ] Understand component structure
- [ ] Can find key functions/hooks
- [ ] Understand validation logic
- [ ] Know the mutation pattern used

---

#### Day 4: Testing & Quality (3 hours)

- [ ] Read: TESTING_GUIDE.md (20 min)
- [ ] Read: FEATURE_CHECKLIST.md (15 min)
- [ ] Run: Local test suite (10 min)
- [ ] Review: Test scenarios (30 min)
- [ ] Try: Manual testing (60 min)
- [ ] Learn: Browser DevTools debugging (15 min)
- [ ] Understand: Accessibility requirements (15 min)

**Checklist**:

- [ ] All local tests pass
- [ ] Can run tests in isolation
- [ ] Understand test scenarios
- [ ] Know how to use browser DevTools

---

#### Day 5: Team Integration (2 hours)

- [ ] Meet: Your buddy/mentor
- [ ] Review: Your specific responsibilities
- [ ] Setup: Git workflow and conventions
- [ ] Learn: Deployment process (overview)
- [ ] Join: Sprint/planning meeting
- [ ] Create: Your first task/issue
- [ ] Celebrate: You're onboarded! 🎉

**Checklist**:

- [ ] Know your role/responsibilities
- [ ] Understand team workflow
- [ ] Have a mentor/buddy assigned
- [ ] Ready to contribute

---

### Week 2-4: Skill Building

#### Week 2: Hands-On Practice

**Tasks to Complete**:

1. [ ] Fix: A small bug in the codebase
2. [ ] Feature: Add a minor enhancement (with guidance)
3. [ ] Docs: Update documentation with learnings
4. [ ] Test: Write a unit test for validation
5. [ ] Review: Code review from experienced team member

**Learning Goals**:

- [ ] Comfortable with codebase navigation
- [ ] Can make code changes confidently
- [ ] Understand PR/code review process
- [ ] Can run full test suite

---

#### Week 3: Deeper Understanding

**Tasks to Complete**:

1. [ ] Implement: A small feature independently
2. [ ] Deploy: To staging environment
3. [ ] Monitor: Deployment on staging
4. [ ] Test: Full manual testing
5. [ ] Document: Implementation and learnings

**Learning Goals**:

- [ ] Understand deployment process
- [ ] Comfortable with production-like environment
- [ ] Can monitor for issues
- [ ] Know escalation paths

---

#### Week 4: Team Member

**Tasks to Complete**:

1. [ ] Review: Code from another team member
2. [ ] Mentor: Help another new team member
3. [ ] On-Call: Observe on-call engineer
4. [ ] Incident: Participate in mock incident
5. [ ] Reflection: Document your learnings

**Learning Goals**:

- [ ] Can review code confidently
- [ ] Understand code review standards
- [ ] Know incident response process
- [ ] Ready for on-call rotation (future)

---

## 📚 Knowledge Base

### Section 1: Feature Fundamentals

#### What is Batch Transfer?

Batch Transfer allows users to send cryptocurrency keys to multiple recipients (up to 10) in a single transaction. Instead of making 10 separate transfers, users make one batch transfer.

**Benefits**:

- Saves time (one transaction vs. many)
- Single fee vs. multiple fees
- Clear audit trail
- Atomic operation (all succeed or all fail)

---

#### Key Limitations

1. **Maximum recipients**: 10 per batch
   - Why? Keeps transaction size reasonable
   - Workaround: Make multiple batches if needed

2. **One creator at a time**: Can't mix creators in one batch
   - Why? Contract design simplification
   - Workaround: Make separate batches per creator

3. **Liquid balance only**: Can't transfer staked/locked keys
   - Why? Only liquid balance is available
   - Workaround: Unstake first if needed

4. **Stellar addresses only**: Recipients must have Stellar wallets
   - Why? System uses Stellar blockchain
   - Workaround: Help user set up Stellar wallet

---

#### Acceptance Criteria (Must Have)

✅ **AC1**: Up to 10 recipient rows accepted

- Implementation: `rows.length <= 10`
- Verified: Can add 1-10 rows

✅ **AC2**: Add Recipient button disabled at 10 rows

- Implementation: `canAddMore = rows.length < MAX_RECIPIENTS`
- Verified: Button disabled when 10 rows exist

✅ **AC3**: Total keys displayed and updated in real-time

- Implementation: `useMemo` calculates total, updates on row changes
- Verified: Total updates as quantities change

✅ **AC4**: Invalid address shows row-level error

- Implementation: Stellar regex validation per row
- Verified: Error appears under invalid address

✅ **AC5**: Total exceeding balance shows error and disables submit

- Implementation: Guard clause + disabled state
- Verified: Red alert + disabled button

---

### Section 2: Architecture & Design

#### Component Hierarchy

```
LandingPage
├── PortfolioHoldings (existing)
│   └── PortfolioHoldingRow (updated)
│       └── Transfer button (new)
└── BatchTransferModal (new)
    ├── RecipientList
    │   └── RecipientRow (multiple)
    │       ├── Address input
    │       ├── Quantity input
    │       └── Remove button
    ├── Summary section
    │   ├── Available balance
    │   ├── Total keys
    │   └── Error display
    └── Action buttons
        ├── Cancel
        └── Confirm Transfer
```

---

#### Data Flow

```
User clicks Transfer button
        ↓
Opens BatchTransferModal
        ↓
User adds recipients & quantities
        ↓
Real-time validation (useMemo)
        ↓
User clicks Confirm Transfer
        ↓
Build BatchTransferOrder array
        ↓
Call useBatchTransferMutation
        ↓
Optimistic update (balance reduction)
        ↓
Submit to contract (1200ms simulation)
        ↓
Show success/error toast
        ↓
Invalidate cache (refetch holdings)
```

---

#### State Management Pattern

```typescript
// Component state
const [rows, setRows] = useState<TransferRow[]>([]);
const [isSubmitting, setIsSubmitting] = useState(false);

// Computed state (useMemo)
const validation = useMemo(() => ({
  rowErrors: new Map(...),
  totalQuantity: rows.reduce(...),
  isValid: checkAllRows(...)
}), [rows, availableBalance]);

// Mutation state (React Query)
const mutation = useBatchTransferMutation(walletAddress);
// mutation.isPending, mutation.error, mutation.isSuccess
```

---

### Section 3: Common Tasks

#### Task: Add Validation Rule

**Scenario**: "We need to prevent transfers to the user's own address"

**Steps**:

1. Open `BatchTransferModal.tsx`
2. Find the `useMemo` validation block
3. Add check: `if (address === userAddress) return "Cannot transfer to own address"`
4. Test: Try transferring to own address
5. Verify: Error shows

**Code Example**:

```typescript
const validation = useMemo(() => {
	const rowErrors = new Map<string, string>();

	rows.forEach(row => {
		if (!row.recipientAddress) {
			rowErrors.set(row.id, 'Address required');
		} else if (!STELLAR_ADDRESS_RE.test(row.recipientAddress)) {
			rowErrors.set(row.id, 'Invalid Stellar address');
		} else if (row.recipientAddress === userAddress) {
			rowErrors.set(row.id, 'Cannot transfer to own address'); // NEW
		}
		// ... more checks
	});

	return { rowErrors, totalQuantity, isValid };
}, [rows, userAddress]); // Add userAddress to deps
```

---

#### Task: Change Maximum Recipients

**Scenario**: "We want to allow 20 recipients instead of 10"

**Steps**:

1. Open `BatchTransferModal.tsx`
2. Find: `const MAX_RECIPIENTS = 10;`
3. Change to: `const MAX_RECIPIENTS = 20;`
4. Find: All references to `MAX_RECIPIENTS`
5. Update docs: Change "10 recipients" to "20 recipients" in all docs
6. Test: Verify can add up to 20
7. Verify: Button disables at 20
8. Run full test suite

**Files to Update**:

- `BatchTransferModal.tsx` (MAX_RECIPIENTS constant)
- `FEATURE_CHECKLIST.md` (acceptance criteria)
- `README_BATCH_TRANSFER.md` (limitations)
- `TROUBLESHOOTING.md` (FAQ)

---

#### Task: Add Recipient Import (CSV)

**Scenario**: "Users want to import recipient list from CSV file"

**Steps**:

1. Create: New component `RecipientImport.tsx`
2. Implement: CSV file parser
3. Integrate: Into `BatchTransferModal.tsx`
4. Validate: Each imported row
5. Test: With sample CSV files
6. Update: Documentation

**Pseudo-code**:

```typescript
function handleImportCSV(csvFile: File) {
	const content = await csvFile.text();
	const rows = content.split('\n').map(line => {
		const [address, quantity] = line.split(',');
		return {
			id: generateId(),
			recipientAddress: address,
			quantity: parseInt(quantity),
		};
	});
	setRows(rows);
}
```

---

### Section 4: Debugging Guide

#### Debug Scenario 1: Transfer button not showing

**Symptoms**: No Transfer button on portfolio row

**Diagnosis**:

1. Check: Is portfolio row visible? (Yes/No)
2. Check: Does creator have balance > 0? (Yes/No)
3. Check: Is screen width > 768px? (Yes/No)
4. Check: Browser console for errors (Yes/No)

**Solutions**:

- If portfolio row not visible → check portfolio data
- If balance is 0 → user has no keys to transfer
- If mobile screen → Transfer is in dropdown menu (MoreHorizontal)
- If console errors → check error message

**DevTools Steps**:

1. Open DevTools (F12)
2. Check Network tab: Is API request successful?
3. Check Console: Any errors?
4. Check React tab: Is BatchTransferModal mounted?
5. Check Elements: Is button in DOM?

---

#### Debug Scenario 2: Validation not working

**Symptoms**: Invalid address accepted, or valid address rejected

**Diagnosis**:

1. Check: What's the address? (Record it)
2. Check: What's the error message? (Record it)
3. Check: Browser console logs
4. Check: Regex pattern correct?

**Test Address**:

```javascript
// In browser console:
const STELLAR_ADDRESS_RE = /^[G][A-Z2-7]{55}$/;
console.log(
	STELLAR_ADDRESS_RE.test(
		'GBRPYHIL2CI3WHZDTOOQFC6EB4KJJGUJGU42ZPZNCCVKNLTLNOXBXUL'
	)
); // true
console.log(STELLAR_ADDRESS_RE.test('INVALID')); // false
```

**Solutions**:

- If address is valid but shows error → Check regex
- If address is invalid but accepted → Check validation logic
- If console shows errors → Check error message details

---

#### Debug Scenario 3: Transfer fails after submit

**Symptoms**: Submit button clicked, then error/nothing happens

**Diagnosis**:

1. Check: Browser console for errors
2. Check: Network tab for API request
3. Check: Is mutation state correct?
4. Check: What error message shows?

**Common Errors**:

- "Address required" → Missing recipient address
- "Invalid Stellar address" → Wrong format
- "Quantity must be > 0" → Quantity is 0 or negative
- "Insufficient balance" → Total exceeds available
- "Network error" → Connection issue
- "Contract error" → Backend issue

**Solutions**:

- Fix validation errors first
- Check network connectivity
- Check contract status
- Check user balance
- Retry operation

---

### Section 5: FAQ

#### General Questions

**Q1: How many recipients can I transfer to in one batch?**
A: Maximum 10 recipients per batch. If you need to transfer to more, create multiple batches.

**Q2: Can I transfer to the same address twice in one batch?**
A: No, the system prevents duplicate recipients. Add quantities together instead.

**Q3: What if I run out of balance mid-transfer?**
A: The system checks balance before allowing submit. If balance changes, re-validate by clicking Confirm again.

**Q4: Can I transfer staked/locked keys?**
A: No, only liquid balance. Unstake keys first if needed.

**Q5: Is there a fee for batch transfers?**
A: One fee per batch, not per recipient. This saves money compared to individual transfers.

---

#### Technical Questions

**Q6: Where's the code for batch transfer?**
A: Main files:

- `src/components/common/BatchTransferModal.tsx` - Component (290 lines)
- `src/hooks/useWallet.ts` - Mutation hook
- `src/components/common/PortfolioHoldingRow.tsx` - Transfer button
- `src/pages/LandingPage.tsx` - Integration

**Q7: How does validation work?**
A: Uses a `useMemo` hook that runs whenever rows change. Checks:

- Address format (Stellar regex)
- Quantity > 0
- Total doesn't exceed balance
- Returns error Map keyed by row ID

**Q8: How is state managed?**
A: Component state for UI (rows, isSubmitting) + React Query mutation for server operations (isPending, error, etc.)

**Q9: What's the contract integration point?**
A: In `useBatchTransferMutation.ts`, the `mutationFn`. Currently simulates 1200ms - replace with actual contract call.

**Q10: How do I run tests?**
A: `pnpm test` or `pnpm test:watch`. See TESTING_GUIDE.md for details.

---

#### Troubleshooting Questions

**Q11: Transfer button won't open modal**
A: Check browser console for errors. Try refreshing page. Check if portfolio row loaded.

**Q12: Modal opens but looks broken**
A: Clear browser cache (Ctrl+Shift+Delete). Try different browser. Check responsive design.

**Q13: Can't add more recipients after adding one**
A: Check if error showing on first recipient. Fix validation errors first. Check if at max 10.

**Q14: Submit button won't click**
A: Likely a validation error. Check all fields red. Fix errors. Ensure balance sufficient.

**Q15: Transfer fails with network error**
A: Check internet connection. Check contract service status. Retry in a moment.

---

### Section 6: Glossary

| Term                  | Definition                                                |
| --------------------- | --------------------------------------------------------- |
| **Batch Transfer**    | Sending keys to multiple recipients in one transaction    |
| **Recipient**         | A wallet address receiving keys                           |
| **Quantity**          | Number of keys to send to a recipient                     |
| **Liquid Balance**    | Keys available to transfer (not staked/locked)            |
| **Stellar Address**   | Public wallet address starting with 'G', 56 chars total   |
| **Validation**        | Checking address format and quantity rules                |
| **Mutation**          | React Query operation (in this case, submitting transfer) |
| **Optimistic Update** | Updating UI before server confirms (for speed)            |
| **Rollback**          | Reversing optimistic update if server fails               |
| **useMemo**           | React hook that memoizes computed values                  |
| **Props**             | Data passed from parent to child component                |
| **State**             | Data managed by component locally                         |
| **ref**               | React reference to DOM element                            |
| **Modal**             | Pop-up dialog window                                      |
| **Toast**             | Brief notification message                                |
| **TypeScript**        | JavaScript with type checking                             |
| **React Query**       | Library for managing server state                         |
| **Contract**          | Smart contract on blockchain                              |
| **tx_hash**           | Transaction hash/ID on blockchain                         |
| **Idempotent**        | Operation that produces same result if repeated           |

---

### Section 7: Team Member Role Guides

#### Frontend Developer Guide

**Your Focus**:

- Modify component UI/logic
- Add features and fix bugs
- Write unit tests
- Review code from peers

**Key Skills**:

- React hooks knowledge
- TypeScript proficiency
- Component design patterns
- Testing frameworks

**Common Tasks**:

1. Add new validation rule
2. Change recipient limit
3. Modify error messages
4. Improve accessibility
5. Add new field to recipient row

**Success Criteria**:

- [ ] Can modify component independently
- [ ] All code changes tested
- [ ] PR reviewed and merged
- [ ] No production issues

---

#### QA/Testing Guide

**Your Focus**:

- Execute test scenarios
- Find and report bugs
- Verify fixes work
- Test accessibility

**Key Skills**:

- Test case writing
- Browser DevTools
- Accessibility testing
- Bug reproduction

**Common Tasks**:

1. Run 6 test scenarios
2. Test on 6 browsers
3. Test mobile responsiveness
4. Test accessibility
5. Reproduce reported bugs

**Success Criteria**:

- [ ] All scenarios tested
- [ ] Bugs documented thoroughly
- [ ] Fixes verified
- [ ] Feature production-ready

---

#### DevOps/Operations Guide

**Your Focus**:

- Deploy to staging/production
- Monitor system health
- Respond to alerts
- Scale infrastructure

**Key Skills**:

- Deployment tools
- Monitoring systems
- Troubleshooting
- Infrastructure as Code

**Common Tasks**:

1. Deploy to staging
2. Run smoke tests
3. Deploy to production
4. Monitor metrics
5. Respond to incidents

**Success Criteria**:

- [ ] Smooth deployments
- [ ] Zero downtime
- [ ] Rapid incident response
- [ ] SLA compliance

---

#### Product Manager Guide

**Your Focus**:

- Define requirements
- Gather user feedback
- Track metrics
- Plan next phases

**Key Skills**:

- User research
- Data analysis
- Roadmap planning
- Stakeholder communication

**Common Tasks**:

1. Gather user feedback
2. Analyze usage metrics
3. Identify pain points
4. Plan Phase 2 enhancements
5. Communicate roadmap

**Success Criteria**:

- [ ] User satisfaction high
- [ ] Adoption targets met
- [ ] Roadmap defined
- [ ] Stakeholders informed

---

## 🎓 Learning Resources

### Video Tutorials (Create These)

- [ ] "Batch Transfer Feature Overview" (2 min)
- [ ] "How to Use Batch Transfer" (2 min)
- [ ] "Code Walkthrough" (5 min)
- [ ] "Testing Guide" (3 min)
- [ ] "Deployment Process" (3 min)

### Documentation Files

- [ ] README_BATCH_TRANSFER.md ✅
- [ ] ARCHITECTURE.md ✅
- [ ] DEVELOPER_QUICKSTART.md ✅
- [ ] TESTING_GUIDE.md ✅
- [ ] TROUBLESHOOTING.md ✅
- [ ] DEPLOYMENT_GUIDE.md ✅

### Code Examples

- [ ] BasicTransfer.tsx (simple example)
- [ ] AdvancedValidation.tsx (complex example)
- [ ] UnitTest.test.tsx (test example)
- [ ] Integration.test.tsx (integration test)

### Courses/Learning Paths

- [ ] React Hooks Fundamentals
- [ ] React Query Mastery
- [ ] TypeScript Advanced
- [ ] Testing Best Practices

---

## ✅ Onboarding Completion Checklist

When complete, all items below should be checked:

- [ ] Development environment setup
- [ ] Can run app locally
- [ ] Understand feature scope
- [ ] Read all core documentation
- [ ] Watched training videos
- [ ] Completed code walkthrough
- [ ] Can find key files
- [ ] Understand data flow
- [ ] Know validation logic
- [ ] Can debug issues
- [ ] Completed hands-on practice
- [ ] First PR merged
- [ ] Attended team meeting
- [ ] Know escalation paths
- [ ] Have mentor assigned
- [ ] Ready to contribute independently

---

## 🎉 Welcome to the Team!

You're now ready to:
✅ Understand the batch transfer feature  
✅ Navigate the codebase confidently  
✅ Make code changes safely  
✅ Debug and troubleshoot issues  
✅ Contribute to the project  
✅ Support other team members

**Next Steps**:

1. Choose a small task/issue to work on
2. Ask questions in #batch-transfer channel
3. Submit your first PR
4. Celebrate your contribution! 🎉

Welcome aboard! 🚀
