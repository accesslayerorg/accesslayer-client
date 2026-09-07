# Batch Transfer Modal - Comprehensive Testing Guide

## Overview

This guide provides detailed testing procedures for the batch transfer modal feature. It includes automated test examples, manual testing scenarios, and debugging tips.

---

## 🧪 Test Setup

### Prerequisites

- Node.js and npm/pnpm installed
- React DevTools browser extension
- Testing library installed (@testing-library/react)
- Component files accessible

### Test Environment

- Development mode: `npm run dev`
- Test mode: `npm run test`
- Build mode: `npm run build`

---

## 🔧 Unit Tests

### Test File Structure

```typescript
// __tests__/BatchTransferModal.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import BatchTransferModal from '../BatchTransferModal';

describe('BatchTransferModal', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient();
  });

  const renderModal = (props = {}) => {
    const defaultProps = {
      open: true,
      onOpenChange: jest.fn(),
      creatorId: 'test-creator',
      creatorName: 'Test Creator',
      availableBalance: 100,
      walletAddress: 'test-wallet',
    };

    return render(
      <QueryClientProvider client={queryClient}>
        <BatchTransferModal {...defaultProps} {...props} />
      </QueryClientProvider>
    );
  };

  // Tests follow below
});
```

### Test 1: Max Recipients (10)

```typescript
it('should not allow more than 10 recipients', async () => {
	renderModal();

	const addButton = screen.getByText('Add Recipient');

	// Add 10 recipients
	for (let i = 0; i < 10; i++) {
		fireEvent.click(addButton);
	}

	// Button should be disabled/hidden
	expect(screen.queryByText('Add Recipient')).not.toBeInTheDocument();

	// Toast error should appear when trying to add more
	const rows = screen.getAllByLabelText(/Recipient \d+/);
	expect(rows).toHaveLength(10);
});
```

### Test 2: Stellar Address Validation

```typescript
it('should validate Stellar addresses', async () => {
	renderModal();

	const addButton = screen.getByText('Add Recipient');
	fireEvent.click(addButton);

	const addressInput = screen.getByPlaceholderText('G...');

	// Test invalid address
	fireEvent.change(addressInput, { target: { value: 'INVALID' } });
	fireEvent.blur(addressInput);

	await waitFor(() => {
		expect(screen.getByText('Invalid Stellar address')).toBeInTheDocument();
	});

	// Test valid address
	const validAddress =
		'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'; // 56 chars
	fireEvent.change(addressInput, { target: { value: validAddress } });
	fireEvent.blur(addressInput);

	await waitFor(() => {
		expect(
			screen.queryByText('Invalid Stellar address')
		).not.toBeInTheDocument();
	});
});
```

### Test 3: Total Quantity Calculation

```typescript
it('should calculate total quantity correctly', async () => {
	renderModal();

	const addButton = screen.getByText('Add Recipient');

	// Add first recipient
	fireEvent.click(addButton);
	let qtyInputs = screen.getAllByLabelText('Qty');
	fireEvent.change(qtyInputs[0], { target: { value: '10' } });

	// Add second recipient
	fireEvent.click(addButton);
	qtyInputs = screen.getAllByLabelText('Qty');
	fireEvent.change(qtyInputs[1], { target: { value: '20' } });

	// Check total
	await waitFor(() => {
		expect(screen.getByText('Total Keys:')).toBeInTheDocument();
		const totalText = screen.getByText(/30/); // 10 + 20
		expect(totalText).toBeInTheDocument();
	});
});
```

### Test 4: Balance Exceeded

```typescript
it('should show error when balance exceeded', async () => {
	renderModal({ availableBalance: 50 });

	const addButton = screen.getByText('Add Recipient');
	fireEvent.click(addButton);

	const addressInput = screen.getByPlaceholderText('G...');
	const qtyInput = screen.getByLabelText('Qty');

	fireEvent.change(addressInput, {
		target: {
			value: 'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
		},
	});
	fireEvent.change(qtyInput, { target: { value: '60' } }); // Exceeds 50

	await waitFor(() => {
		expect(
			screen.getByText('Transfer exceeds available balance')
		).toBeInTheDocument();
	});

	const confirmButton = screen.getByText('Confirm Transfer');
	expect(confirmButton).toBeDisabled();
});
```

### Test 5: Remove Row

```typescript
it('should remove recipient row when delete button clicked', async () => {
	renderModal();

	const addButton = screen.getByText('Add Recipient');
	fireEvent.click(addButton);
	fireEvent.click(addButton);

	let labels = screen.getAllByText(/Recipient \d+/);
	expect(labels).toHaveLength(2);

	const removeButtons = screen.getAllByLabelText('Remove');
	fireEvent.click(removeButtons[0]);

	await waitFor(() => {
		labels = screen.queryAllByText(/Recipient \d+/);
		expect(labels).toHaveLength(1);
	});
});
```

---

## 🎯 Integration Tests

### Portfolio Row Transfer Button

