import type { QueryClient } from '@tanstack/react-query';
import { indexedDBCache, MAX_AGE_MS } from './indexedDBCache';

/**
 * Restores persisted queries younger than 24 hours from IndexedDB into
 * the React Query cache so the UI renders immediately with stale data
 * before the first network fetch completes.
 *
 * Stale entries (older than MAX_AGE_MS) are evicted first so they are
 * never surfaced to the UI.
 */
export async function restorePersistedQueries(
	queryClient: QueryClient
): Promise<void> {
	await indexedDBCache.evictStale(MAX_AGE_MS);
	const entries = await indexedDBCache.getAll();
	for (const entry of entries) {
		queryClient.setQueryData(
			entry.queryKey as readonly unknown[],
			entry.data,
			{ updatedAt: entry.dataUpdatedAt }
		);
	}
}

/**
 * Subscribes to React Query cache events and persists every query whose
 * data has been set or updated to IndexedDB.
 *
 * Returns an unsubscribe function — call it on app teardown.
 */
export function subscribeToQueryCache(queryClient: QueryClient): () => void {
	return queryClient.getQueryCache().subscribe(event => {
		if (!event) return;
		const { query } = event;
		if (query.state.data !== undefined) {
			void indexedDBCache.set(query.queryHash, {
				queryKey: query.queryKey,
				data: query.state.data,
				dataUpdatedAt: query.state.dataUpdatedAt,
				queryHash: query.queryHash,
			});
		}
	});
}
