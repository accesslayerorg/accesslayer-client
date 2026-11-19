/**
 * Polling (refetchInterval) tests for useInfiniteCreatorMarketplace (#918).
 *
 * The marketplace listing must show live bonding-curve prices: the hook polls
 * every 30 seconds by default, calling courseService.getCoursesPage again for
 * every loaded page so the displayed price tracks the on-chain curve without a
 * manual refresh. Polling can be disabled (or tuned) via options.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useInfiniteCreatorMarketplace } from '../useInfiniteCreatorMarketplace';

const { useInfiniteQuery } = vi.hoisted(() => ({ useInfiniteQuery: vi.fn() }));

vi.mock('@tanstack/react-query', async () => {
	const actual =
		await vi.importActual<typeof import('@tanstack/react-query')>(
			'@tanstack/react-query'
		);
	return { ...actual, useInfiniteQuery };
});

function minimalInfiniteQueryResult() {
	return {
		data: undefined,
		error: null,
		hasNextPage: false,
		isFetching: false,
		isFetchingNextPage: false,
		isLoading: true,
		fetchNextPage: vi.fn(),
		refetch: vi.fn(),
	};
}

function createWrapper() {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	return function Wrapper({ children }: { children: React.ReactNode }) {
		return React.createElement(
			QueryClientProvider,
			{ client: queryClient },
			children
		);
	};
}

describe('useInfiniteCreatorMarketplace polling (#918)', () => {
	beforeEach(() => {
		useInfiniteQuery.mockReset();
		useInfiniteQuery.mockReturnValue(minimalInfiniteQueryResult());
	});

	it('polls the listing every 30 seconds by default', () => {
		renderHook(() => useInfiniteCreatorMarketplace(), {
			wrapper: createWrapper(),
		});

		const options = useInfiniteQuery.mock.calls[0]![0];
		expect(options).toMatchObject({ refetchInterval: 30_000 });
	});

	it('allows a custom polling interval', () => {
		renderHook(
			() => useInfiniteCreatorMarketplace(undefined, { pollIntervalMs: 10_000 }),
			{ wrapper: createWrapper() }
		);

		const options = useInfiniteQuery.mock.calls[0]![0];
		expect(options).toMatchObject({ refetchInterval: 10_000 });
	});

	it('disables polling when pollIntervalMs is false', () => {
		renderHook(
			() => useInfiniteCreatorMarketplace(undefined, { pollIntervalMs: false }),
			{ wrapper: createWrapper() }
		);

		const options = useInfiniteQuery.mock.calls[0]![0];
		expect(options).toMatchObject({ refetchInterval: false });
	});

	it('keeps the stale-time fresh window from #691', () => {
		renderHook(() => useInfiniteCreatorMarketplace(), {
			wrapper: createWrapper(),
		});

		const options = useInfiniteQuery.mock.calls[0]![0];
		expect(options).toMatchObject({ staleTime: 60_000 });
	});
});