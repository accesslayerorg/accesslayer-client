# Batch Transfer Modal - Troubleshooting Guide

## Quick Problem Solver

Find your issue below and follow the solution steps.

---

## 🔴 Critical Issues

### Issue: Modal Crashes on Open

**Symptoms**: Browser shows error, modal doesn't render, console has errors

**Diagnosis Steps**:

1. Check browser console for error messages
2. Look for stack trace
3. Check if walletAddress is null/undefined

**Solutions**:

**Solution A**: Missing walletAddress

```typescript
// In LandingPage.tsx - check if address is being passed
{selectedTransferCreatorId && (
  <BatchTransferModal
    open={batchTransferDialogOpen}
    onOpenChange={setBatchTransferDialogOpen}
    creatorId={selectedTransferCreatorId}
    creatorName={...}
    availableBalance={...}
    walletAddress={address ?? ''} // ← Ensure this exists
  />
)}

// Fix: Use optional chaining
walletAddress={address || 'default-address'}
```

**Solution B**: Missing Query Client Provider

```typescript
// BatchTransferModal uses useQueryClient()
// Must wrap parent with QueryClientProvider

import { QueryClientProvider, QueryClient } from '@tanstack/react-query';

const queryClient = new QueryClient();

<QueryClientProvider client={queryClient}>
  <App />
</QueryClientProvider>
```

**Solution C**: Import Error

```typescript
// Check all imports are correct
import BatchTransferModal from '@/components/common/BatchTransferModal';

// If error, verify:
// 1. File exists: src/components/common/BatchTransferModal.tsx
// 2. Export is correct: export default BatchTransferModal
// 3. Path alias works: @/ → src/
```

---

### Issue: Transfer Button Not Showing

**Symptoms**: Portfolio row has no Transfer button, only Buy/Sell

**Diagnosis Steps**:

1. Check if onTransfer prop is passed
2. Check if desktop/mobile view
3. Check if holding has quantity > 0

**Solutions**:

**Solution A**: onTransfer prop missing

```typescript
// In LandingPage.tsx, check PortfolioHoldingRow props
<PortfolioHoldingRow
  position={position}
  creator={creator}
  onBuy={() => openTradeDialog('buy')}
  onSell={() => openTradeDialog('sell')}
  onTransfer={() => openTransferDialog(position.creatorId)} // ← Add this
  isSubmitting={tradeSubmitting}
  isNetworkMismatch={isNetworkMismatch}
/>
```

**Solution B**: Desktop/Mobile View Issue

```typescript
// Desktop (≥640px): Shows [Buy] [Sell] [Transfer] buttons
// Mobile (<640px): Shows [⋮] dropdown menu

// If not showing, check:
// 1. Is it above or below sm: 640px breakpoint?
// 2. Are Tailwind CSS classes loading?
// 3. Check: className="hidden sm:flex" and className="sm:hidden"
```

**Solution C**: No quantity to transfer

```typescript
// Transfer button is disabled if position.quantity is 0

// Check: Does the holding have keys?
// Fix: Only show Transfer button if quantity > 0
disabled={isLocked || isNetworkMismatch || isSubmitting || !position.quantity}
```

---

### Issue: Modal Opens but Can't Add Recipients

**Symptoms**: Add button doesn't work, clicking does nothing, no new rows appear

**Diagnosis Steps**:

1. Check browser console for JavaScript errors
2. Check if button is disabled
3. Check component state

**Solutions**:

**Solution A**: Button is disabled

```typescript
// Button can be disabled if:
// 1. isSubmitting is true
// 2. Modal is in disabled state

// Check: Is isSubmitting state stuck?
// Fix: Ensure setIsSubmitting(false) is called in finally block

const handleConfirm = async () => {
	setIsSubmitting(true);
	try {
		// ... code
	} catch (error) {
		// ... error handling
	} finally {
		setIsSubmitting(false); // ← Make sure this exists
	}
};
```

**Solution B**: React state not updating

```typescript
// If rows don't update, check useState is working
const [rows, setRows] = useState<TransferRow[]>([]);

// Make sure setRows is creating new array reference
// ❌ WRONG:
rows.push(newRow);
setRows(rows);

// ✅ CORRECT:
setRows([...rows, newRow]);
```

**Solution C**: Key collision

```typescript
// Each row must have unique ID
const handleAddRow = () => {
	setRows([
		...rows,
		{
			id: Math.random().toString(36).substr(2, 9), // ← Ensure unique
			recipientAddress: '',
			quantity: '1',
		},
	]);
};
```

---

## 🟠 Major Issues

### Issue: Validation Not Working

**Symptoms**: Invalid addresses don't show errors, submit works with bad data

