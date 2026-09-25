# Testing Conventions

How tests are structured in this repo, how to mock the seams (React Query,
wallet, browser APIs), and how to set up an integration test. For
util-specific guidance see the [Utils Testing Guide](./utils-testing-guide.md);
for what hooks should do on failure paths (and therefore what your tests
should assert), see [Error Handling in Hooks](./error-handling-in-hooks.md).

The runner is **Vitest** (`vitest.config.ts`: jsdom environment, globals
enabled, setup in `src/test/setup.ts`). Run everything with `pnpm test`, or a
single file with `pnpm test <path>`.

## File naming and co-location

Tests live in a `__tests__/` folder next to the code they exercise:

```
src/hooks/
  ├─ useFormatXlm.ts
  └─ __tests__/
      └─ useFormatXlm.test.ts
src/pages/
  ├─ LandingPage.tsx
  └─ __tests__/
      ├─ LandingPage.holdings.test.tsx                      ← unit-ish page test
      └─ LandingPage.sellFlow.integration.test.tsx          ← integration test
```

- **Unit tests**: `<name>.test.ts` / `<name>.test.tsx`.
- **Integration tests**: `<Page>.<feature>.integration.test.tsx` — one flow
  per file, named after the feature under test. Components may also co-locate
  a test directly beside the file (e.g.
  `src/components/common/__tests__/TradeDialog.clamp.integration.test.tsx`).
- Reference the issue number in the top-level `describe` when the test
  exists to lock in an issue's acceptance criteria, e.g.
  `describe('LandingPage sell flow end-to-end (#644)', …)`.

## Mocking React Query responses

There are two established patterns — pick based on what the test is about.

**1. Mock the service, keep React Query real** (preferred for integration
tests — caching, invalidation and optimistic updates stay honest):

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { courseService } from '@/services/course.service';

vi.mock('@/services/course.service', () => ({
	courseService: { getCourses: vi.fn() },
}));
const mockGetCourses = vi.mocked(courseService.getCourses);

const renderPage = () =>
	render(
		<QueryClientProvider
			client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
		>
			<MemoryRouter>
				<LandingPage />
			</MemoryRouter>
		</QueryClientProvider>
	);

// in the test:
mockGetCourses.mockResolvedValue([…fixtures…]);
```

Always create a **fresh `QueryClient` per render** (never share one between
tests — cached data leaks across cases) and disable retries so failure-path
tests don't wait on backoff.

**2. Mock the hook module wholesale** (for unit tests where query machinery
is noise):

```tsx
vi.mock('@/hooks/useWallet', () => ({
	useTradeMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
	useWalletHoldings: () => ({ data: [] }),
}));
```

Anything rendering a component that calls `useQuery`/`useMutation` **must**
be wrapped in a `QueryClientProvider` unless every such hook is mocked out —
a missing provider fails with `No QueryClient set`.

## Mocking wallet connection state

Wallet state flows through the hooks in `src/hooks/useWallet.ts`
(`useWalletHoldings`, `useWalletActivity`, `useTradeMutation`). Component
tests mock at that seam:

```tsx
vi.mock('@/hooks/useWallet', () => ({
	// "connected wallet holding 2 keys of creator-a"
	useWalletHoldings: () => ({
		data: [{ creatorId: 'creator-a', quantity: 2, priceStroops: 500_000, price: 0.05, pending: false }],
	}),
	useTradeMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));
```

For full-flow tests, prefer **not** mocking `useWallet` at all: the demo
wallet seeds the featured creator with 3 held keys, and the real
`useTradeMutation` exercises the optimistic-update and invalidation paths
(see `LandingPage.sellFlow.integration.test.tsx`). Trade submissions resolve
on real timers (~1.2s), so assert with
`waitFor(…, { timeout: 5000 })` rather than fake timers.

## Integration test setup

The standard shell for a page-level integration test:

1. **Providers**: wrap in `QueryClientProvider` (fresh client) and
   `MemoryRouter` — pages use react-router hooks.
2. **Service mocks**: `vi.mock('@/services/course.service')` and resolve
   fixture data per test.
3. **Toast sink**: mock `@/utils/toast.util` and assert on
   `showToast.success` / `error` / `transactionSuccess` calls instead of
   scraping toast DOM (no `<Toaster/>` is mounted in tests).
4. **Presentation mocks** (copy from an existing integration test):
   `framer-motion` (pass-through elements), `@/components/common/CreatorCard`
   (lightweight article), `StellarConnectionQualityBadge`,
   `FeaturedCreatorAudienceChip`, and network/staleness hooks
   (`useNetworkMismatch`, `useStaleData`) pinned to healthy values.
5. **Browser API stubs**, in `beforeEach`:
   - `matchMedia` — jsdom doesn't implement it; use the `mockMatchMedia`
     helper pattern found in the page tests.
   - `localStorage` / `sessionStorage` — newer Node versions (v22+
     WebStorage, default in v25) shadow jsdom's storage with a global that
     has no working methods, so `window.localStorage.clear()` throws. New
     suites should install an in-memory stub (see `installStorageStub` in
     `LandingPage.sellFlow.integration.test.tsx`) instead of touching the
     global directly.
6. **Cleanup**: `afterEach(cleanup)` — automatic unmount is not enabled.

## Available test utilities

There is deliberately no shared custom `render` yet; each suite composes its
own providers. The reusable pieces to copy today:

| Utility | Where | What it does |
|---|---|---|
| `src/test/setup.ts` | global setup | registers `@testing-library/jest-dom` matchers |
| `mockMatchMedia()` | page test files | stubs `window.matchMedia` for jsdom |
| `installStorageStub()` | `LandingPage.sellFlow.integration.test.tsx` | Node-version-proof localStorage/sessionStorage stub |
| `makeQueryClient()` | `LandingPage.sort.integration.test.tsx` | fresh `QueryClient` with retries disabled |
| `confirmTrade(side, amount)` | `LandingPage.holdingsSellBalanceUpdate.integration.test.tsx` | drives the trade dialog: open → amount → confirm |
| `dispatchRejection(reason)` | `unhandledRejectionLogger.test.ts` | synthesizes an unhandled-rejection event |

If you find yourself copying more than two of these into a new file, that is
the signal to promote them into `src/test/` as shared utilities — do it in
the same PR.

## What good assertions look like here

- Assert **user-visible outcomes** (rendered text, toast calls, holdings
  rows), not internal state.
- For flows with optimistic updates, assert both the intermediate state
  (pending) and the settled state where practical.
- Error paths deserve their own tests — see
  [Error Handling in Hooks](./error-handling-in-hooks.md) for the expected
  failure behaviour to pin down.
