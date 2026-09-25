import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useCreatorProfileCacheLog } from '@/hooks/useCreatorProfileCacheLog';
import { queryKeys } from '@/lib/queryKeys';
import { logger } from '@/utils/logger';

// Spy on the logger so we can assert calls without touching console.
vi.mock('@/utils/logger', () => ({
	logger: {
		debug: vi.fn(),
	},
}));

const mockLoggerDebug = vi.mocked(logger.debug);

// ─── helpers ─────────────────────────────────────────────────────────────────

function makeWrapper(client: QueryClient) {
	return function Wrapper({ children }: { children: React.ReactNode }) {
		return React.createElement(QueryClientProvider, { client }, children);
	};
}

/**
 * Pre-populate a QueryClient cache entry so the hook sees existing data
 * on mount (simulating a cache hit scenario).
 */
function seedCache(
	client: QueryClient,
	creatorId: string,
	dataUpdatedAt: number
) {
	// setQueryData puts data in the cache and updates dataUpdatedAt.
	client.setQueryData(queryKeys.creatorProfile.byId(creatorId), {
		id: creatorId,
		title: 'Test Creator',
	});
	// Manually adjust the state timestamp so data_age_ms is deterministic.
	const cache = client.getQueryCache();
	const query = cache.find({ queryKey: queryKeys.creatorProfile.byId(creatorId) });
	if (query) {
		// @ts-expect-error — directly patching internal state for test isolation.
		query.state.dataUpdatedAt = dataUpdatedAt;
	}
}

// ─────────────────────────────────────────────────────────────────────────────

describe('useCreatorProfileCacheLog', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('emits a debug log with correct fields on cache hit', () => {
		const client = new QueryClient();
		const creatorId = 'creator-abc';
		const dataUpdatedAt = Date.now() - 5_000; // data is 5 seconds old

		seedCache(client, creatorId, dataUpdatedAt);

		renderHook(
			() => useCreatorProfileCacheLog(creatorId, false, true),
			{ wrapper: makeWrapper(client) }
		);

		expect(mockLoggerDebug).toHaveBeenCalledOnce();
		expect(mockLoggerDebug).toHaveBeenCalledWith('creator profile cache hit', {
			creator_id: creatorId,
			cache_status: 'hit',
			data_age_ms: 5_000,
		});
	});

	it('data_age_ms reflects time since last successful fetch', () => {
		const client = new QueryClient();
		const creatorId = 'creator-xyz';
		const ageMs = 12_345;
		const dataUpdatedAt = Date.now() - ageMs;

		seedCache(client, creatorId, dataUpdatedAt);

		renderHook(
			() => useCreatorProfileCacheLog(creatorId, false, true),
			{ wrapper: makeWrapper(client) }
		);

		const [, fields] = mockLoggerDebug.mock.calls[0];
		expect(fields).toMatchObject({ data_age_ms: ageMs });
	});

	it('does not emit a log when a network fetch is in progress (isFetching=true)', () => {
		const client = new QueryClient();
		const creatorId = 'creator-fetching';
		const dataUpdatedAt = Date.now() - 2_000;

		seedCache(client, creatorId, dataUpdatedAt);

		renderHook(
			// isFetching=true means a network request is in flight
			() => useCreatorProfileCacheLog(creatorId, true, true),
			{ wrapper: makeWrapper(client) }
		);

		expect(mockLoggerDebug).not.toHaveBeenCalled();
	});

	it('does not emit a log when there is no successful data yet (isSuccess=false)', () => {
		const client = new QueryClient();
		const creatorId = 'creator-loading';

		renderHook(
			// First load — no cached data exists
			() => useCreatorProfileCacheLog(creatorId, true, false),
			{ wrapper: makeWrapper(client) }
		);

		expect(mockLoggerDebug).not.toHaveBeenCalled();
	});

	it('emits the log only once per mount even if re-rendered multiple times', () => {
		const client = new QueryClient();
		const creatorId = 'creator-rerender';
		const dataUpdatedAt = Date.now() - 1_000;

		seedCache(client, creatorId, dataUpdatedAt);

		const { rerender } = renderHook(
			({ fetching, success }: { fetching: boolean; success: boolean }) =>
				useCreatorProfileCacheLog(creatorId, fetching, success),
			{
				wrapper: makeWrapper(client),
				initialProps: { fetching: false, success: true },
			}
		);

		// First render triggers the log.
		expect(mockLoggerDebug).toHaveBeenCalledOnce();

		// Re-render with same props — must not fire again.
		rerender({ fetching: false, success: true });
		expect(mockLoggerDebug).toHaveBeenCalledOnce();

		// Another re-render — still just once.
		rerender({ fetching: false, success: true });
		expect(mockLoggerDebug).toHaveBeenCalledOnce();
	});

	it('does not emit a log when cache entry has dataUpdatedAt=0 (never fetched from network)', () => {
		const client = new QueryClient();
		const creatorId = 'creator-no-data-ts';

		// Seed with dataUpdatedAt=0 to simulate an entry that was never
		// populated from a real network response.
		seedCache(client, creatorId, 0);
		const cache = client.getQueryCache();
		const query = cache.find({ queryKey: queryKeys.creatorProfile.byId(creatorId) });
		if (query) {
			// @ts-expect-error — directly patching internal state for test isolation.
			query.state.dataUpdatedAt = 0;
		}

		renderHook(
			() => useCreatorProfileCacheLog(creatorId, false, true),
			{ wrapper: makeWrapper(client) }
		);

		expect(mockLoggerDebug).not.toHaveBeenCalled();
	});

	it('emits a new log after the component remounts (new mount = new hasFiredRef)', () => {
		const client = new QueryClient();
		const creatorId = 'creator-remount';
		const dataUpdatedAt = Date.now() - 3_000;

		seedCache(client, creatorId, dataUpdatedAt);

		const { unmount } = renderHook(
			() => useCreatorProfileCacheLog(creatorId, false, true),
			{ wrapper: makeWrapper(client) }
		);
		expect(mockLoggerDebug).toHaveBeenCalledOnce();

		// Unmount and remount — hasFiredRef resets, so it should log again.
		unmount();
		mockLoggerDebug.mockClear();

		// Update the seed timestamp so data_age_ms is still valid after remount.
		const cache = client.getQueryCache();
		const query = cache.find({ queryKey: queryKeys.creatorProfile.byId(creatorId) });
		if (query) {
			// @ts-expect-error — directly patching internal state for test isolation.
			query.state.dataUpdatedAt = Date.now() - 4_000;
		}

		renderHook(
			() => useCreatorProfileCacheLog(creatorId, false, true),
			{ wrapper: makeWrapper(client) }
		);
		expect(mockLoggerDebug).toHaveBeenCalledOnce();
	});
});
