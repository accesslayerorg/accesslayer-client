# Error Handling Conventions

> Issue #630 — Establish the expected pattern for every error category
> (boundary, query state, mutation feedback, transaction surface, network
> warning) so the UI feels consistent regardless of which component rendered
> the error.

This guide is the **single source of truth** for how errors are surfaced in
the Access Layer client. Pair it with
[Error Handling in React Query Hooks](./error-handling-in-hooks.md) for the
hook-side `ApiError` branching detail and
[State Management](./state-management.md) for the
[Error Architecture Strategy](./state-management.md#3-error-architecture-strategy-boundary-vs-inline-states)
section that motivates the boundary/inline split.

---

## The Five Error Display Modes

Every error in the client surfaces through **one of five modes**. Pick the
right one based on where the error came from and what the user still needs
to be able to do.

| #   | Mode                 | Trigger                                 | Audience        | Component (canonical)                                 |
| --- | -------------------- | --------------------------------------- | --------------- | ----------------------------------------------------- |
| 1   | **Toast**            | `useMutation.onError` (user action)     | Glanceable      | `showToast.error` from `@/utils/toast.util`           |
| 2   | **Inline state**     | `useQuery` `isError` (blocking content) | Focused         | `CreatorProfileErrorState`, section-level cards       |
| 3   | **Section boundary** | Render-time throw in a sub-component    | Isolated retry  | `SectionErrorBoundary` from `@/components/common`     |
| 4   | **Page boundary**    | Render-time throw on a whole page       | Whole route     | `CreatorPageErrorBoundary`, `AppErrorBoundary`        |
| 5   | **Tx surface**       | On-chain trade write failure            | Detail-oriented | `TransactionRetryNotice` + `TransactionFailureDrawer` |

**Plus one always-on overlay** for a precondition state:

| #   | Mode               | Trigger                       | Audience          | Component                                          |
| --- | ------------------ | ----------------------------- | ----------------- | -------------------------------------------------- |
| 6   | **Network banner** | Connected wallet, wrong chain | Persistent notice | `NetworkMismatchBanner` from `@/components/common` |

---

## Decision Flowchart

Walk this top to bottom. The first matching branch wins.

```
Did the error come from a user-initiated write (buy, sell, enroll, claim, …)?
├── YES → Mode 1 (Toast)                              — see "Mode 1: Toasts"
│        Special: On-chain writes → also open Mode 5 drawer for detail
└── NO  → Did it come from a useQuery that blocks the page?
         ├── YES → Mode 2 (Inline state)              — see "Mode 2: Inline"
         └── NO  → Did something throw while rendering JSX?
                  ├── YES inside a sub-component →
                  │       Mode 3 (SectionErrorBoundary)
                  ├── YES at the route level →
                  │       Mode 4 (Page boundary)
                  └── NO  → Re-check the trigger; you may have an
                            unhandled case — default to Mode 4 (the last
                            line of defense is `AppErrorBoundary`).

Network mismatch? → Mode 6 banner (always-on; renders nothing when healthy).
```

> **Cross-link.** The same boundary vs inline split is described from the
> loading-state angle in
> [State Management → 3. Error Architecture Strategy](./state-management.md#3-error-architecture-strategy-boundary-vs-inline-states).
> This document is the full convention; that section is the executive summary.

---

## Mode 1 — Toasts for Mutation Errors

**Use when:**

- The failure came from a user-initiated write (buy, sell, course enroll,
  profile update, share, copy).
- The page can still render usefully without retrying.
- One short line of feedback is enough — the user needs to know "this
  didn't work" and either retry or change input.

**Don't use when:**

- The failure blocks the primary purpose of the screen (use Mode 2).
- The failure contains field-level validation detail that must attach to a
  specific input (use Mode 2 inline errors with `apiError.response?.errors`).
- You need to retry automatically — toasts disappear, they don't retry.

### Pattern: `useMutation.onError`

Cast the error to `ApiError` and branch on `status`. The numeric scale is
documented in
[Error Handling in Hooks → Distinguishing Error Types](./error-handling-in-hooks.md#distinguishing-error-types);
here is the consolidated decision:

```ts
// src/hooks/useBuyCreatorKey.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '@/services/api.service';
import showToast from '@/utils/toast.util';
import { queryKeys } from '@/lib/queryKeys';
import { creatorKeysService } from '@/services/creatorKeys.service';

export function useBuyCreatorKey() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({
			creatorId,
			amount,
		}: {
			creatorId: string;
			amount: number;
		}) => creatorKeysService.buyKey(creatorId, amount),

		onError: error => {
			const apiError = error as ApiError;

			// 1. Network failure — user is offline / server unreachable
			if (apiError.status === 0) {
				showToast.error(
					'Network error. Check your connection and try again.'
				);
				return;
			}

			// 2. Server failure — not the user's fault; generic + retry
			if (apiError.status >= 500) {
				showToast.error(
					'The server ran into a problem. Please try again shortly.'
				);
				return;
			}

			// 3. Validation — surface the first field error if present
			if (apiError.status === 422 && apiError.response?.errors?.length) {
				showToast.error(apiError.response.errors[0].message);
				return;
			}

			// 4. Other 4xx — API message is safe for the user
			showToast.error(apiError.message);
		},

		onSuccess: (_, { creatorId }) => {
			queryClient.invalidateQueries({
				queryKey: queryKeys.creators.detail(creatorId),
			});
			queryClient.invalidateQueries({ queryKey: queryKeys.wallet.all });
			showToast.success('Key purchased successfully!');
		},
	});
}
```

### Pattern: User rejection (wallet signature)

Wallet signatures can be rejected by the user mid-flow. Detect this with
the shared helper and skip the noisy generic toast:

```ts
// src/hooks/useWalletConnection.ts (excerpt)
import { getSignatureErrorMessage } from '@/utils/errorHandling.utils';
import showToast from '@/utils/toast.util';

onError: error => {
	showToast.error(getSignatureErrorMessage(error));
	// getSignatureErrorMessage returns either:
	//   - WALLET_ERROR_COPY.SIGNATURE_REJECTED  (user clicked "Cancel")
	//   - WALLET_ERROR_COPY.SIGNATURE_FAILED    (other wallet-side failure)
};
```

`getSignatureErrorMessage` is implemented in
[`src/utils/errorHandling.utils.ts`](./../src/utils/errorHandling.utils.ts)
and detects the EIP-1193 code `4001`, ethers' `ACTION_REJECTED`, and the
common message fragments "user rejected" / "declined" / "cancelled".

### Pattern: Off-chain mutation that should NOT use a drawer

Copy-to-clipboard, share-to-Twitter, follow a creator — all of these are
writes that have no chain side effects. Just toast:

```ts
// Excerpt from CreatorProfileHeader
const handleShare = async () => {
	try {
		await navigator.clipboard.writeText(profileUrl);
		showToast.success('Profile link copied to clipboard!');
	} catch {
		showToast.error('Could not copy the profile link. Please try again.');
	}
};
```

---

## Mode 2 — Inline Error State for Blocking Query Failures

**Use when:**

- The query is the primary content of the page (e.g. creator profile header).
- Without the data, the screen is empty; there is nothing else for the user
  to do here.
- You want the user to retry without leaving the page — wire `refetch` from
  React Query.

**Don't use when:**

- The query is enriching a page that can render something else (use Mode 3).
- The failure came from a mutation (use Mode 1).

### Pattern: Canonical shared component

`CreatorProfileErrorState` is the canonical inline error component. It
renders a marketplace-styled card with an icon, a message, and an optional
retry button.

```tsx
// In a creator profile section
import { useCreatorProfile } from '@/hooks/useCreatorProfile';
import CreatorProfileErrorState from '@/components/common/CreatorProfileErrorState';
import { ApiError } from '@/services/api.service';

function CreatorHeader({ creatorId }: { creatorId: string }) {
	const { data, isLoading, isError, error, refetch } =
		useCreatorProfile(creatorId);

	if (isLoading) return <CreatorProfileHeaderSkeleton />;

	if (isError) {
		const apiError = error as ApiError;
		return (
			<CreatorProfileErrorState
				error={apiError}
				onRetry={() => void refetch()}
				isRetrying={
					false /* wire from your query's isFetching if you want */
				}
				title="Unable to load this creator profile"
			/>
		);
	}

	return <CreatorProfileHeader profile={data} />;
}
```

Component contract (from `CreatorProfileErrorStateProps`):

| Prop         | Type                      | Notes                                                      |
| ------------ | ------------------------- | ---------------------------------------------------------- |
| `error`      | `Error \| string \| null` | Drives the message; falls back to a generic copy when null |
| `onRetry`    | `() => void`              | When provided, renders a retry button                      |
| `isRetrying` | `boolean`                 | Spins the refresh icon and disables the button             |
| `title`      | `string`                  | Defaults to "Unable to load this creator profile"          |
| `message`    | `string`                  | When present, overrides the error message                  |

### Pattern: Hand-rolled inline state

For sections that aren't creator profiles (holdings table, transaction
history), inline state is a styled `<div role="alert">` with a refresh
button wired to `refetch`. Always include the retry control — fail without
one and the user has no escape hatch.

```tsx
const { data, isError, error, refetch } = useHoldings(address);

if (isError) {
	const apiError = error as ApiError;
	return (
		<div
			role="alert"
			className="rounded-xl border border-dashed p-8 text-center text-muted-foreground"
		>
			<p className="text-sm">
				{apiError.status >= 500
					? 'Unable to load holdings. Please try again later.'
					: apiError.message}
			</p>
			<button
				type="button"
				onClick={() => void refetch()}
				className="mt-4 px-3 py-1 underline"
			>
				Retry
			</button>
		</div>
	);
}
```

### Inline vs. throw-to-boundary — the rule

> If the failure should leave the rest of the page interactive → render an
> **inline** state. If it means the route as a whole cannot be useful → throw
> the error and let the page-level boundary catch it.

Concretely:

- A creator list failing inside the marketplace page? **Inline.** The hero,
  filters, and holdings are still useful.
- The creator profile header failing on `/creator/:id`? **Throw** →
  `CreatorPageErrorBoundary` renders a "Creator not found" or
  "could not load" page-level state and a back-link.

---

## Mode 3 — Section Error Boundary (Render Falls Here)

**Use when:**

- A sub-component (tab body, sidebar, list section) can throw during render
  — e.g. it consumes data that is undefined when the parent didn't gate it.
- A failure in **this section** should not crash the whole page.
- The user should be able to retry the section without a full reload.

**Don't use when:**

- The error is a query failure (React Query surfaces it via `isError` —
  branch in the component, don't throw).
- The error is from an on-chain mutation (use Mode 5).

### Pattern: Wrap any sub-tree that might throw

```tsx
import SectionErrorBoundary from '@/components/common/SectionErrorBoundary';

// In LandingPage
<SectionErrorBoundary sectionName="Creator List" minHeight={400}>
	<CreatorListSection />
</SectionErrorBoundary>;
```

The retry button on the fallback resets the boundary's internal error
state; it does **not** re-fire the underlying `useQuery`. If you need a
network retry, combine the boundary with a query that has `enabled` tied
to a "retry counter" `useState` and bump it inside the retry handler.

### Pair with `throwOnError`

If you want React Query to throw a render-time exception (so the boundary
catches it) instead of branching on `isError` inside the component, opt in
on the query:

```ts
useQuery({
	queryKey: queryKeys.creators.detail(id),
	queryFn: () => courseService.getById(id),
	throwOnError: error => {
		const api = error as ApiError;
		// 4xx: render inline; 5xx: bubble to boundary
		return api.status >= 500;
	},
});
```

See [Error Handling in Hooks → SectionErrorBoundary](./error-handling-in-hooks.md#use-sectionerrorboundary-when)
for the full reasoning.

---

## Mode 4 — Page-Level Error Boundaries

There are two nested page boundaries; pick the **most specific** one that
fits the route.

### `CreatorPageErrorBoundary` — creator routes

Scoped to `/creator/:id` and any other creator detail route. When a creator
page throws, this catches it and renders a fallback with a "back to
creators" link. It special-cases `ApiError` with `status === 404` to render
a "Creator not found" message instead of a generic failure.

```tsx
// src/pages/CreatorDetailPage.tsx
import CreatorPageErrorBoundary from '@/components/common/CreatorPageErrorBoundary';

export default function CreatorDetailPage() {
	const { id } = useParams<{ id: string }>();
	const { data, isLoading, error } = useCreatorDetail(id ?? '');

	if (!data && !isLoading) {
		throw new ApiError('Creator not found', 404);
	}
	if (error) {
		throw error; // → CreatorPageErrorBoundary
	}

	return <CreatorDetailPageContent data={data} />;
}

// Wrap in the route element (already done in src/routes.tsx):
<CreatorPageErrorBoundary>{routes}</CreatorPageErrorBoundary>;
```

### `AppErrorBoundary` — last line of defense

Mounted once in [`src/App.tsx`](./../src/App.tsx) around the router. When
something throws that isn't caught by a more specific boundary, this is
the last chance before React would otherwise unmount the entire tree. The
fallback offers a **full page reload** rather than resetting local state —
the rationale is documented in the component's source comment.

Reach: anything that escapes a `SectionErrorBoundary` or
`CreatorPageErrorBoundary` will land here.

---

## Mode 5 — Transaction Failure Surfaces

Buy / sell / claim trades have **two** surfaces: an inline
`TransactionRetryNotice` so the user sees a persistent recovery prompt,
and a modal `TransactionFailureDrawer` for full diagnostic detail.

### When to use both together

A failed trade should:

1. Show a `TransactionRetryNotice` in place of the trade action area —
   it stays visible until the user retries or dismisses.
2. Open a `TransactionFailureDrawer` so the user can copy the error code
   or transaction hash for support.

```tsx
// src/components/common/CreatorCard.tsx (excerpt)
import TransactionRetryNotice from '@/components/common/TransactionRetryNotice';
import TransactionFailureDrawer from '@/components/common/TransactionFailureDrawer';
import type { TransactionFailureDetails } from '@/components/common/TransactionFailureDrawer';

const [failure, setFailure] = useState<TransactionFailureDetails | null>(null);

const handleTrade = async (amount: number) => {
	try {
		await buyKey({ creatorId, amount });
	} catch (err) {
		const apiError = err as ApiError;
		setFailure({
			errorMessage: apiError.message,
			errorCode: apiError.response?.code,
			txHash: undefined, // chain-specific; pass when available
			timestamp: Date.now(),
			developerDetails: apiError.response,
		});
	}
};

return (
	<>
		{failure && (
			<>
				<TransactionRetryNotice
					title="Transaction failed"
					message={failure.errorMessage}
					onRetry={() => {
						setFailure(null);
						handleTrade(lastAmount);
					}}
				/>
				<TransactionFailureDrawer
					open={Boolean(failure)}
					failureDetails={failure}
					onRetry={() => {
						setFailure(null);
						handleTrade(lastAmount);
					}}
					onDismiss={() => setFailure(null)}
				/>
			</>
		)}
	</>
);
```

`TransactionFailureDetails`:

| Field              | Type                       | Purpose                                        |
| ------------------ | -------------------------- | ---------------------------------------------- |
| `errorMessage`     | `string` (required)        | User-facing message displayed in the drawer    |
| `txHash`           | `string?`                  | On-chain hash for support; copy-to-clipboard   |
| `errorCode`        | `string?`                  | Machine code (e.g. `INSUFFICIENT_BALANCE`)     |
| `timestamp`        | `number?`                  | Unix ms; rendered via `formatTimestampTooltip` |
| `developerDetails` | `Record<string, unknown>?` | Hidden behind a `<details>` toggle for devs    |

See [`src/components/common/TransactionFailureDrawer.tsx`](./../src/components/common/TransactionFailureDrawer.tsx)
for the component contract.

### When to NOT use the drawer

If the action is not on-chain (share, copy, follow) — toast only. The
drawer exists to expose blockchain-detail information; if there is no
chain context, it adds noise.

---

## Mode 6 — Network Mismatch Banner

`NetworkMismatchBanner` is **always-on**: it reads from
`useNetworkMismatch()` and returns `null` when the wallet is on the
correct network. Mount it once in any layout where users can initiate
trades; it renders nothing in the happy path.

```tsx
// Wherever the user can trade
<main>
	<NetworkMismatchBanner className="mb-6" />
	<CreatorCard creator={creator} />
</main>
```

This is **not** an error per se — it's a precondition warning. Do **not**
also toast "wrong network" on top of this banner; the banner is the
canonical surface.

---

## Branching on `ApiError.status` — Consolidated Cheat Sheet

The same numeric scale drives every mode. Source:
[`src/services/api.service.ts`](./../src/services/api.service.ts) →
[`BaseApiService.handleError`](./../src/services/api.service.ts).

| `apiError.status` | Meaning                  | Toast copy                                                 | Inline copy                                 | Boundary fallback                               |
| ----------------- | ------------------------ | ---------------------------------------------------------- | ------------------------------------------- | ----------------------------------------------- |
| `0`               | No network response      | "Network error. Check your connection and try again."      | "Check your connection and try again."      | `AppErrorBoundary`                              |
| `400`             | Malformed request        | `apiError.message` (safe)                                  | `apiError.message`                          | `AppErrorBoundary`                              |
| `401`             | Session expired          | (interceptor handles — auto-refresh, redirect to `/login`) | n/a                                         | n/a                                             |
| `403`             | Insufficient permissions | `apiError.message`                                         | "You don't have access to this."            | `AppErrorBoundary`                              |
| `404`             | Resource not found       | `apiError.message`                                         | "Not found."                                | `CreatorPageErrorBoundary` (404 special-cases)  |
| `422`             | Validation failure       | `apiError.response.errors[0].message` (first field error)  | Map every `response.errors[i]` to its input | `AppErrorBoundary`                              |
| `429`             | Rate limited             | "Too many requests. Please wait a moment and retry."       | "Rate limited. Try again shortly."          | `AppErrorBoundary`                              |
| `>= 500`          | Server error             | "The server ran into a problem. Please try again shortly." | "Unable to load this. Try again later."     | Section-level (skeleton→empty→relies on inline) |

---

## Adding a New Error Type to the Classification System

The codebase has **two** classification helpers that capture domain
specifics. Pick the one that matches your domain; do not invent a new
helper unless neither fits.

### 1. Wallet & signature errors → extend `WALLET_ERROR_COPY`

File: [`src/utils/errorHandling.utils.ts`](./../src/utils/errorHandling.utils.ts).

Centralized map of wallet-and-signature messages, plus detection helpers:

```ts
export const WALLET_ERROR_COPY = {
	SIGNATURE_REJECTED:
		"Signature request was declined. Please try again when you're ready to confirm.",
	SIGNATURE_FAILED:
		'The signature request failed. Please ensure your wallet is unlocked and try again.',
	GENERIC_TRANSACTION_FAILED:
		'Transaction failed. Please check your balance or connection and try again.',
};

export function isUserRejection(error: unknown): boolean {
	/* … */
}
export function getSignatureErrorMessage(error: unknown): string {
	/* … */
}
```

**To add a new wallet error type:**

1. Append a new key to `WALLET_ERROR_COPY` with a sentence that states the
   cause and the next step.
2. If the detector matters, extend `isUserRejection`-style recognition in
   a new exported predicate (`isRateLimited(error)`, `isChainSwitchRequired(error)`).
3. Wire the predicate + key into the calling hook's `onError` — usually
   by extending `getSignatureErrorMessage` or introducing a sibling
   `getWalletErrorMessage` if the surface is broader than signatures.
4. Add a Vitest unit test under
   `src/utils/__tests__/errorHandling.utils.test.ts` that pins the new
   copy and predicate behavior.

### 2. Pre-action disabled reasons → extend the typed helper

File: [`src/utils/claimActionDisabledReason.ts`](./../src/utils/claimActionDisabledReason.ts).

Pattern: a **closed union** of reason keys + a **single `Record`** that
maps each key to a standardized copy. This pattern is reused for other
disabled-reason surfaces (see `BuyActionHelperText` and
`ClaimActionHelperText` documentation).

```ts
export type ClaimActionDisabledReasonKey =
	| 'wallet_not_connected'
	| 'no_claimable_rewards'
	| 'claim_in_progress'
	| 'network_mismatch'
	| 'insufficient_gas'
	| 'unknown';

const CLAIM_ACTION_DISABLED_REASON_TEXT: Record<
	ClaimActionDisabledReasonKey,
	string
> = {
	// Every entry follows the same shape:
	// "{Action} is unavailable because {cause}. {Next step}."
	wallet_not_connected:
		'Claim is unavailable because your wallet is not connected. Connect your wallet to continue.',
	// …
};

export const getClaimActionDisabledReasonText = (
	reason: ClaimActionDisabledReasonKey
): string => CLAIM_ACTION_DISABLED_REASON_TEXT[reason];
```

**To add a new disabled reason:**

1. Append the new key to the union — **don't** fall back to `unknown`
   silently; force every caller to make a decision.
2. Add a matching entry to `CLAIM_ACTION_DISABLED_REASON_TEXT` using the
   "{Action} is unavailable because {cause}. {Next step}." template so
   tones stay consistent.
3. Compute the new key at the call site (the component that evaluates
   pre-conditions) and pass it to `getClaimActionDisabledReasonText`.
4. Extend
   `src/utils/__tests__/claimActionDisabledReason.test.ts` to cover the
   new key.

### 3. When neither helper fits

If your error surface is genuinely new (e.g. diverging-chain detection,
on-chain simulation errors), create a new sibling helper in
`src/utils/<domain>ErrorHandling.utils.ts` following the same shape:

1. **Closed key union** — TypeScript exhaustiveness forces callers to
   pick a copy.
2. **One Record/Map** that owns _all_ English copy — no copy scattered
   across components.
3. **Pure functions** — no React, no hooks, no side effects. Easy to
   unit-test.
4. **Side-by-side tests** — colocated unit test in
   `src/utils/__tests__/`.

Do not duplicate copy inline in components; always go through a typed
helper so future copy edits stay coherent.

---

## Shared Error State Components — Reference

| Component                                          | Mode | Purpose                                             | Key props                                                                 |
| -------------------------------------------------- | ---- | --------------------------------------------------- | ------------------------------------------------------------------------- |
| `showToast` (`@/utils/toast.util`)                 | 1    | Mutation feedback (success, error, loading, tx)     | `showToast.{success,error,loading,transactionSuccess}(message, options?)` |
| `CreatorProfileErrorState` (`@/components/common`) | 2    | Canonical inline error card for creator profile     | `error?, onRetry?, isRetrying?, title?, message?`                         |
| `SectionErrorBoundary` (`@/components/common`)     | 3    | Catches sub-tree render throws with retry           | `sectionName?, minHeight?, className?`                                    |
| `CreatorPageErrorBoundary` (`@/components/common`) | 4    | Catches creator-route render throws                 | none (wraps `<children>`)                                                 |
| `AppErrorBoundary` (`@/components/common`)         | 4    | App-wide last-line-of-defense; full reload on retry | none (wraps `<children>`)                                                 |
| `TransactionRetryNotice` (`@/components/common`)   | 5    | Persistent inline retry banner for failed trades    | `title?, message, onRetry, retryLabel?, disabled?, className?`            |
| `TransactionFailureDrawer` (`@/components/common`) | 5    | Modal with error code, hash, and developer details  | `open, onOpenChange?, failureDetails, onRetry?, onDismiss?`               |
| `NetworkMismatchBanner` (`@/components/common`)    | 6    | Persistent "wrong network" warning                  | `className?`                                                              |

For accessible state components (skeletons, empty states), see
[Adding a Page and Data Fetching](./adding-page-and-data-fetching.md)
and [Shared Components](./shared-components.md).

---

## Worked Examples

### Example A — Marketplace search list (read failure → Mode 2)

The creator list inside the marketplace is critical content, so a query
failure renders an inline state with retry. The rest of the page
(hero, holdings, footer) stays interactive.

```tsx
// src/pages/LandingPage.tsx (excerpt)
const { data: creators, isError, error, refetch } = useCreatorList();

if (isError) {
	const apiError = error as ApiError;
	return (
		<section role="alert" className="rounded-xl border border-dashed p-8">
			<h3>Couldn't load the creator list</h3>
			<p>
				{apiError.status >= 500
					? 'Something went wrong on our end. Please try again.'
					: apiError.message}
			</p>
			<button type="button" onClick={() => void refetch()}>
				Retry
			</button>
		</section>
	);
}

return <CreatorGrid creators={creators ?? []} />;
```

### Example B — Creator profile (read failure → Mode 4)

The creator profile header IS the page. A query failure here becomes a
page-level error:

```tsx
// src/pages/CreatorDetailPage.tsx (excerpt)
function CreatorDetailPageContent() {
	const { id } = useParams<{ id: string }>();
	const { data, isLoading, error } = useCreatorDetail(id ?? '');

	if (isLoading) return <CreatorProfileHeaderSkeleton />;
	if (!data) throw new ApiError('Creator not found', 404);
	if (error) throw error; // caught by CreatorPageErrorBoundary
	return <CreatorProfileHeader profile={data} />;
}

export default function CreatorDetailPage() {
	return (
		<CreatorPageErrorBoundary>
			<CreatorDetailPageContent />
		</CreatorPageErrorBoundary>
	);
}
```

### Example C — Buy flow (mutation failure → Mode 1 + Mode 5)

A trade mutation has both the prompt (toast), the persistent retry
banner, and the detail drawer:

```tsx
// src/components/common/CreatorCard.tsx (excerpt)
const buy = useBuyCreatorKey();

const handleBuy = async (amount: number) => {
	try {
		await buy.mutateAsync({ creatorId, amount });
	} catch (err) {
		const apiError = err as ApiError;

		// Mode 1: quick prompt
		showToast.error(
			apiError.status === 0
				? 'Network error. Check your connection.'
				: apiError.message
		);

		// Mode 5: persistent banner + drawer for support detail
		setFailure({
			errorMessage: apiError.message,
			errorCode: apiError.response?.code,
			timestamp: Date.now(),
		});
	}
};
```

---

## Quick Reference

| Question                                              | Answer                                                |
| ----------------------------------------------------- | ----------------------------------------------------- |
| Failure from a button click?                          | Toast (Mode 1), add drawer for on-chain trades        |
| Failure from `useQuery` that **is** the page?         | Throw → Page boundary (Mode 4)                        |
| Failure from `useQuery` that **enriches** the page?   | Inline state with `refetch` (Mode 2)                  |
| Component throws during render (not a query error)?   | Wrap in `SectionErrorBoundary` (Mode 3)               |
| Wallet is connected but wrong chain?                  | `NetworkMismatchBanner` (Mode 6)                      |
| User clicked "Cancel" on the wallet signature prompt? | `getSignatureErrorMessage` (Mode 1, specialised copy) |
| New kind of wallet error?                             | Extend `WALLET_ERROR_COPY`                            |
| New pre-action disabled reason?                       | Extend `ClaimActionDisabledReasonKey` + lookup        |

---

## Cross-references

- [State Management](./state-management.md) — particularly
  [§3 Error Architecture Strategy](./state-management.md#3-error-architecture-strategy-boundary-vs-inline-states)
  for the boundary-vs-inline executive summary and the loading/error/data
  three-state pattern.
- [Error Handling in React Query Hooks](./error-handling-in-hooks.md) —
  `ApiError` shape, `useQuery` / `useMutation` patterns, and the full
  status-code table.
- [API Layer Conventions](./api-layer.md) — the service layer and
  `BaseApiService.handleError` that produces every `ApiError`.
- [React Query Cache Conventions](./react-query-cache-conventions.md) —
  invalidation patterns that run alongside error handlers.
- [Shared Components](./shared-components.md) — toast, skeleton, and
  empty-state families referenced alongside error states.
- [Adding a Page and Data Fetching](./adding-page-and-data-fetching.md) —
  end-to-end guide for wiring routes and their error boundaries.
- [BuyActionHelperText — Disabled Reason](./BuyActionHelperText-DisabledReason.md) and
  [Claim Action Disabled Reason Helper Text](./ClaimActionHelperText-DisabledReason.md) —
  pre-action copy systems that follow the same `Record<Key, string>`
  classification pattern documented above.