**Diagnosis Steps**:

1. Check if validation logic is in useMemo
2. Check if error messages display
3. Test with known invalid input

**Solutions**:

**Solution A**: Stella regex incorrect

```typescript
// Current regex:
const STELLAR_ADDRESS_RE = /^[G][A-Z2-7]{55}$/;

// Test it:
console.log(STELLAR_ADDRESS_RE.test('GXXXXX...')); // Should be true
console.log(STELLAR_ADDRESS_RE.test('INVALID')); // Should be false

// If not working, try:
const STELLAR_ADDRESS_RE = /^G[A-Z2-7]{55}$/;
```

**Solution B**: useMemo dependency missing

```typescript
// Check useMemo has correct dependencies
const { totalQuantity, rowErrors, isValid } = useMemo(() => {
	// validation logic
}, [rows, availableBalance]); // ← Both must be here
```

**Solution C**: Errors not displayed

```typescript
// In render, check error display
{error && (
  <p className="text-xs text-red-400" role="alert">
    {error}
  </p>
)}

// If error not showing:
// 1. Check error is in rowErrors Map
// 2. Check component is re-rendering
// 3. Check CSS is not hiding it
```

---

### Issue: Balance Checking Not Working

**Symptoms**: Can submit transfer exceeding available balance

**Diagnosis Steps**:

1. Check balance calculation
2. Check isValid logic
3. Check submit button disabled state

**Solutions**:

**Solution A**: Balance variable wrong

```typescript
// Check availableBalance is correct
<BatchTransferModal
  availableBalance={
    holdings.find(h => h.creatorId === selectedTransferCreatorId)?.quantity ?? 0
  }
/>

// Debug: Log the value
console.log('Available balance:', availableBalance);
```

**Solution B**: Total calculation wrong

```typescript
// Ensure totalQuantity is correct
const { totalQuantity } = useMemo(() => {
	let total = 0;
	for (const row of rows) {
		const qty = Number(row.quantity) || 0; // ← Convert to number
		total += qty;
	}
	return { totalQuantity: total };
}, [rows]);

// Debug: Log total
console.log('Total quantity:', totalQuantity);
```

**Solution C**: Submit button not disabled

```typescript
// Button should be disabled when:
// !isValid (which checks balance)

<Button
  onClick={handleConfirm}
  disabled={!isValid || isSubmitting}
>
  Confirm Transfer
</Button>

// Debug: Check isValid
console.log('Is valid:', isValid);
console.log('Balance exceeded:', totalQuantity > availableBalance);
```

---

### Issue: Mobile Layout Broken

**Symptoms**: Modal doesn't fit on small screen, buttons unclickable

**Diagnosis Steps**:

1. Check viewport size
2. Check Tailwind CSS responsive classes
3. Check modal max-width

**Solutions**:

**Solution A**: Viewport not set

```html
<!-- In index.html, check meta viewport tag -->
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
```

**Solution B**: Tailwind responsive classes wrong

```typescript
// Check responsive classes in component
className = 'hidden sm:flex'; // ✅ Hide on mobile, show on sm+
className = 'sm:hidden'; // ✅ Show on mobile, hide on sm+

// If backwards:
className = 'block sm:hidden'; // ✅ Correct for mobile-only
className = 'hidden sm:block'; // ✅ Correct for desktop-only
```

**Solution C**: Modal overflow

```typescript
// In DialogContent, check max-width
<DialogContent className="max-w-2xl">
  // Content

// On mobile, max-w-2xl might be too large
// Use responsive: max-w-lg sm:max-w-2xl
</DialogContent>
```

---

## 🟡 Minor Issues

### Issue: Typing in Address Field Lags

**Symptoms**: Slow response when typing address, UI feels sluggish

**Diagnosis Steps**:

1. Check browser performance (DevTools → Performance)
2. Check if validation is debounced
3. Check for unnecessary re-renders

**Solutions**:

**Solution A**: Validation too expensive

```typescript
// Move validation to useMemo (already done)
// But check it's not doing extra work

const { rowErrors } = useMemo(() => {
	// Should be O(n) where n = number of rows
	// If it's slower, there's extra work
}, [rows, availableBalance]);
```

**Solution B**: Component re-rendering too much

```typescript
// Use React DevTools "Highlight updates"
// to see what's re-rendering

// If whole component re-renders on every keystroke:
// 1. Check for missing dependencies in useMemo
// 2. Check for inline functions (should use useCallback)
```

---

### Issue: Error Message Not Appearing

**Symptoms**: Validation happens but error text doesn't show

**Diagnosis Steps**:

1. Check if error is in Map
2. Check if component renders error
3. Check CSS is not hiding it

