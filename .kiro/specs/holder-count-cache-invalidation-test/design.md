# Design Document

## Feature: Holder Count Cache Invalidation Test

## Overview

This design covers the test infrastructure and minimal production code change needed to validate that the creator detail page's "Audience" holder count chip updates correctly after a React Query cache invalidation triggers a refetch — all within the same mounted component instance, without a page reload.

The production change is small and surgical: extract the holder count value into a `useCreatorHolderCount` custom hook backed by `useQuery`. This makes the component's data dependency explicit and directly testable via React Query's cache API. The integration test then wraps the component with a fresh `QueryClientProvider`, pre-seeds the cache, invalidates the query key, and asserts the updated count appears.

**Key constraints:**

- The test must confirm the update happens within the same mounted component instance (no remount).
- Each test uses a fresh `QueryClient` instance to prevent inter-test cache contamination.
- No production network layer (`courseService`) is imported in the test file; all I/O is replaced by `vi.fn()` stubs.

---

## Architecture

The feature involves three layers:

```
┌──────────────────────────────────────────────────────────────────────────┐
│  Test Layer (src/pages/__tests__/holderCountCacheInvalidation.test.tsx)  │
│  - Fresh QueryClient per test (beforeEach)                               │
│  - vi.fn() mockFetch stub                                                │
│  - queryClient.setQueryData() to pre-seed cache                          │
│  - queryClient.invalidateQueries() to trigger refetch                    │
│  - @testing-library/react assertions on MiniStatChip value              │
└─────────────────────┬────────────────────────────────────────────────────┘
                      │ renders
┌─────────────────────▼────────────────────────────────────────────────────┐
│  Component Under Test: FeaturedCreatorAudienceChip                       │
│  (src/components/common/FeaturedCreatorAudienceChip.tsx)                 │
│  - Calls useCreatorHolderCount(creatorId)                                │
│  - Renders <MiniStatChip label="Audience" value={...} />                 │
└─────────────────────┬────────────────────────────────────────────────────┘
                      │ uses
┌─────────────────────▼────────────────────────────────────────────────────┐
│  Hook: useCreatorHolderCount                                             │
│  (src/hooks/useCreatorHolderCount.ts)                                    │
│  - useQuery({ queryKey: ['creator', creatorId, 'holderCount'], ... })    │
│  - Returns { count: number | null, isLoading, isError }                  │
└──────────────────────────────────────────────────────────────────────────┘
```

The existing `LandingPage.tsx` continues to work unchanged for users — it renders the same `MiniStatChip` via the new `FeaturedCreatorAudienceChip` component, which replaces the inline constant-backed chip. This keeps the diff minimal and avoids touching unrelated LandingPage logic.

---

## Components and Interfaces

### 1. `useCreatorHolderCount` hook

**File:** `src/hooks/useCreatorHolderCount.ts`

```typescript
import { useQuery } from '@tanstack/react-query';

export interface HolderCountResult {
	count: number | null;
	isLoading: boolean;
	isError: boolean;
}

/**
 * Fetches the holder count for a given creator via React Query.
 * Query key: ['creator', creatorId, 'holderCount']
 *
 * The queryFn is injected as a parameter so tests can supply a mock
 * without module-level vi.mock() patching.
 */
export function useCreatorHolderCount(
	creatorId: string,
	fetchHolderCount: (id: string) => Promise<number | null>
): HolderCountResult {
	const { data, isLoading, isError } = useQuery({
		queryKey: ['creator', creatorId, 'holderCount'],
		queryFn: () => fetchHolderCount(creatorId),
		staleTime: 30_000,
	});

	return {
		count: data ?? null,
		isLoading,
		isError,
	};
}
```

**Design decision — injected `fetchHolderCount`:** Rather than importing a service at module level, the fetch function is a parameter. This means tests pass `vi.fn()` directly as a prop, making the hook trivially mockable without `vi.mock()` hoisting. Production callers pass in the real service method.