```typescript
describe('PortfolioHoldingRow - Transfer Button', () => {
  it('should open BatchTransferModal when Transfer clicked', async () => {
    const onTransfer = jest.fn();

    render(
      <PortfolioHoldingRow
        position={{ creatorId: 'test', quantity: 100 }}
        onTransfer={onTransfer}
      />
    );

    const transferButton = screen.getByText('Transfer');
    fireEvent.click(transferButton);

    expect(onTransfer).toHaveBeenCalledWith('test');
  });
});
```

### Mutation Hook

```typescript
describe('useBatchTransferMutation', () => {
	it('should call contract with correct payload', async () => {
		const mockContract = {
			transfer: jest.fn().mockResolvedValue({ success: true }),
		};

		const { result } = renderHook(
			() => useBatchTransferMutation('wallet-address'),
			{ wrapper: QueryClientProvider }
		);

		const orders = [
			{
				creatorId: '1',
				recipientAddress: 'GXXXXXX...',
				quantity: 10,
			},
		];

		await waitFor(() => {
			result.current.mutate({ orders });
		});

		expect(mockContract.transfer).toHaveBeenCalled();
	});
});
```

---

## 📋 Manual Testing Scenarios

### Scenario 1: Basic Single Transfer

**Steps**:

1. Navigate to portfolio section
2. Find a holding with balance > 0
3. Click Transfer button
4. Modal opens
5. Enter valid recipient address (starts with G, 56 chars)
6. Enter quantity 1-10
7. Click Confirm Transfer
8. Success toast appears
9. Modal closes

**Expected Result**: ✅ Modal closes, holdings updated

---

### Scenario 2: Maximum Recipients

**Steps**:

1. Open Transfer modal
2. Click "Add Recipient" 10 times
3. Fill all with valid addresses and quantities
4. Try to add 11th recipient
5. Verify button is hidden or error toast appears

**Expected Result**: ✅ Cannot add more than 10

---

### Scenario 3: Validation Errors

**Steps**:

1. Open Transfer modal
2. Click Add Recipient
3. Leave address empty, focus on quantity
4. Check error appears: "Address required"
5. Enter invalid address (8 chars)
6. Check error: "Invalid Stellar address"
7. Enter quantity 0
8. Check error: "Quantity must be greater than 0"

**Expected Result**: ✅ All errors display, Confirm disabled

---

### Scenario 4: Balance Protection

**Steps**:

1. Note available balance (e.g., 50 keys)
2. Open Transfer modal
3. Add recipient with 30 keys
4. Add recipient with 25 keys (total 55 > 50)
5. Check red alert: "Transfer exceeds available balance"
6. Reduce second recipient to 10 keys (total 40)
7. Alert disappears, Confirm enabled

**Expected Result**: ✅ Protected from overspending

---

### Scenario 5: Mobile Responsiveness

**Steps**:

1. Open on mobile or use DevTools (< 640px)
2. Portfolio row should show MoreHorizontal button
3. Tap button
4. Dropdown menu appears
5. Select Transfer
6. Modal opens in mobile view
7. Complete transfer flow

**Expected Result**: ✅ Works on small screens

---

### Scenario 6: Error Recovery

**Steps**:

1. Start valid transfer
2. Simulate network error (pause connection)
3. Click Confirm
4. Wait for error toast
5. Confirm button re-enabled
6. Resume connection
7. Try again

**Expected Result**: ✅ Can retry after error

---

## 🔍 Browser Testing

### Chrome

```bash
# Open DevTools (F12)
# Check Console for errors
# Test desktop and mobile views
# Use DevTools device emulation
```

### Firefox

```bash
# Use Developer Tools (F12)
# Check accessibility tree
# Verify keyboard navigation
```

### Safari

```bash
# Enable Developer Menu (Preferences → Advanced)
# Use Web Inspector
# Test on actual iOS device if possible
```

### Edge

```bash
# Open DevTools (F12)
# Test IE compatibility mode if needed
# Verify on Windows
```

---

## ♿ Accessibility Testing

### Keyboard Navigation

```
Tab through all interactive elements:
1. Add Recipient button → Enter activates
2. Address input (each row) → Type enters address
3. Quantity input (each row) → Type enters number
4. Remove button (each row) → Enter removes row
5. Cancel button → Enter closes
6. Confirm button → Enter submits
```

### Screen Reader Testing

```
NVDA (Windows):
1. Open NVDA
2. Tab to Transfer button
3. Press Enter
4. Modal should announce "Transfer modal opened"
5. Tab through all inputs
6. Verify labels announced for each input
7. Verify errors announced as alerts

VoiceOver (macOS/iOS):
1. Enable VoiceOver (Cmd+F5)
2. Navigate with VO+arrow keys
3. Verify element roles announced
4. Verify form labels announced
5. Verify error messages announced
```

### Color Contrast

```
Required: 4.5:1 for text on background

Check with:
- Chrome DevTools (Lighthouse)
- WebAIM Contrast Checker
- Color Oracle (free)

Test:
- Error text vs background (should be red + icon, not color only)
- Button text vs button background
- Labels vs background
```