**Solutions**:

**Solution A**: Error in wrong place

```typescript
// Errors stored in rowErrors Map by row.id
// Make sure you're checking the right row

{error && ( // ← Should be true when error exists
  <p className="text-xs text-red-400">
    {error}
  </p>
)}
```

**Solution B**: CSS hiding error

```typescript
// Check overflow properties
// If parent has overflow: hidden, error might be hidden

// Fix: Ensure error has room to display
<div className="flex flex-col gap-2"> {/* ← col direction for errors below */}
  <input />
  {error && <p>Error message</p>}
</div>
```

---

### Issue: Confirm Button Not Working

**Symptoms**: Click doesn't submit, nothing happens

**Diagnosis Steps**:

1. Check if button is disabled
2. Check if onClick handler is attached
3. Check for JavaScript errors

**Solutions**:

**Solution A**: Button disabled due to validation

```typescript
// Button disabled if:
disabled={!isValid || isSubmitting}

// Check both conditions:
console.log('isValid:', isValid);
console.log('isSubmitting:', isSubmitting);
```

**Solution B**: onClick not firing

```typescript
// Check onClick handler is attached
<Button
  onClick={handleConfirm} // ← Should be here
  disabled={!isValid || isSubmitting}
>
  Confirm Transfer
</Button>

// Debug: Add console.log
const handleConfirm = async () => {
  console.log('Confirm clicked'); // ← Add this
  // ... rest of code
};
```

**Solution C**: Mutation not executing

```typescript
// Check mutation exists
const mutation = useBatchTransferMutation(walletAddress);

// Check it's being called
await mutation.mutateAsync({ orders });

// Debug: Check mutation state
console.log('Mutation status:', mutation.status);
console.log('Mutation error:', mutation.error);
```

---

## 🟢 Tips & Optimizations

### Performance Tips

**Tip 1**: Use DevTools Performance tab

```
1. Open DevTools → Performance tab
2. Click record
3. Perform action (add row, type in input)
4. Stop recording
5. Analyze the timeline
6. Look for long tasks (> 50ms)
```

**Tip 2**: Check for unnecessary renders

```
// In component add:
console.log('Rendering BatchTransferModal');

// Then open modal and check console
// If logged multiple times per action, something is wrong
```

**Tip 3**: Profile memory usage

```
// In DevTools → Memory → Take heap snapshot
// Do 10 actions
// Take another snapshot
// Compare sizes (should be similar)
```

---

### Debugging Tips

**Tip 1**: Use console.log strategically

```typescript
const handleAddRow = () => {
	console.log('Before add:', rows.length);
	setRows([...rows, newRow]);
	console.log('After add:', rows.length); // ← Won't print yet (state is async)
};

// Better:
useEffect(() => {
	console.log('Rows updated:', rows.length);
}, [rows]);
```

**Tip 2**: Use React DevTools

```
1. Highlight component
2. Check "Highlight updates" checkbox
3. Perform action
4. Watch component highlight to see re-renders
```

**Tip 3**: Use Network tab

```
1. Open DevTools → Network tab
2. Perform transfer
3. Look for contract call
4. Check response payload
5. Verify it matches expected format
```

---

## 📞 Getting Help

### If You're Stuck

1. **Check this guide** - Your issue might be listed
2. **Check console** - Look for error messages
3. **Check browser DevTools** - Inspect element state
4. **Check documentation** - Read ARCHITECTURE.md
5. **Ask team** - Reach out if still stuck

### Escalation Path

1. **Try troubleshooting** (this document)
2. **Check documentation** (ARCHITECTURE.md, DEVELOPER_QUICKSTART.md)
3. **Ask fellow developers**
4. **Contact tech lead**

---

## Quick Reference

| Problem                 | Solution                 | Docs                    |
| ----------------------- | ------------------------ | ----------------------- |
| Modal won't open        | Check onTransfer prop    | DEVELOPER_QUICKSTART.md |
| Transfer button missing | Check onTransfer passed  | ARCHITECTURE.md         |
| Validation not working  | Check useMemo            | ARCHITECTURE.md         |
| Balance check failing   | Check totalQuantity calc | ARCHITECTURE.md         |
| Mobile broken           | Check responsive classes | ARCHITECTURE.md         |
| Performance issues      | Profile with DevTools    | TESTING_GUIDE.md        |

---

## 🎯 Summary

Most issues are caused by:

1. ✅ Missing props or imports
2. ✅ State not updating correctly
3. ✅ Validation logic errors
4. ✅ Event handlers not firing
5. ✅ CSS/layout issues

**Check these first and most issues will be resolved!** ✨