### 2. `FeaturedCreatorAudienceChip` component

**File:** `src/components/common/FeaturedCreatorAudienceChip.tsx`

```typescript
import MiniStatChip from '@/components/common/MiniStatChip';
import { useCreatorHolderCount } from '@/hooks/useCreatorHolderCount';
import { getFeaturedCreatorKeyHolderCopy } from '@/utils/holderCount.utils';

interface FeaturedCreatorAudienceChipProps {
  creatorId: string;
  fetchHolderCount: (id: string) => Promise<number | null>;
}

export function FeaturedCreatorAudienceChip({
  creatorId,
  fetchHolderCount,
}: FeaturedCreatorAudienceChipProps) {
  const { count } = useCreatorHolderCount(creatorId, fetchHolderCount);
  const copy = getFeaturedCreatorKeyHolderCopy(count);

  return (
    <MiniStatChip
      label="Audience"
      value={copy.value}
      explanation={copy.explanation}
    />
  );
}
```

### 3. `getFeaturedCreatorKeyHolderCopy` utility extraction

The existing inline function in `LandingPage.tsx` is moved to a shared utility so both the component and the test can import it:

**File:** `src/utils/holderCount.utils.ts`

```typescript
import { formatCompactNumber } from '@/utils/numberFormat.utils';

export interface HolderCountCopy {
	value: string;
	explanation: string;
}

export function getFeaturedCreatorKeyHolderCopy(
	count: number | null | undefined
): HolderCountCopy {
	if (count == null) {
		return {
			value: 'Key holders unavailable',
			explanation: 'Key holder data is not available yet.',
		};
	}
	if (count === 0) {
		return {
			value: 'No key holders yet',
			explanation:
				'This creator has not unlocked any key holders yet. Be the first to buy a key and start the collector base.',
		};
	}
	return {
		value: `${formatCompactNumber(count)} key holders`,
		explanation: 'Number of wallets that currently hold at least one key.',
	};
}
```

### 4. `LandingPage.tsx` integration point

Replace the inline `MiniStatChip` for "Audience" with the new component:

```tsx
// Before
<MiniStatChip
  label="Audience"
  value={featuredCreatorKeyHolderCopy.value}
  explanation={featuredCreatorKeyHolderCopy.explanation}
/>

// After
<FeaturedCreatorAudienceChip
  creatorId={featuredCreator.id}
  fetchHolderCount={realFetchHolderCount}
/>
```

Where `realFetchHolderCount` is a thin wrapper over the eventual API call (currently returns `Promise.resolve(FEATURED_CREATOR_KEY_HOLDER_COUNT)` until the real endpoint exists).

### 5. Test `createWrapper` helper

**File:** `src/pages/__tests__/holderCountCacheInvalidation.test.tsx`

```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import type { ReactNode } from 'react';

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>{children}</MemoryRouter>
      </QueryClientProvider>
    );
  };
}
```

---

## Data Models

### Cache entry shape

```typescript
// Query key tuple
type HolderCountKey = ['creator', string, 'holderCount'];

// Cached value type
type HolderCountData = number | null;
```

Pre-seeding in tests uses `queryClient.setQueryData`:

```typescript
queryClient.setQueryData(
	['creator', CREATOR_ID, 'holderCount'],
	initialCount // number | null
);
```

### Mock fetch shape

```typescript
const mockFetchHolderCount = vi.fn<(id: string) => Promise<number | null>>();
```

---

## Correctness Properties

_A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees._

The project already has `fast-check` installed as a dev dependency (`"fast-check": "^4.6.0"` in `package.json`), which will be used for all property-based tests below. Each property test runs a minimum of 100 iterations.

---

### Property 1: Initial render round-trip

_For any_ non-negative integer `initialCount`, when the React Query cache is pre-seeded with that count and the component renders without a network call, the DOM shall display exactly the string `getFeaturedCreatorKeyHolderCopy(initialCount).value`.

**Validates: Requirements 1.1, 5.4**

