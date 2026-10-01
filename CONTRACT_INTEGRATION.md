# Batch Transfer Modal - Contract Integration Guide

## Overview

The batch transfer modal is currently using a simulated 1200ms delay for testing. This guide walks through integrating it with the actual on-chain `batch_transfer` contract function.

---

## Current Implementation (Demo)

**File**: `src/hooks/useWallet.ts`

```typescript
const mutation = useMutation({
	mutationKey: ['batch-transfer', address],
	mutationFn: async ({ orders }: { orders: BatchTransferOrder[] }) => {
		// Simulates 1200ms delay
		void orders;
		await new Promise<void>(resolve => window.setTimeout(resolve, 1200));
		return { success: true as const };
	},
	// ... rest of mutation config
});
```

---

## Integration Steps

### Step 1: Define Contract Types

Create or update your contract interface file (e.g., `src/services/contract.service.ts`):

```typescript
export interface BatchTransferPayload {
	transfers: Array<{
		creatorId: string;
		recipientAddress: string;
		quantity: number;
	}>;
}

export interface BatchTransferResponse {
	success: boolean;
	txHash?: string;
	error?: string;
}

export interface IBatchTransferContract {
	transfer(payload: BatchTransferPayload): Promise<BatchTransferResponse>;
}
```

### Step 2: Import Contract Service

Update `src/hooks/useWallet.ts`:

```typescript
// Add import at top
import { batchTransferContract } from '@/services/contract.service';
```

### Step 3: Replace Mutation Function

Replace the simulated delay with actual contract call:

```typescript
const mutation = useMutation({
	mutationKey: ['batch-transfer', address],
	mutationFn: async ({ orders }: { orders: BatchTransferOrder[] }) => {
		// Call actual contract
		const response = await batchTransferContract.transfer({
			transfers: orders.map(order => ({
				creatorId: order.creatorId,
				recipientAddress: order.recipientAddress,
				quantity: order.quantity,
			})),
		});

		if (!response.success) {
			throw new Error(response.error || 'Batch transfer failed');
		}

		return { success: true as const };
	},

	// ... onMutate, onError, onSuccess, onSettled remain the same
});
```

### Step 4: Enhanced Error Handling

For better error messages, update the `onError` handler:

```typescript
onError: (error, variables, context) => {
	const holdingsKey = queryKeys.wallet.holdings(address);

	// Rollback optimistic update
	if (context?.previousHoldings) {
		queryClient.setQueryData(holdingsKey, context.previousHoldings);
	}

	// Handle specific contract errors
	let errorMessage = 'Transfer failed';

	if (error instanceof Error) {
		const message = error.message.toLowerCase();

		if (message.includes('insufficient_balance')) {
			errorMessage = 'Insufficient balance for one or more transfers';
		} else if (message.includes('invalid_recipient')) {
			errorMessage = 'One or more recipient addresses are invalid';
		} else if (message.includes('invalid_address')) {
			errorMessage = 'Invalid recipient address format';
		} else if (message.includes('rate_limited')) {
			errorMessage = 'Too many transfers. Please wait before trying again.';
		} else if (message.includes('network')) {
			errorMessage =
				'Network error. Please check your connection and try again.';
		} else if (message.includes('rejected')) {
			errorMessage = 'Transaction was rejected. Please try again.';
		} else if (message.includes('timeout')) {
			errorMessage = 'Transaction timed out. Please try again.';
		} else {
			errorMessage = getSignatureErrorMessage(error);
		}
	}

	showToast.error(errorMessage);

	// Log for debugging
	if (process.env.NODE_ENV !== 'test') {
		const truncatedAddress = address
			? `${address.slice(0, 4)}...${address.slice(-4)}`
			: 'unknown';

		console.debug('[batch-transfer-failed]', {
			error_code: error instanceof Error ? error.name : String(error),
			error_message: errorMessage,
			recipient_count: variables.orders.length,
			total_quantity: variables.orders.reduce(
				(sum, o) => sum + o.quantity,
				0
			),
			wallet_address: truncatedAddress,
			failed_at: new Date().toISOString(),
		});
	}
};
```

---

## Contract Method Specification

Expected contract interface:

```solidity
// Pseudocode - actual implementation depends on your blockchain
contract KeyTransfer {
  function batch_transfer(
    Transfer[] transfers
  ) public returns (bool success, string txHash) {
    // transfers[].creatorId - which creator's keys
    // transfers[].recipientAddress - destination wallet
    // transfers[].quantity - number of keys to transfer

    require(transfers.length <= 10, "Max 10 transfers");

    for (Transfer t in transfers) {
      validateAddress(t.recipientAddress);
      validateQuantity(t.quantity);
      transfer(t.creatorId, t.recipientAddress, t.quantity);
    }

    return true;
  }
}
```

