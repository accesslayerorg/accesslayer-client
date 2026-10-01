# Batch Transfer Modal - Developer Quick Start

## Quick Overview

**What**: Batch transfer modal lets users send keys to up to 10 wallets in one transaction  
**Where**: Portfolio holdings section + new modal dialog  
**When**: User clicks "Transfer" button on a holding  
**How**: Add recipients, validate, submit to contract

---

## File Locations

### Main Components

```
src/
├── components/common/
│   ├── BatchTransferModal.tsx          ← Transfer modal
│   └── PortfolioHoldingRow.tsx         ← Transfer button + menu
├── hooks/
│   └── useWallet.ts                    ← Mutation hook
└── pages/
    └── LandingPage.tsx                 ← Integration
```

### Documentation

```
./
├── IMPLEMENTATION_SUMMARY.md           ← Full overview
├── BATCH_TRANSFER_TEST_RESULTS.md      ← Test verification
├── ARCHITECTURE.md                     ← Technical design
├── FEATURE_CHECKLIST.md                ← Testing checklist
├── DEPLOYMENT_GUIDE.md                 ← Deployment steps
└── DEVELOPER_QUICKSTART.md             ← This file
```

---

## Key Concepts

### 1. State Management

**Modal State** (in LandingPage):

```typescript
const [batchTransferDialogOpen, setBatchTransferDialogOpen] = useState(false);
const [selectedTransferCreatorId, setSelectedTransferCreatorId] = useState<
	string | null
>(null);
```

**Component State** (in BatchTransferModal):

```typescript
const [rows, setRows] = useState<TransferRow[]>([]); // Recipients
const [isSubmitting, setIsSubmitting] = useState(false); // Loading state
```

### 2. Validation

```typescript
// Each row must have:
// 1. Valid Stellar address (G + 55 alphanumeric chars)
const STELLAR_ADDRESS_RE = /^[G][A-Z2-7]{55}$/;

// 2. Quantity > 0
// 3. Total quantity <= available balance

// Returns: { totalQuantity, rowErrors, canAddMore, isValid }
```

### 3. Mutation Hook

```typescript
const mutation = useBatchTransferMutation(walletAddress);

mutation.mutateAsync({
	orders: [
		{ creatorId: '1', recipientAddress: 'G...', quantity: 10 },
		{ creatorId: '1', recipientAddress: 'G...', quantity: 5 },
	],
});
```

---

## Common Tasks

### Add a New Recipient Row

```typescript
const handleAddRow = () => {
	if (rows.length >= MAX_RECIPIENTS) {
		showToast.error(`Maximum ${MAX_RECIPIENTS} recipients per transfer`);
		return;
	}

	setRows([
		...rows,
		{
			id: Math.random().toString(36).substr(2, 9),
			recipientAddress: '',
			quantity: '1',
		},
	]);
};
```

### Validate Address

```typescript
const isValid = /^[G][A-Z2-7]{55}$/.test(address.trim());
```

### Calculate Totals

```typescript
const { totalQuantity, rowErrors, isValid } = useMemo(() => {
	let total = 0;
	const errors = new Map<string, string>();

	for (const row of rows) {
		const qty = Number(row.quantity) || 0;
		total += qty;

		if (!row.recipientAddress.trim()) {
			errors.set(row.id, 'Address required');
		} else if (!STELLAR_ADDRESS_RE.test(row.recipientAddress.trim())) {
			errors.set(row.id, 'Invalid Stellar address');
		} else if (qty <= 0) {
			errors.set(row.id, 'Quantity must be greater than 0');
		}
	}

	return {
		totalQuantity: total,
		rowErrors: errors,
		canAddMore: rows.length < MAX_RECIPIENTS,
		isValid:
			rows.length > 0 && errors.size === 0 && total <= availableBalance,
	};
}, [rows, availableBalance]);
```

### Submit Transfer