---

### Property 2: Stale-while-revalidate display stability

_For any_ non-negative integer `initialCount`, while the invalidation-triggered refetch is in-flight (the mock fetch has not yet resolved), the DOM shall continue to display the formatted string derived from `initialCount` and shall not show a blank value or an error state.

**Validates: Requirements 2.3**

---

### Property 3: Post-invalidation update round-trip

_For any_ pair of distinct non-negative integers `(initialCount, updatedCount)`, after the cache is pre-seeded with `initialCount`, `queryClient.invalidateQueries` is called, and the mock refetch resolves with `updatedCount`, the DOM shall display `getFeaturedCreatorKeyHolderCopy(updatedCount).value`, shall no longer display `getFeaturedCreatorKeyHolderCopy(initialCount).value`, and this transition shall occur within the same mounted component instance (no unmount–remount cycle).

**Validates: Requirements 3.1, 3.2, 3.4**

---

### Property 4: Format function round-trip

_For any_ non-negative integer `n`, the string `getFeaturedCreatorKeyHolderCopy(n).value` shall equal `"No key holders yet"` when `n === 0`, or `formatCompactNumber(n) + " key holders"` when `n > 0` — and this value shall be identical to what the `FeaturedCreatorAudienceChip` renders in the DOM when seeded with `n`.

**Validates: Requirements 5.1, 5.4**

---

## Error Handling

| Scenario                                              | Behavior                                                                                                  |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `fetchHolderCount` rejects                            | `useCreatorHolderCount` returns `isError: true`, `count: null`; chip displays `"Key holders unavailable"` |
| `count` is `null` from fetch                          | Chip displays `"Key holders unavailable"`                                                                 |
| `count` is `0`                                        | Chip displays `"No key holders yet"`                                                                      |
| `queryClient.invalidateQueries` with non-matching key | No refetch triggered; mock fetch not called; display unchanged                                            |
| Network timeout during test                           | Controlled by mock — test resolves or rejects on demand                                                   |

The hook does not implement retry logic beyond React Query's defaults (`retry: 3`). For tests, retry is disabled (`retry: false` on the test-scoped `QueryClient`) to keep assertions deterministic.

---

## Testing Strategy

### Overview

This feature uses a **dual testing approach**:

- **Property-based tests** (via `fast-check`) for universal correctness properties — format round-trips, stale-while-revalidate stability, and post-invalidation update guarantees.
- **Example-based / edge-case tests** for concrete scenarios: zero count, null count, non-matching query key, reload-not-called assertion.

### Test file

**Path:** `src/pages/__tests__/holderCountCacheInvalidation.test.tsx`

### Test setup pattern

```typescript
import { QueryClient } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import fc from 'fast-check';

const CREATOR_ID = 'test-creator-42';

let queryClient: QueryClient;
let mockFetchHolderCount: ReturnType<typeof vi.fn>;

beforeEach(() => {
	// Fresh QueryClient per test — retry disabled for determinism
	queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	mockFetchHolderCount = vi.fn();
});

afterEach(() => {
	queryClient.clear();
});
```

### Property-based test outline

```typescript
// Property 1: Initial render round-trip
it('renders the correct formatted string for any seeded count', async () => {
  await fc.assert(
    fc.asyncProperty(fc.integer({ min: 1, max: 1_000_000 }), async count => {
      // Feature: holder-count-cache-invalidation-test, Property 1:
      // For any non-negative integer initialCount, DOM displays getFeaturedCreatorKeyHolderCopy(initialCount).value
      queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      mockFetchHolderCount = vi.fn();
      queryClient.setQueryData(['creator', CREATOR_ID, 'holderCount'], count);

      const { unmount } = render(
        <FeaturedCreatorAudienceChip
          creatorId={CREATOR_ID}
          fetchHolderCount={mockFetchHolderCount}
        />,
        { wrapper: createWrapper(queryClient) }
      );

      expect(screen.getByText(getFeaturedCreatorKeyHolderCopy(count).value)).toBeInTheDocument();
      expect(mockFetchHolderCount).not.toHaveBeenCalled();
      unmount();
    }),
    { numRuns: 100 }
  );
});
```

