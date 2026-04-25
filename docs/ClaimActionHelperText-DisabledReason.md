# Claim Action Disabled Reason Helper Text

This change introduces a centralized helper for claim action disabled reasons:

- Utility: `getClaimActionDisabledReasonText`
- File: `src/utils/claimActionDisabledReason.ts`

## Why

The helper standardizes claim disabled-reason text so messaging stays consistent and always includes:

1. **Clear cause** (why claim is disabled)
2. **Next step** (what the user should do)

This mirrors the tone used in trade action helper messaging.

## Supported reason keys

- `wallet_not_connected`
- `no_claimable_rewards`
- `claim_in_progress`
- `network_mismatch`
- `insufficient_gas`
- `unknown`

## Usage

```ts
import { getClaimActionDisabledReasonText } from '@/utils/claimActionDisabledReason';

const disabledReason = getClaimActionDisabledReasonText('wallet_not_connected');
// "Claim is unavailable because your wallet is not connected. Connect your wallet to continue."
```

## Local validation

Run:

```bash
pnpm test src/utils/__tests__/claimActionDisabledReason.test.ts
```