```typescript
const handleConfirm = async () => {
	if (!isValid) return;

	setIsSubmitting(true);
	try {
		const orders: BatchTransferOrder[] = rows.map(row => ({
			creatorId,
			recipientAddress: row.recipientAddress.trim(),
			quantity: Number(row.quantity),
		}));

		showToast.loading(`Transferring ${formatNumber(totalQuantity)} keys...`);
		await mutation.mutateAsync({ orders });

		showToast.transactionSuccess('Transfer confirmed', '...');
		setRows([]);
		onOpenChange(false);
	} catch (error) {
		console.error('Transfer failed:', error);
	} finally {
		setIsSubmitting(false);
	}
};
```

---

## Testing

### Test a Single Transfer

```typescript
// 1. Click Transfer on a portfolio row
// 2. Add one recipient
// 3. Enter valid address starting with 'G' (56 chars total)
// 4. Enter quantity 1-10
// 5. Confirm button should be enabled
// 6. Click Confirm
// 7. Wait for success toast
// 8. Modal should close
```

### Test Validation

```typescript
// Address validation:
'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'    // Valid (56 chars)
'GXXXXXXXXX'                                                 // Invalid (too short)
'AXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'    // Invalid (starts with A)
''                                                           // Empty error

// Quantity validation:
0                    // Error: must be > 0
-5                   // Error: must be > 0
101 (balance is 100) // Error: exceeds balance
```

### Test Mobile

```typescript
// 1. Resize browser to < 640px (sm breakpoint)
// 2. Portfolio row should show MoreHorizontal button
// 3. Click button → dropdown menu
// 4. Select Transfer
// 5. Modal should be responsive on small screen
```

---

## Common Issues & Fixes

### Issue: Transfer Button Not Showing

**Check**:

1. Is `onTransfer` prop passed to PortfolioHoldingRow?
2. Is user on desktop (≥640px) for button to show?
3. Is user on mobile (<640px) for dropdown to show?
4. Does holding have quantity > 0?

**Fix**:

```typescript
// Ensure onTransfer is passed
<PortfolioHoldingRow
  {...props}
  onTransfer={() => openTransferDialog(position.creatorId)}  // ← Add this
/>
```

### Issue: Modal Won't Open

**Check**:

1. Is `BatchTransferModal` rendered in LandingPage?
2. Is `selectedTransferCreatorId` not null?
3. Is `batchTransferDialogOpen` true?

**Fix**:

```typescript
// Ensure modal is rendered
{selectedTransferCreatorId && (
  <BatchTransferModal
    open={batchTransferDialogOpen}
    onOpenChange={setBatchTransferDialogOpen}
    creatorId={selectedTransferCreatorId}
    // ... other props
  />
)}
```

### Issue: Confirm Button Disabled

**Check**:

1. Are there recipients added?
2. Are all addresses valid Stellar addresses?
3. Are all quantities > 0?
4. Is total quantity <= available balance?

**Fix**:

- Check error messages under each row
- Check balance alert in summary section
- Fix errors one by one
- Confirm button will enable when all valid

### Issue: Address Validation Too Strict

**Current**: Only accepts `G` + 55 alphanumeric chars (case-sensitive)

**If you need different validation**:

```typescript
// Update STELLAR_ADDRESS_RE in BatchTransferModal.tsx
const STELLAR_ADDRESS_RE = /^[G][A-Z0-9]{55}$/; // Allow numbers

// Or add additional validation
const isValidStellarAddress = (addr: string) => {
	// Add checksum verification here
	// Add Memo ID support if needed
};
```

### Issue: Mobile Dropdown Not Showing

**Check**:

1. Is viewport < 640px (sm breakpoint)?
2. Is DropdownMenu imported correctly?
3. Are DropdownMenuContent + DropdownMenuItem exported?

**Fix**:

```typescript
// Ensure imports are correct
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
```

---

## Key Functions

### formatNumber

```typescript
formatNumber(1000); // "1,000"
formatNumber(999); // "999"
formatNumber(0.5); // "0.5"
```

### showToast

```typescript
showToast.loading('Message...');
showToast.success('Success message');
showToast.error('Error message');
showToast.transactionSuccess('Title', 'Message');
```

### useQueryClient

```typescript
queryClient.invalidateQueries({ queryKey: queryKeys.wallet.holdings(address) });
```

---

## Component Props

### BatchTransferModalProps