```typescript
// Property 3: Post-invalidation update round-trip
it('displays the updated count after invalidation with the same component instance', async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.integer({ min: 1, max: 999 }),
      fc.integer({ min: 1000, max: 1_000_000 }),
      async (initialCount, updatedCount) => {
        // Feature: holder-count-cache-invalidation-test, Property 3:
        // For any distinct (initialCount, updatedCount), post-invalidation DOM shows updatedCount
        queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
        mockFetchHolderCount = vi.fn().mockResolvedValue(updatedCount);
        queryClient.setQueryData(['creator', CREATOR_ID, 'holderCount'], initialCount);

        const reloadSpy = vi.spyOn(window.location, 'reload').mockImplementation(() => {});
        const { unmount } = render(
          <FeaturedCreatorAudienceChip
            creatorId={CREATOR_ID}
            fetchHolderCount={mockFetchHolderCount}
          />,
          { wrapper: createWrapper(queryClient) }
        );

        await act(async () => {
          await queryClient.invalidateQueries({ queryKey: ['creator', CREATOR_ID, 'holderCount'] });
        });

        await waitFor(() => {
          expect(screen.getByText(getFeaturedCreatorKeyHolderCopy(updatedCount).value)).toBeInTheDocument();
        });
        expect(screen.queryByText(getFeaturedCreatorKeyHolderCopy(initialCount).value)).not.toBeInTheDocument();
        expect(reloadSpy).not.toHaveBeenCalled();

        reloadSpy.mockRestore();
        unmount();
      }
    ),
    { numRuns: 100 }
  );
});
```

```typescript
// Property 4: Format function round-trip (pure function — no render needed)
it('getFeaturedCreatorKeyHolderCopy produces the correct format for all non-negative integers', () => {
	fc.assert(
		fc.property(fc.integer({ min: 1, max: 10_000_000 }), count => {
			// Feature: holder-count-cache-invalidation-test, Property 4:
			// For any positive integer n, value === formatCompactNumber(n) + " key holders"
			const { value } = getFeaturedCreatorKeyHolderCopy(count);
			expect(value).toBe(`${formatCompactNumber(count)} key holders`);
		}),
		{ numRuns: 200 }
	);
});
```

### Edge-case and example tests

| Test                                              | Classification | Key assertion                                                             |
| ------------------------------------------------- | -------------- | ------------------------------------------------------------------------- |
| `count = 0` renders "No key holders yet"          | EDGE_CASE      | `screen.getByText('No key holders yet')`                                  |
| `count = null` renders "Key holders unavailable"  | EDGE_CASE      | `screen.getByText('Key holders unavailable')`                             |
| Non-matching query key does not call mockFetch    | EDGE_CASE      | `expect(mockFetchHolderCount).not.toHaveBeenCalled()`                     |
| Seeded cache — mock fetch call count is zero      | EXAMPLE        | `expect(mockFetchHolderCount).not.toHaveBeenCalled()`                     |
| Mock fetch called exactly once after invalidation | EXAMPLE        | `expect(mockFetchHolderCount).toHaveBeenCalledTimes(1)` with `CREATOR_ID` |

### Vitest configuration

No changes needed to `vitest.config.ts` — existing `jsdom` environment and `@testing-library/jest-dom/vitest` setup are sufficient. `fast-check` is already a dev dependency.

### Mocks required in test file

```typescript
vi.mock('@/hooks/useNetworkMismatch', () => ({
	useNetworkMismatch: () => ({
		isMismatch: false,
		expectedChainName: 'Stellar Testnet',
	}),
}));
// framer-motion and other heavy dependencies mocked as in LandingPage.keyboard.test.tsx
// No vi.mock for courseService — it is NOT imported in this test file
```