---

## 📊 Performance Testing

### Load Testing

```typescript
// Measure render time
console.time('modal-render');
// Open modal
console.timeEnd('modal-render');

// Expected: < 50ms
```

### Memory Leaks

```javascript
// In browser console
// Open DevTools → Memory → Heap snapshots

// 1. Take heap snapshot
// 2. Open modal 10 times
// 3. Close modal 10 times
// 4. Take another heap snapshot
// 5. Compare sizes (should be similar)
```

### Input Performance

```javascript
// Test rapid input changes
const input = document.querySelector('input[placeholder="G..."]');

for (let i = 0; i < 100; i++) {
	input.value = `G${'X'.repeat(55)}`;
	input.dispatchEvent(new Event('change', { bubbles: true }));
}

// Should handle without lag
```

---

## 🐛 Debugging Tips

### React DevTools

```
1. Install React DevTools extension
2. Open browser DevTools
3. Go to React tab
4. Find BatchTransferModal component
5. Check props in right panel
6. Check hooks state
7. Can click "Highlight updates" to see re-renders
```

### Console Logging

```typescript
// Check for [batch-transfer-*] logs
// Should see:
// [batch-transfer-initiated]
// [batch-transfer-submitted]
// [batch-transfer-completed]
// [batch-transfer-failed] (if error)
```

### Network Debugging

```
1. Open DevTools → Network tab
2. Perform transfer
3. Look for:
   - Contract call request
   - Response with success/error
   - Check timing
   - Check payload
```

### Common Issues

**Issue**: Modal won't open

- Check: Is onTransfer prop passed?
- Check: Is selectedTransferCreatorId set?
- Check: Is batchTransferDialogOpen true?

**Issue**: Validation not working

- Check: Is STELLAR_ADDRESS_RE correct?
- Check: Is useMemo dependency array correct?
- Check: Are row.id values unique?

**Issue**: Confirm button always disabled

- Check: Are all rows valid?
- Check: Is total <= balance?
- Check: Are there any rows?

**Issue**: Modal won't close after submit

- Check: Is onOpenChange being called?
- Check: Is isSubmitting state being reset?
- Check: Are there any errors in console?

---

## ✅ Testing Checklist

- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] All 6 manual scenarios pass
- [ ] Desktop responsiveness verified
- [ ] Mobile responsiveness verified
- [ ] Keyboard navigation works
- [ ] Screen reader compatible
- [ ] Color contrast verified
- [ ] No console errors
- [ ] No memory leaks
- [ ] Performance acceptable
- [ ] Browser compatibility verified

---

## 📝 Test Report Template

```markdown
# Batch Transfer Modal - Test Report

Date: _______________
Tester: _______________
Build: _______________

## Test Results

### Unit Tests

- [ ] Max recipients test: PASS / FAIL
- [ ] Address validation test: PASS / FAIL
- [ ] Total calculation test: PASS / FAIL
- [ ] Balance exceeded test: PASS / FAIL
- [ ] Remove row test: PASS / FAIL

### Manual Tests

- [ ] Basic single transfer: PASS / FAIL
- [ ] Maximum recipients: PASS / FAIL
- [ ] Validation errors: PASS / FAIL
- [ ] Balance protection: PASS / FAIL
- [ ] Mobile responsiveness: PASS / FAIL
- [ ] Error recovery: PASS / FAIL

### Accessibility

- [ ] Keyboard navigation: PASS / FAIL
- [ ] Screen reader: PASS / FAIL
- [ ] Color contrast: PASS / FAIL

### Browser Compatibility

- [ ] Chrome: PASS / FAIL / N/A
- [ ] Firefox: PASS / FAIL / N/A
- [ ] Safari: PASS / FAIL / N/A
- [ ] Edge: PASS / FAIL / N/A

### Performance

- [ ] Render time < 50ms: PASS / FAIL
- [ ] No memory leaks: PASS / FAIL
- [ ] Smooth input: PASS / FAIL

### Issues Found

1. ***
2. ***
3. ***

## Sign-Off

- Tester: _______________ Date: ___
- Lead: _______________ Date: ___
```

---

## 🚀 Running Tests

### All Tests

```bash
npm run test
```

### Specific Test File

```bash
npm run test BatchTransferModal.test.tsx
```

### Watch Mode

```bash
npm run test -- --watch
```

### Coverage Report

```bash
npm run test -- --coverage
```

### Generate Report

```bash
npm run test -- --coverage --coverageReporters=html
# Open coverage/index.html
```

---

## Conclusion

This testing guide ensures comprehensive coverage of the batch transfer modal across:

- ✅ Unit tests (component logic)
- ✅ Integration tests (component interactions)
- ✅ Manual tests (user scenarios)
- ✅ Accessibility (WCAG compliance)
- ✅ Performance (speed and stability)
- ✅ Browser compatibility

**Ready to test!** 🎯
