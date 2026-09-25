# Implementation Plan: Holder Count Cache Invalidation Test

## Overview

Extract the holder count utility and introduce a thin React Query–backed component layer (`useCreatorHolderCount` + `FeaturedCreatorAudienceChip`) so that cache invalidation is directly observable in tests. Write a property-based integration test covering all four correctness properties and the key edge cases, then verify the full suite passes.

The production diff is intentionally small: one utility file, one hook, one component, and a one-line swap in `LandingPage.tsx`. Everything else lives in the test file.

## Tasks

- [x] 1. Extract `getFeaturedCreatorKeyHolderCopy` to a shared utility module
   - Create `src/utils/holderCount.utils.ts`
   - Move the `getFeaturedCreatorKeyHolderCopy` function (currently defined inline in `LandingPage.tsx` at line ~81) into the new file
   - Export `HolderCountCopy` interface and `getFeaturedCreatorKeyHolderCopy` function
   - Import `formatCompactNumber` from `@/utils/numberFormat.utils`
   - Keep the existing inline definition in `LandingPage.tsx` for now — it will be replaced in Task 4
   - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 2. Create `useCreatorHolderCount` hook
   - Create `src/hooks/useCreatorHolderCount.ts`
   - Implement `useQuery` with query key `['creator', creatorId, 'holderCount']` and `staleTime: 30_000`
   - Accept `fetchHolderCount: (id: string) => Promise<number | null>` as an injected parameter (avoids module-level `vi.mock` in tests)
   - Export `HolderCountResult` interface `{ count: number | null; isLoading: boolean; isError: boolean }`
   - Return `{ count: data ?? null, isLoading, isError }`
   - _Requirements: 2.1, 2.2, 2.3_

- [x] 3. Create `FeaturedCreatorAudienceChip` component
   - Create `src/components/common/FeaturedCreatorAudienceChip.tsx`
   - Accept props: `creatorId: string` and `fetchHolderCount: (id: string) => Promise<number | null>`
   - Call `useCreatorHolderCount(creatorId, fetchHolderCount)` and pipe `count` through `getFeaturedCreatorKeyHolderCopy`
   - Render `<MiniStatChip label="Audience" value={copy.value} explanation={copy.explanation} />`
   - Import `MiniStatChip` from `@/components/common/MiniStatChip`
   - Import `useCreatorHolderCount` from `@/hooks/useCreatorHolderCount`
   - Import `getFeaturedCreatorKeyHolderCopy` from `@/utils/holderCount.utils`
   - _Requirements: 1.1, 1.3, 1.4, 3.1, 3.2, 5.1, 5.2, 5.3_

- [x] 4. Update `LandingPage.tsx` to use `FeaturedCreatorAudienceChip`
   - Import `FeaturedCreatorAudienceChip` from `@/components/common/FeaturedCreatorAudienceChip`
   - Replace the inline `<MiniStatChip label="Audience" …>` block (lines ~1199–1205) with `<FeaturedCreatorAudienceChip creatorId={featuredCreator.id} fetchHolderCount={...} />`
   - Pass a `fetchHolderCount` implementation that returns `Promise.resolve(FEATURED_CREATOR_KEY_HOLDER_COUNT)` (preserves existing behaviour until the real endpoint lands)
   - Remove the now-unused `featuredCreatorKeyHolderCopy` derived variable (line ~560–563) and the inline `getFeaturedCreatorKeyHolderCopy` function definition (lines ~81–100)
   - Verify `LandingPage.tsx` still compiles and the keyboard test (`LandingPage.keyboard.test.tsx`) still passes
   - _Requirements: 1.1, 3.4_

