# BuyActionHelperText - Disabled Reason Feature

## Overview

The `BuyActionHelperText` component now supports displaying a disabled reason message when an action cannot be performed. This feature was added in issue-67 to provide users with clear feedback about why a market action is unavailable.

## Usage

### Basic Example

```tsx
import BuyActionHelperText from '@/components/common/BuyActionHelperText';

<BuyActionHelperText
  state="idle"
  disabledReason="Insufficient balance to complete this purchase"
  className="mt-4"
/>
```

### With CreatorCard

```tsx
const CreatorCard: React.FC<CreatorCardProps> = ({ creator, className }) => {
  const { isConnected } = useAccount();
  const [transactionState, setTransactionState] = useState<
    'idle' | 'submitting' | 'failed' | 'success'
  >('idle');

  // Example: Check if user has sufficient balance
  const hasInsufficientBalance = true; // Replace with actual balance check
  const disabledReason = hasInsufficientBalance 
    ? 'Insufficient balance to complete this purchase'
    : undefined;

  return (
    <div>
      {/* ... other card content ... */}
      
      <BuyActionHelperText
        state={transactionState}
        disabledReason={disabledReason}
        className="mt-4"
      />
    </div>
  );
};
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `state` | `'idle' \| 'submitting' \| 'failed' \| 'success'` | Yes | Current transaction state |
| `className` | `string` | No | Additional CSS classes |
| `disabledReason` | `string` | No | Reason message when action is disabled |

## Behavior

- **When `disabledReason` is provided**: Displays the reason text below the main state message with subtle styling (`text-white/40`)
- **When `disabledReason` is empty/null/undefined**: Nothing renders (no empty space or placeholder)
- **Animation**: Smooth fade-in/fade-out with height animation when reason appears/disappears

## Styling

The disabled reason text uses:
- Font size: `0.72rem` (matching the main message)
- Color: `text-white/40` (subtle, non-intrusive)
- Animation: Framer Motion with opacity and height transitions
- Layout: Stacked below the main message with `space-y-2` gap

## Examples of Disabled Reasons

```tsx
// Insufficient balance
disabledReason="Insufficient balance to complete this purchase"

// Network issue
disabledReason="Network connection required to proceed"

// Wallet not connected
disabledReason="Connect your wallet to enable purchases"

// Creator unavailable
disabledReason="This creator is currently unavailable"

// Maximum keys reached
disabledReason="Maximum number of keys already purchased"
```

## Safe Empty Content Handling

The component safely handles all empty cases:

```tsx
// All of these will render nothing for the disabled reason
<BuyActionHelperText state="idle" disabledReason={undefined} />
<BuyActionHelperText state="idle" disabledReason={null} />
<BuyActionHelperText state="idle" disabledReason="" />
<BuyActionHelperText state="idle" disabledReason="   "} /> // whitespace only
<BuyActionHelperText state="idle" /> // prop not provided
```

## Implementation Details

The component uses a conditional check:

```tsx
const hasDisabledReason = disabledReason && disabledReason.trim().length > 0;
```

This ensures:
- Null/undefined values are handled
- Empty strings are ignored
- Whitespace-only strings are ignored
- No empty elements are rendered

## Accessibility

- The disabled reason text is part of the same container as the main message
- Screen readers will announce both the state message and disabled reason
- Color contrast meets WCAG guidelines with `text-white/40` on dark backgrounds

## Complete Example

```tsx
import { useState } from 'react';
import { useAccount } from 'wagmi';
import BuyActionHelperText from '@/components/common/BuyActionHelperText';
import { Button } from '@/components/ui/button';

export function BuyActionExample() {
  const { isConnected } = useAccount();
  const [transactionState, setTransactionState] = useState<
    'idle' | 'submitting' | 'failed' | 'success'
  >('idle');

  // Example conditions that might disable an action
  const userBalance = 0.5; // ETH
  const requiredAmount = 1.0; // ETH
  const isNetworkAvailable = true;
  const hasReachedLimit = false;

  // Determine disabled reason based on conditions
  const getDisabledReason = () => {
    if (!isConnected) {
      return 'Connect your wallet to enable purchases';
    }
    if (userBalance < requiredAmount) {
      return `Insufficient balance. You need ${requiredAmount - userBalance} ETH more`;
    }
    if (!isNetworkAvailable) {
      return 'Network connection required to proceed';
    }
    if (hasReachedLimit) {
      return 'Maximum number of keys already purchased';
    }
    return undefined; // No disabled reason
  };

  const disabledReason = getDisabledReason();
  const isDisabled = !!disabledReason || transactionState === 'submitting';

  return (
    <div className="space-y-4">
      <Button
        onClick={() => setTransactionState('submitting')}
        disabled={isDisabled}
        variant={isConnected ? 'default' : 'outline'}
      >
        Buy Key
      </Button>

      <BuyActionHelperText
        state={transactionState}
        disabledReason={disabledReason}
        className="mt-4"
      />
    </div>
  );
}
```
