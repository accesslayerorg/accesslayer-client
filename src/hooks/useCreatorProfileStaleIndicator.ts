import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { useStaleData } from './useStaleData';

/**
 * Configuration options for the stale indicator hook.
 */
export interface UseCreatorProfileStaleIndicatorOptions {
	/** Override the default 60s freshness window. */
	thresholdMs?: number;
	/** Callback when a refetch is requested. */
	onRefetchRequested?: () => void;
}

/**
 * Return value for the stale indicator hook.
 */
export interface UseCreatorProfileStaleIndicatorReturn {
	/** Whether the data is currently stale (older than threshold). */
	isStale: boolean;
	/** Whether the badge should be visible (stale but user has seen fresh data). */
	shouldShowBadge: boolean;
	/** Milliseconds since the data was last updated. */
	ageMs: number;
	/** Call this when the user clicks the badge to trigger a refetch. */
	handleRefetch: () => void;
}

/**
 * Tracks staleness of creator profile data and manages visibility of the
 * stale data indicator badge.
 *
 * This hook:
 * - Monitors query cache age via `dataUpdatedAt`
 * - Tracks when data crosses the 60-second freshness boundary
 * - Manages badge visibility (not shown on initial load)
 * - Triggers refetch when user clicks the badge
 * - Auto-hides badge when refetch completes
 *
 * @param creatorId - The creator ID for the profile query
 * @param isFetching - Whether a fetch is currently in progress
 * @param onRefetch - Callback to trigger manual refetch (usually `refetch()` from useQuery)
 * @param options - Configuration options
 */
export function useCreatorProfileStaleIndicator(
	creatorId: string,
	isFetching: boolean,
	onRefetch: () => void,
	options: UseCreatorProfileStaleIndicatorOptions = {}
): UseCreatorProfileStaleIndicatorReturn {
	const queryClient = useQueryClient();
	const { thresholdMs } = options;

	// Track whether we've seen fresh data (so we know when to show the badge).
	// Badge is not shown on initial load — only after data goes stale.
	const [hasSeenFreshDataRef] = useState(() => {
		const state = queryClient.getQueryState(
			queryKeys.creators.detail(creatorId)
		);
		// If we have a cached entry with valid timestamp, we've "seen" it
		return state?.dataUpdatedAt !== undefined && state.dataUpdatedAt > 0;
	});

	// Get the current dataUpdatedAt from React Query's cache
	const [dataUpdatedAt, setDataUpdatedAt] = useState(() => {
		const state = queryClient.getQueryState(
			queryKeys.creators.detail(creatorId)
		);
		return state?.dataUpdatedAt ?? null;
	});

	// Sync dataUpdatedAt when the query updates
	useEffect(() => {
		const state = queryClient.getQueryState(
			queryKeys.creators.detail(creatorId)
		);
		if (state?.dataUpdatedAt !== undefined && state.dataUpdatedAt > 0) {
			setDataUpdatedAt(state.dataUpdatedAt);
		}
	}, [creatorId, queryClient, isFetching]); // Re-sync when fetch completes

	// Use the staleData hook to detect staleness threshold
	const { stale, ageMs } = useStaleData(dataUpdatedAt, {
		thresholdMs,
		onStale: () => {
			// Optionally trigger background refetch when data becomes stale
			// (can be used for auto-refresh, but we'll let user click badge instead)
		},
	});

	// Track whether the badge should be visible: stale AND we've seen fresh data
	const shouldShowBadge = stale && hasSeenFreshDataRef;

	// Handle user clicking the badge to refresh
	const handleRefetch = () => {
		onRefetch();
		// Badge will auto-hide when the refetch completes and dataUpdatedAt updates
	};

	return {
		isStale: stale,
		shouldShowBadge,
		ageMs,
		handleRefetch,
	};
}