- [ ] 5. Write the integration test
   - Create `src/pages/__tests__/holderCountCacheInvalidation.test.tsx`
   - [ ] 5.1 Set up test scaffolding
      - Import `QueryClient`, `QueryClientProvider` from `@tanstack/react-query`; `MemoryRouter` from `react-router`; `render`, `screen`, `waitFor`, `act` from `@testing-library/react`; `fc` from `fast-check`; `beforeEach`, `afterEach`, `describe`, `expect`, `it`, `vi` from `vitest`
      - Import `FeaturedCreatorAudienceChip` from `@/components/common/FeaturedCreatorAudienceChip`
      - Import `getFeaturedCreatorKeyHolderCopy` from `@/utils/holderCount.utils`
      - Import `formatCompactNumber` from `@/utils/numberFormat.utils`
      - Add `vi.mock` stubs for `@/hooks/useNetworkMismatch`, `framer-motion`, and any other heavy transitive dependencies pulled in by `FeaturedCreatorAudienceChip` — mirror the pattern from `LandingPage.keyboard.test.tsx`
      - Define `CREATOR_ID = 'test-creator-42'`; declare `queryClient` and `mockFetchHolderCount` at describe scope
      - `beforeEach`: create fresh `QueryClient({ defaultOptions: { queries: { retry: false } } })` and reset `mockFetchHolderCount` via `vi.fn()`
      - `afterEach`: call `queryClient.clear()`
      - Implement `createWrapper(queryClient)` returning a component that wraps children in `<QueryClientProvider>` + `<MemoryRouter>`
      - _Requirements: 4.1, 4.2, 4.3, 4.4_

   - [ ] 5.2 Write property test for Property 1 — initial render round-trip
      - **Property 1: Initial render round-trip**
      - **Validates: Requirements 1.1, 5.4**
      - Use `fc.asyncProperty(fc.integer({ min: 1, max: 1_000_000 }), ...)` with `numRuns: 100`
      - For each `count`: create fresh `queryClient`, seed with `queryClient.setQueryData(['creator', CREATOR_ID, 'holderCount'], count)`, render `FeaturedCreatorAudienceChip` with wrapper, assert `screen.getByText(getFeaturedCreatorKeyHolderCopy(count).value)` is in the document, assert `mockFetchHolderCount` was NOT called, then `unmount()`
      - _Requirements: 1.1, 1.2, 5.4_

   - [ ] 5.3 Write property test for Property 2 — stale-while-revalidate display stability
      - **Property 2: Stale-while-revalidate display stability**
      - **Validates: Requirements 2.3**
      - Use `fc.asyncProperty(fc.integer({ min: 1, max: 1_000_000 }), ...)` with `numRuns: 100`
      - For each `initialCount`: seed cache, render component, call `queryClient.invalidateQueries` but do NOT resolve the pending `mockFetchHolderCount` (use a `Promise` that never resolves during the assertion window), assert old value is still visible and no blank/error state
      - _Requirements: 2.3_

   - [ ] 5.4 Write property test for Property 3 — post-invalidation update round-trip
      - **Property 3: Post-invalidation update round-trip**
      - **Validates: Requirements 3.1, 3.2, 3.4**
      - Use `fc.asyncProperty(fc.integer({ min: 1, max: 999 }), fc.integer({ min: 1000, max: 1_000_000 }), ...)` with `numRuns: 100` (disjoint ranges guarantee `initialCount !== updatedCount`)
      - For each pair `(initialCount, updatedCount)`: seed cache with `initialCount`, render, spy on `window.location.reload`, invalidate query, await `waitFor` assertion that updated text is visible and old text is gone, assert `reloadSpy` was NOT called, `unmount()`
      - _Requirements: 3.1, 3.2, 3.3, 3.4_

   - [ ] 5.5 Write property test for Property 4 — format function round-trip
      - **Property 4: Format function round-trip**
      - **Validates: Requirements 5.1, 5.4**
      - Use synchronous `fc.property(fc.integer({ min: 1, max: 10_000_000 }), ...)` with `numRuns: 200`
      - For each `n > 0`: assert `getFeaturedCreatorKeyHolderCopy(n).value === formatCompactNumber(n) + ' key holders'`
      - _Requirements: 5.1, 5.4_

   - [ ]\* 5.6 Write edge-case tests
      - `count = 0` renders `"No key holders yet"` — seed cache with `0`, render, assert text present
      - `count = null` renders `"Key holders unavailable"` — seed cache with `null`, render, assert text present
      - Non-matching query key: invalidate a different key, assert `mockFetchHolderCount` was NOT called and display is unchanged
      - After invalidation + resolved refetch: assert `mockFetchHolderCount` was called exactly once with `CREATOR_ID`
      - _Requirements: 1.3, 1.4, 2.2, 2.4_

- [ ] 6. Checkpoint — run tests and confirm everything passes
   - Run `pnpm test` (or `pnpm vitest run`) from `accesslayer-client--fork/`
   - Confirm `holderCountCacheInvalidation.test.tsx` passes all property and edge-case tests
   - Confirm `LandingPage.keyboard.test.tsx` still passes (no regression from Task 4 changes)
   - Fix any TypeScript or test errors surfaced; ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- The `fetchHolderCount` injection pattern in the hook and component avoids `vi.mock` hoisting complexity — tests pass `vi.fn()` directly as a prop
- Property tests use disjoint integer ranges in Property 3 to guarantee `initialCount !== updatedCount` without needing a `fc.filter`
- `retry: false` on the test-scoped `QueryClient` keeps assertions deterministic
- `fast-check` v4 (`"^4.6.0"`) is already installed as a dev dependency — no new packages needed
