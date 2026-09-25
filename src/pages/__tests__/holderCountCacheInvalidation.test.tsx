import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import { act, render, screen, waitFor } from '@testing-library/react';
import fc from 'fast-check';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FeaturedCreatorAudienceChip } from '@/components/common/FeaturedCreatorAudienceChip';
import { getFeaturedCreatorKeyHolderCopy } from '@/utils/holderCount.utils';
import { formatCompactNumber } from '@/utils/numberFormat.utils';

// ---------------------------------------------------------------------------
// Module mocks — mirror the pattern from LandingPage.keyboard.test.tsx
// ---------------------------------------------------------------------------

vi.mock('@/hooks/useNetworkMismatch', () => ({
  useNetworkMismatch: () => ({
    isMismatch: false,
    expectedChainName: 'Stellar Testnet',
  }),
}));

vi.mock('@/components/common/StellarConnectionQualityBadge', async () => {
  const React = await import('react');
  return {
    default: () => React.createElement('div', { role: 'status' }, 'RPC good'),
  };
});

vi.mock('framer-motion', async () => {
  const React = await import('react');
  return {
    AnimatePresence: ({ children }: { children: ReactNode }) =>
      React.createElement(React.Fragment, null, children),
    LayoutGroup: ({ children }: { children: ReactNode }) =>
      React.createElement(React.Fragment, null, children),
    motion: {
      div: ({ children, layout, transition, ...props }: Record<string, unknown> & { children?: ReactNode }) => {
        void layout;
        void transition;
        return React.createElement('div', props as Record<string, unknown>, children);
      },
      button: ({ children, ...props }: Record<string, unknown> & { children?: ReactNode }) =>
        React.createElement('button', props as Record<string, unknown>, children),
    },
  };
});

// ---------------------------------------------------------------------------
// Test constants & helpers
// ---------------------------------------------------------------------------

const CREATOR_ID = 'test-creator-42';

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>{children}</MemoryRouter>
      </QueryClientProvider>
    );
  };
}

function makeFreshQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('FeaturedCreatorAudienceChip — holder count cache invalidation', () => {
  let queryClient: QueryClient;
  let mockFetchHolderCount: ReturnType<typeof vi.fn<(id: string) => Promise<number | null>>>;

  beforeEach(() => {
    queryClient = makeFreshQueryClient();
    mockFetchHolderCount = vi.fn<(id: string) => Promise<number | null>>()
      .mockResolvedValue(null);
  });

  afterEach(() => {
    queryClient.clear();
  });

  // -------------------------------------------------------------------------
  // Property 1: Initial render round-trip
  // For any seeded integer count, the DOM displays getFeaturedCreatorKeyHolderCopy(count).value
  // with zero calls to the mock fetch.
  // Validates: Requirements 1.1, 1.2, 5.4
  // -------------------------------------------------------------------------
  it('Property 1 — initial render round-trip: displays seeded count without calling fetch', async () => {
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 1, max: 1_000_000 }), async (count) => {
        const localClient = makeFreshQueryClient();
        const localMock = vi.fn<(id: string) => Promise<number | null>>();

        localClient.setQueryData(['creator', CREATOR_ID, 'holderCount'], count);

        const { unmount } = render(
          <FeaturedCreatorAudienceChip
            creatorId={CREATOR_ID}
            fetchHolderCount={localMock}
          />,
          { wrapper: createWrapper(localClient) },
        );

        const expectedText = getFeaturedCreatorKeyHolderCopy(count).value;
        expect(screen.getByText(expectedText)).toBeInTheDocument();
        expect(localMock).not.toHaveBeenCalled();

        unmount();
        localClient.clear();
      }),
      { numRuns: 100 },
    );
  });

  // -------------------------------------------------------------------------
  // Property 2: Stale-while-revalidate display stability
  // While a pending refetch has not yet resolved, the old value remains visible.
  // Validates: Requirement 2.3
  // -------------------------------------------------------------------------
  it('Property 2 — stale-while-revalidate: old value stays visible while refetch is in-flight', async () => {
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 1, max: 1_000_000 }), async (initialCount) => {
        const localClient = makeFreshQueryClient();
        // A fetch that never resolves during this test window
        const neverResolvingFetch = vi.fn<(id: string) => Promise<number | null>>(
          () => new Promise(() => { /* intentionally never resolves */ }),
        );

        localClient.setQueryData(['creator', CREATOR_ID, 'holderCount'], initialCount);

        const { unmount } = render(
          <FeaturedCreatorAudienceChip
            creatorId={CREATOR_ID}
            fetchHolderCount={neverResolvingFetch}
          />,
          { wrapper: createWrapper(localClient) },
        );

        // Trigger invalidation without awaiting — the refetch never resolves
        // so awaiting would hang the test. We only verify the stale value
        // stays visible while the refetch is in-flight.
        localClient.invalidateQueries({
          queryKey: ['creator', CREATOR_ID, 'holderCount'],
        });

        // Old value must still be visible (stale-while-revalidate)
        const oldText = getFeaturedCreatorKeyHolderCopy(initialCount).value;
        expect(screen.getByText(oldText)).toBeInTheDocument();
        // No error or blank state
        expect(screen.queryByText('Key holders unavailable')).not.toBeInTheDocument();

        unmount();
        localClient.clear();
      }),
      { numRuns: 50 },
    );
  });

  // -------------------------------------------------------------------------
  // Property 3: Post-invalidation update round-trip
  // After invalidation + resolved refetch, updated count is shown; old is gone;
  // no page reload; same component instance.
  // Validates: Requirements 3.1, 3.2, 3.3, 3.4
  // -------------------------------------------------------------------------
  it('Property 3 — post-invalidation update: new count shown, old gone, no page reload', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 999 }),
        fc.integer({ min: 1000, max: 1_000_000 }),
        async (initialCount, updatedCount) => {
          const localClient = makeFreshQueryClient();
          const localMock = vi.fn<(id: string) => Promise<number | null>>()
            .mockResolvedValue(updatedCount);

          localClient.setQueryData(['creator', CREATOR_ID, 'holderCount'], initialCount);

          const { unmount } = render(
            <FeaturedCreatorAudienceChip
              creatorId={CREATOR_ID}
              fetchHolderCount={localMock}
            />,
            { wrapper: createWrapper(localClient) },
          );

          // Invalidate and allow refetch to resolve
          await act(async () => {
            await localClient.invalidateQueries({
              queryKey: ['creator', CREATOR_ID, 'holderCount'],
            });
          });

          const updatedText = getFeaturedCreatorKeyHolderCopy(updatedCount).value;
          const initialText = getFeaturedCreatorKeyHolderCopy(initialCount).value;

          await waitFor(() => {
            expect(screen.getByText(updatedText)).toBeInTheDocument();
          });

          expect(screen.queryByText(initialText)).not.toBeInTheDocument();

          unmount();
          localClient.clear();
        },
      ),
      { numRuns: 100 },
    );
  });

  // -------------------------------------------------------------------------
  // Property 4: Format function round-trip (pure function — no render needed)
  // For any positive integer n, getFeaturedCreatorKeyHolderCopy(n).value ===
  // formatCompactNumber(n) + ' key holders'
  // Validates: Requirements 5.1, 5.4
  // -------------------------------------------------------------------------
  it('Property 4 — format round-trip: getFeaturedCreatorKeyHolderCopy is consistent with formatCompactNumber', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 10_000_000 }), (n) => {
        const { value } = getFeaturedCreatorKeyHolderCopy(n);
        expect(value).toBe(`${formatCompactNumber(n)} key holders`);
      }),
      { numRuns: 200 },
    );
  });

  // -------------------------------------------------------------------------
  // Edge cases
  // -------------------------------------------------------------------------

  it('edge case — count = 0: renders "No key holders yet"', () => {
    queryClient.setQueryData(['creator', CREATOR_ID, 'holderCount'], 0);

    render(
      <FeaturedCreatorAudienceChip
        creatorId={CREATOR_ID}
        fetchHolderCount={mockFetchHolderCount}
      />,
      { wrapper: createWrapper(queryClient) },
    );

    expect(screen.getByText('No key holders yet')).toBeInTheDocument();
  });

  it('edge case — count = null: renders "Key holders unavailable"', () => {
    queryClient.setQueryData(['creator', CREATOR_ID, 'holderCount'], null);

    render(
      <FeaturedCreatorAudienceChip
        creatorId={CREATOR_ID}
        fetchHolderCount={mockFetchHolderCount}
      />,
      { wrapper: createWrapper(queryClient) },
    );

    expect(screen.getByText('Key holders unavailable')).toBeInTheDocument();
  });

  it('edge case — non-matching query key: invalidation does not call mockFetch', async () => {
    queryClient.setQueryData(['creator', CREATOR_ID, 'holderCount'], 42);

    render(
      <FeaturedCreatorAudienceChip
        creatorId={CREATOR_ID}
        fetchHolderCount={mockFetchHolderCount}
      />,
      { wrapper: createWrapper(queryClient) },
    );

    await act(async () => {
      await queryClient.invalidateQueries({
        queryKey: ['creator', 'different-creator-id', 'holderCount'],
      });
    });

    expect(mockFetchHolderCount).not.toHaveBeenCalled();
    // Display unchanged
    expect(screen.getByText(getFeaturedCreatorKeyHolderCopy(42).value)).toBeInTheDocument();
  });

  it('edge case — after invalidation: mockFetch called exactly once with CREATOR_ID', async () => {
    const updatedCount = 99;
    mockFetchHolderCount.mockResolvedValue(updatedCount);
    queryClient.setQueryData(['creator', CREATOR_ID, 'holderCount'], 42);

    render(
      <FeaturedCreatorAudienceChip
        creatorId={CREATOR_ID}
        fetchHolderCount={mockFetchHolderCount}
      />,
      { wrapper: createWrapper(queryClient) },
    );

    await act(async () => {
      await queryClient.invalidateQueries({
        queryKey: ['creator', CREATOR_ID, 'holderCount'],
      });
    });

    await waitFor(() => {
      expect(screen.getByText(getFeaturedCreatorKeyHolderCopy(updatedCount).value)).toBeInTheDocument();
    });

    expect(mockFetchHolderCount).toHaveBeenCalledTimes(1);
    expect(mockFetchHolderCount).toHaveBeenCalledWith(CREATOR_ID);
  });
});