---

## Testing the Integration

### Unit Test Example

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { useBatchTransferMutation } from '@/hooks/useWallet';

describe('useBatchTransferMutation', () => {
	it('should call contract.transfer with correct payload', async () => {
		const mockContract = {
			transfer: jest.fn().mockResolvedValue({
				success: true,
				txHash: '0xabc123',
			}),
		};

		const { result } = renderHook(() =>
			useBatchTransferMutation('userAddress')
		);

		await waitFor(() => {
			result.current.mutate({
				orders: [
					{
						creatorId: '1',
						recipientAddress: 'GXXXXX...',
						quantity: 10,
					},
				],
			});
		});

		expect(mockContract.transfer).toHaveBeenCalledWith({
			transfers: [
				{
					creatorId: '1',
					recipientAddress: 'GXXXXX...',
					quantity: 10,
				},
			],
		});
	});
});
```

### Manual Testing Checklist

- [ ] Contract method callable from frontend
- [ ] Valid transfers succeed
- [ ] Invalid addresses rejected
- [ ] Insufficient balance handled
- [ ] Rate limiting handled
- [ ] Network errors handled
- [ ] Transaction hash returned
- [ ] Cache invalidated after success
- [ ] Optimistic update rolled back on failure
- [ ] Error toast shows helpful message

---

## Common Contract Error Scenarios

### 1. Insufficient Balance

**Contract Error**: `Error: insufficient_balance`

**Frontend Handling**:

```typescript
if (message.includes('insufficient_balance')) {
	errorMessage = "You don't have enough keys to complete this transfer";

	// Show user their current balance
	showToast.error(errorMessage);
}
```

### 2. Invalid Recipient Address

**Contract Error**: `Error: invalid_recipient_G123...`

**Frontend Handling**:

```typescript
if (message.includes('invalid_recipient')) {
	const match = message.match(/invalid_recipient_(G[A-Z2-7]{55})/);
	const invalidAddr = match ? match[1] : 'unknown';

	errorMessage = `Invalid recipient address: ${invalidAddr}`;
}
```

### 3. Rate Limiting

**Contract Error**: `Error: rate_limited`

**Frontend Handling**:

```typescript
if (message.includes('rate_limited')) {
	errorMessage =
		'Too many transfers recently. Please wait 5 minutes before trying again.';

	// Show countdown timer to user
	showRateLimitWarning(300); // 5 minutes in seconds
}
```

### 4. Network/Connection Error

**Contract Error**: `Error: network timeout`

**Frontend Handling**:

```typescript
if (message.includes('timeout') || message.includes('network')) {
	errorMessage =
		'Network error. Your transfer may still process. Please check back in a few moments.';

	// Don't clear modal - let user see what they entered
	// Keep isSubmitting = false to allow retry
}
```

---

## Handling Edge Cases

### Empty Orders Array

```typescript
if (!orders || orders.length === 0) {
	throw new Error('No transfers specified');
}
```

### Duplicate Recipients

```typescript
const uniqueRecipients = new Set(orders.map(o => o.recipientAddress));
if (uniqueRecipients.size !== orders.length) {
	throw new Error('Duplicate recipient addresses not allowed');
}
```

### Quantity Precision

```typescript
// If contract expects integers
const validOrders = orders.map(o => ({
	...o,
	quantity: Math.floor(o.quantity), // Convert to integer
}));

// If contract expects decimals
const validOrders = orders.map(o => ({
	...o,
	quantity: parseFloat(o.quantity.toFixed(2)), // 2 decimal places
}));
```

---

## Performance Considerations

### 1. Batch Size Optimization

Current limit: 10 recipients

```typescript
// If contract has different limits
const MAX_RECIPIENTS_PER_BATCH = 5; // Adjust as needed

if (orders.length > MAX_RECIPIENTS_PER_BATCH) {
	// Split into multiple calls
	for (let i = 0; i < orders.length; i += MAX_RECIPIENTS_PER_BATCH) {
		const batch = orders.slice(i, i + MAX_RECIPIENTS_PER_BATCH);
		await contract.transfer({ transfers: batch });
	}
}
```

### 2. Timeout Configuration

```typescript
const TRANSFER_TIMEOUT = 30_000; // 30 seconds

