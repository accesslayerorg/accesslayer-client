import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { logger } from '@/utils/logger';

/**
 * Emits a debug-level cache-hit log when a creator profile query is
 * served entirely from the React Query cache — i.e. the component
 * mounted, data was already available, **and** no network fetch was
 * triggered.
 *
 * The log includes:
 * - `creator_id`   — the queried creator.
 * - `cache_status: 'hit'` — always `'hit'` when the log fires.
 * - `data_age_ms`  — milliseconds since the query was last successfully
 *   fetched from the network.
 *
 * The log fires **at most once per mount** to avoid duplicate entries on
 * re-renders. It is suppressed when a network fetch is in progress or
 * when the environment is `test` (handled inside `logger`).
 *
 * @param creatorId  - The creator ID passed to the profile query.
 * @param isFetching - `isFetching` from the corresponding `useQuery`.
 * @param isSuccess  - `isSuccess` from the corresponding `useQuery`.
 */
export function useCreatorProfileCacheLog(
	creatorId: string,
	isFetching: boolean,
	isSuccess: boolean
): void {
	const queryClient = useQueryClient();
	// Guard: fire at most once per mount regardless of re-renders.
	const hasFiredRef = useRef(false);

	useEffect(() => {
		// Already logged this mount — skip.
		if (hasFiredRef.current) return;
		// Data must be present and no network fetch in flight.
		if (!isSuccess || isFetching) return;

		// Retrieve the full query state to read `dataUpdatedAt`.
		const state = queryClient.getQueryState(
			queryKeys.creatorProfile.byId(creatorId)
		);

		// `dataUpdatedAt === 0` means the cache entry was never populated by a
		// network response — nothing useful to log.
		if (!state || state.dataUpdatedAt === 0) return;

		const data_age_ms = Date.now() - state.dataUpdatedAt;

		logger.debug('creator profile cache hit', {
			creator_id: creatorId,
			cache_status: 'hit' as const,
			data_age_ms,
		});

		hasFiredRef.current = true;
	}, [creatorId, isFetching, isSuccess, queryClient]);
}