```typescript
interface BatchTransferModalProps {
	open: boolean; // Modal visible?
	onOpenChange: (open: boolean) => void; // Close handler
	creatorId: string; // Which creator's keys?
	creatorName: string; // Display in header
	availableBalance: number; // Max transferable
	walletAddress: string; // User's wallet
}
```

### PortfolioHoldingRowProps (NEW PROP)

```typescript
interface PortfolioHoldingRowProps {
	// ... existing props
	onTransfer?: (creatorId: string) => void; // ← NEW
}
```

---

## Type Interfaces

```typescript
// Transfer row in modal
interface TransferRow {
	id: string; // Unique key
	recipientAddress: string; // Destination wallet
	quantity: string; // Amount (as string for input)
	error?: string; // Validation error
}

// Contract order
interface BatchTransferOrder {
	creatorId: string; // Sender's creator
	recipientAddress: string; // Destination
	quantity: number; // Amount (parsed number)
}
```

---

## Environment Variables

No new environment variables needed. Uses existing:

- `NODE_ENV` - Determines logging behavior
- `REACT_APP_*` - Standard React env vars

Optional for disabling feature:

```env
REACT_APP_DISABLE_BATCH_TRANSFER=false
```

---

## Performance Tips

### Don't

```typescript
// ❌ Recalculate validation on every render
const isValid = calculateValidation(rows, availableBalance);

// ❌ Inline function in onClick (creates new function each render)
<Button onClick={() => handleAddRow()}>Add</Button>

// ❌ No key for list items (causes re-renders)
{rows.map(row => <div>{row.recipientAddress}</div>)}
```

### Do

```typescript
// ✅ Use useMemo for expensive calculations
const { isValid } = useMemo(() => {
  // calculation here
}, [rows, availableBalance]);

// ✅ Use useCallback for handlers
const handleAddRow = useCallback(() => {
  // handler here
}, []);

// ✅ Use key from data structure
{rows.map(row => <div key={row.id}>{row.recipientAddress}</div>)}
```

---

## Debugging

### Enable Debug Logging

```typescript
// In console
localStorage.setItem('DEBUG', '*');

// Restart app, check console for:
// [batch-transfer-*] logs
// [optimistic-update] logs
// [cache-invalidation] logs
```

### Inspect Component State

```typescript
// React DevTools
// 1. Open React DevTools
// 2. Select BatchTransferModal component
// 3. Check "rows" state
// 4. Check "isSubmitting" state

// Check validation result
console.log(rowErrors); // Map<id, errorMessage>
console.log(totalQuantity); // number
console.log(isValid); // boolean
```

### Check Query Cache

```typescript
// In browser console
import { useQueryClient } from '@tanstack/react-query';
const qc = useQueryClient();
const holdings = qc.getQueryData(['wallet', 'holdings', 'addressXXX']);
console.log(holdings);
```

---

## Quick Reference

| Task              | Command                             | File                     |
| ----------------- | ----------------------------------- | ------------------------ |
| View component    | Open BatchTransferModal.tsx         | `src/components/common/` |
| View mutation     | Open useWallet.ts                   | `src/hooks/`             |
| View integration  | Open LandingPage.tsx                | `src/pages/`             |
| Check tests       | Read BATCH_TRANSFER_TEST_RESULTS.md | `./`                     |
| View architecture | Read ARCHITECTURE.md                | `./`                     |
| Deploy checklist  | Read DEPLOYMENT_GUIDE.md            | `./`                     |

---

## Next Steps

1. **Code Review**: Have team review BatchTransferModal.tsx
2. **Test**: Run all test scenarios from FEATURE_CHECKLIST.md
3. **Contract**: Integrate with actual batch_transfer contract
4. **Monitor**: Set up error tracking and analytics
5. **Deploy**: Follow DEPLOYMENT_GUIDE.md steps

---

## Support

For questions:

1. Check this quickstart first
2. Read ARCHITECTURE.md for technical details
3. Check BATCH_TRANSFER_TEST_RESULTS.md for acceptance criteria
4. Check inline code comments in component files
5. Ask team lead or original implementer

---

**You're ready to work with the batch transfer modal!** 🚀