const response = await Promise.race([
	batchTransferContract.transfer(payload),
	new Promise((_, reject) =>
		setTimeout(() => reject(new Error('Transfer timeout')), TRANSFER_TIMEOUT)
	),
]);
```

---

## Monitoring & Analytics

### Track Successful Transfers

```typescript
onSuccess: (_data, variables) => {
	const totalQuantity = variables.orders.reduce(
		(sum, o) => sum + o.quantity,
		0
	);

	trackEvent('batch_transfer_success', {
		recipient_count: variables.orders.length,
		total_quantity: totalQuantity,
		timestamp: new Date().toISOString(),
	});
};
```

### Track Failed Transfers

```typescript
onError: (error, variables) => {
	const totalQuantity = variables.orders.reduce(
		(sum, o) => sum + o.quantity,
		0
	);

	trackEvent('batch_transfer_failed', {
		error_type: error instanceof Error ? error.name : 'unknown',
		error_message: error instanceof Error ? error.message : String(error),
		recipient_count: variables.orders.length,
		total_quantity: totalQuantity,
		timestamp: new Date().toISOString(),
	});
};
```

---

## Security Considerations

### 1. Address Validation

```typescript
// Before sending to contract
const isValidAddress = (addr: string): boolean => {
	// Stellar address format: G + 55 alphanumeric
	if (!/^[G][A-Z2-7]{55}$/.test(addr)) {
		return false;
	}

	// Add checksum validation if available
	// return validateChecksum(addr);
	return true;
};

orders.forEach(order => {
	if (!isValidAddress(order.recipientAddress)) {
		throw new Error(`Invalid address: ${order.recipientAddress}`);
	}
});
```

### 2. Quantity Validation

```typescript
// Prevent negative or unreasonable amounts
const isValidQuantity = (qty: number): boolean => {
	return qty > 0 && qty <= MAX_QUANTITY && Number.isSafeInteger(qty);
};

orders.forEach(order => {
	if (!isValidQuantity(order.quantity)) {
		throw new Error(`Invalid quantity: ${order.quantity}`);
	}
});
```

### 3. Authorization Check

```typescript
// Verify user owns the keys they're transferring
const userHoldings = await getUserHoldings(address, creatorId);
const totalTransfer = orders.reduce((sum, o) => sum + o.quantity, 0);

if (totalTransfer > userHoldings) {
	throw new Error('Insufficient balance');
}
```

---

## Rollback & Recovery

### If Contract Integration Fails

1. **Revert to Demo Mode**

   ```typescript
   // Temporarily revert to simulated delay
   mutationFn: async ({ orders }: { orders: BatchTransferOrder[] }) => {
   	await new Promise<void>(resolve => window.setTimeout(resolve, 1200));
   	return { success: true as const };
   };
   ```

2. **Disable Feature**

   ```typescript
   const FEATURE_DISABLED = true; // Set in env or config

   if (FEATURE_DISABLED) {
   	return; // Don't render Transfer button
   }
   ```

3. **Investigate & Fix**
   - Check contract method signature
   - Check network connection
   - Check gas/fee estimates
   - Check authorization

---

## Contract Testing Tools

### Recommended Approaches

1. **Local Testing**
   - Use contract simulator/emulator
   - Run against local blockchain instance
   - Mock contract service

2. **Testnet Testing**
   - Deploy to testnet
   - Use testnet tokens
   - Test with real blockchain behavior

3. **Mainnet Staging**
   - Test with small amounts first
   - Monitor for errors
   - Gradual rollout

---

## Documentation for Contract Team

Share this with your contract developers:

````markdown
## Batch Transfer Contract Specification

### Method Signature

```solidity
function batch_transfer(Transfer[] transfers)
  external
  returns (bool success, string txHash)
```
````

### Input Types

- `transfers`: Array of Transfer objects (max 10)
- `Transfer`:
   - `creatorId: string` - which creator's keys
   - `recipientAddress: string` - destination (Stellar address: G + 55 chars)
   - `quantity: uint` - number of keys to transfer

### Expected Behavior

1. Validate all recipients exist and are active
2. Validate all quantities are positive
3. Validate sender has sufficient balance
4. Execute all transfers atomically
5. Return transaction hash on success
6. Throw error if any validation fails

### Error Cases to Handle

- "insufficient_balance" - sender doesn't have enough
- "invalid_recipient_[address]" - recipient address invalid
- "rate_limited" - user is rate limited
- "network_error" - blockchain network error

```

---

## Conclusion

The batch transfer modal is designed to be contract-agnostic. Follow these steps to integrate with your actual contract:

1. ✅ Define contract types and interface
2. ✅ Replace simulated delay with contract call
3. ✅ Add error handling for contract errors
4. ✅ Test thoroughly (unit, integration, manual)
5. ✅ Monitor in production
6. ✅ Have rollback plan ready

**Ready to integrate?** Let's go! 🚀
```
