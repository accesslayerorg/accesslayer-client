# Requirements Document

## Introduction

This feature adds an integration test that verifies the creator detail page updates its displayed holder count after a React Query cache invalidation triggers a refetch. The page currently renders a `MiniStatChip` whose "Audience" value is derived from `FEATURED_CREATOR_KEY_HOLDER_COUNT`. The test must confirm that when the cache entry for a creator is invalidated and the refetch resolves with a new value, the UI reflects the updated count without a full page reload.

The scope is purely test infrastructure: no production behaviour changes are required. The test will wrap the component under test with a `QueryClientProvider`, pre-seed the cache with an initial creator payload, then programmatically invalidate the query key and mock the refetch to return an updated holder count. Assertions confirm the new value is visible and the old value is gone.

## Glossary

- **Creator_Detail_Page**: The section of `LandingPage` (and its composing components) that displays creator statistics including the holder count "Audience" chip.
- **Holder_Count**: The integer representing the number of wallets that hold at least one key for a given creator. Rendered via `getFeaturedCreatorKeyHolderCopy` as a formatted string inside a `MiniStatChip`.
- **React_Query_Cache**: The in-memory data store managed by `@tanstack/react-query` (v5). Identified by a query key; entries can be invalidated with `queryClient.invalidateQueries`.
- **Query_Key**: The array used to identify a cache entry, e.g. `['creator', creatorId]`.
- **QueryClient**: The TanStack Query client instance that owns the cache and coordinates fetches.
- **QueryClientProvider**: The React context provider that makes a `QueryClient` available to components under test.
- **Test_Wrapper**: A helper that wraps a component under test with all required providers (`QueryClientProvider`, `MemoryRouter`) so it renders in isolation.
- **Mock_Fetch**: A `vi.fn()` stub that replaces the real network call, returning controlled data for each invocation.
- **Invalidation**: The act of marking one or more cache entries as stale, causing React Query to trigger a background refetch on the next render of a subscribed component.
- **Refetch**: The background network request that React Query fires after invalidation; in tests this is fulfilled by the `Mock_Fetch`.

## Requirements

### Requirement 1: Initial Holder Count Renders Correctly

**User Story:** As a developer running the integration test suite, I want the creator detail page to render the correct initial holder count from the seeded cache, so that the test has a verified baseline before invalidation.

#### Acceptance Criteria

1. WHEN the `Test_Wrapper` renders the creator detail section with a `QueryClient` pre-seeded with `initialCount` keys in the cache entry, THE `Creator_Detail_Page` SHALL display a formatted string derived from `initialCount` (e.g. `"42 key holders"`) in the holder count element.
2. WHEN the initial render completes without triggering a network call, THE `Mock_Fetch` SHALL have been called zero times.
3. IF the `initialCount` is `0`, THEN THE `Creator_Detail_Page` SHALL display `"No key holders yet"` in the holder count element.
4. IF the `initialCount` is `null`, THEN THE `Creator_Detail_Page` SHALL display `"Key holders unavailable"` in the holder count element.

---

### Requirement 2: Cache Invalidation Triggers a Refetch

**User Story:** As a developer running the integration test suite, I want calling `queryClient.invalidateQueries` on the creator query key to trigger exactly one refetch call to the `Mock_Fetch`, so that I can confirm React Query's invalidation mechanism is wired correctly.

#### Acceptance Criteria

1. WHEN `queryClient.invalidateQueries` is called with the creator's `Query_Key`, THE `QueryClient` SHALL mark the cache entry as stale and schedule a background refetch.
2. WHEN the invalidation-driven refetch executes, THE `Mock_Fetch` SHALL be called exactly once with the creator's identifier as a parameter.
3. WHILE the refetch is in-flight, THE `Creator_Detail_Page` SHALL continue to display the previously cached holder count without showing a blank or error state.
4. IF `queryClient.invalidateQueries` is called with a `Query_Key` that does not match any active query, THEN THE `Mock_Fetch` SHALL NOT be called.

---

### Requirement 3: Updated Holder Count Renders After Refetch

**User Story:** As a developer running the integration test suite, I want the creator detail page to display the updated holder count returned by the refetch, so that I can confirm the UI reflects fresh data after cache invalidation.

#### Acceptance Criteria

1. WHEN the refetch resolves with `updatedCount`, THE `Creator_Detail_Page` SHALL display the formatted string derived from `updatedCount` (e.g. `"99 key holders"`) in the holder count element.
2. WHEN the updated count is visible, THE `Creator_Detail_Page` SHALL NOT display the formatted string that was derived from `initialCount`.
3. THE `Creator_Detail_Page` SHALL display the updated count without requiring a full page reload (i.e. `window.location.reload` SHALL NOT be called during the test).
4. WHEN `updatedCount` differs from `initialCount`, THE display transition SHALL occur within the same mounted component instance, confirming no unmount–remount cycle was required.

---

### Requirement 4: Test Isolation and No Side Effects

**User Story:** As a developer running the integration test suite, I want each test case to use a fresh `QueryClient` instance and reset all mocks, so that tests do not leak state into one another.

#### Acceptance Criteria

1. THE `Test_Wrapper` SHALL instantiate a new `QueryClient` in `beforeEach` (or equivalent per-test setup) so that cache state from one test does not influence another.
2. THE `Mock_Fetch` SHALL be reset (via `vi.resetAllMocks()` or `mockFn.mockReset()`) before each test so that call counts and return values are clean.
3. WHEN a test completes, THE `Test_Wrapper` SHALL unmount cleanly without leaving dangling subscriptions or timers that could affect subsequent tests.
4. THE test file SHALL NOT import or call any production network layer (e.g. `courseService`) directly; all external I/O SHALL be replaced by `Mock_Fetch` stubs.

---

### Requirement 5: Holder Count Display Format Consistency

**User Story:** As a developer running the integration test suite, I want the holder count format assertions to match the format produced by `getFeaturedCreatorKeyHolderCopy`, so that the test accurately reflects what a real user would see.

#### Acceptance Criteria

1. THE `Creator_Detail_Page` SHALL format a positive `holderCount` as `"<compactNumber> key holders"` where `<compactNumber>` is the output of `formatCompactNumber(holderCount)`.
2. WHEN `holderCount` is `0`, THE `Creator_Detail_Page` SHALL display exactly `"No key holders yet"`.
3. WHEN `holderCount` is `null` or `undefined`, THE `Creator_Detail_Page` SHALL display exactly `"Key holders unavailable"`.
4. FOR ALL valid non-negative integer values of `holderCount`, THE display string produced by `getFeaturedCreatorKeyHolderCopy(holderCount)` SHALL be consistent with the string rendered in the DOM (round-trip equivalence property).
