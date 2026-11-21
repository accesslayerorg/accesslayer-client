import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { queryKeys } from '@/lib/queryKeys';
import { courseService, type Course } from '@/services/course.service';

export const DISCOVERY_POLL_INTERVAL_MS = 60_000;
export const DISCOVERY_STALE_TIME_MS = 60_000;
export const TRENDING_KEYS_LIMIT = 5;
export const NEW_LISTINGS_LIMIT = 10;

export interface UseKeyDiscoveryOptions {
	/**
	 * How often (in ms) to silently refresh the discovery data so live prices,
	 * 24h volumes, and new listings stay current (#937). Defaults to 60,000ms (60s).
	 * Pass `false` to disable periodic polling.
	 */
	pollIntervalMs?: number | false;
}

/**
 * Sorts creator keys by 24h volume descending and returns the top 5.
 */
export function sortTrendingKeys(creators: Course[]): Course[] {
	return [...creators]
		.sort((a, b) => (b.volume24h ?? 0) - (a.volume24h ?? 0))
		.slice(0, TRENDING_KEYS_LIMIT);
}

/**
 * Sorts creator keys by creation date descending and returns the latest 10.
 * Falls back to joinedAt / nextDropAt if createdAt is absent.
 */
export function sortNewListings(creators: Course[]): Course[] {
	const getCreationTimeMs = (c: Course): number => {
		const dateStr = c.createdAt || c.joinedAt || c.nextDropAt;
		if (!dateStr) return 0;
		const time = new Date(dateStr).getTime();
		return Number.isFinite(time) ? time : 0;
	};

	return [...creators]
		.sort((a, b) => getCreationTimeMs(b) - getCreationTimeMs(a))
		.slice(0, NEW_LISTINGS_LIMIT);
}

/**
 * Filters keys that are within 10% of their final supply milestone.
 * Final supply is assumed to be 1000 (graduation threshold).
 */
export function filterGraduatingSoon(creators: Course[]): Course[] {
	const GRADUATION_SUPPLY = 1000;
	const GRADUATION_THRESHOLD_PERCENT = 0.1; // 10%

	return creators.filter(creator => {
		const currentSupply = creator.creatorShareSupply ?? 0;
		if (currentSupply <= 0) return false;

		const remainingToGraduation = GRADUATION_SUPPLY - currentSupply;
		const percentToGraduation = remainingToGraduation / GRADUATION_SUPPLY;

		return (
			currentSupply < GRADUATION_SUPPLY &&
			percentToGraduation <= GRADUATION_THRESHOLD_PERCENT
		);
	});
}

/**
 * Filters keys deployed in the last 7 days.
 */
export function filterNewLaunches(creators: Course[]): Course[] {
	const now = new Date();
	const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

	return creators.filter(creator => {
		const dateStr =
			creator.createdAt || creator.joinedAt || creator.nextDropAt;
		if (!dateStr) return false;
		const createdTime = new Date(dateStr);
		return (
			createdTime >= sevenDaysAgo && !Number.isNaN(createdTime.getTime())
		);
	});
}

/**
 * Hook for key discovery page (#937) and discovery feed.
 *
 * Provides:
 * - Top 5 keys by 24h volume (Trending)
 * - Latest 10 keys ordered by creation date descending (New Listings)
 * - Keys within 10% of graduation milestone
 * - Automatic background data refresh every 60 seconds without full page reload
 */
export function useKeyDiscovery(options?: UseKeyDiscoveryOptions) {
	const pollIntervalMs = options?.pollIntervalMs ?? DISCOVERY_POLL_INTERVAL_MS;
	const refetchInterval = pollIntervalMs === false ? false : pollIntervalMs;

	const trendingQuery = useQuery({
		queryKey: queryKeys.creators.discovery.trending(),
		queryFn: () => courseService.getCourses({ sort: 'volume_desc' }),
		staleTime: DISCOVERY_STALE_TIME_MS,
		refetchInterval,
	});

	const newListingsQuery = useQuery({
		queryKey: queryKeys.creators.discovery.newListings(),
		queryFn: () => courseService.getCourses({ sort: 'newest' }),
		staleTime: DISCOVERY_STALE_TIME_MS,
		refetchInterval,
	});

	const trendingKeys = useMemo<Course[]>(() => {
		if (!trendingQuery.data) return [];
		return sortTrendingKeys(trendingQuery.data);
	}, [trendingQuery.data]);

	const newListings = useMemo<Course[]>(() => {
		if (!newListingsQuery.data) return [];
		return sortNewListings(newListingsQuery.data);
	}, [newListingsQuery.data]);

	const isLoading = trendingQuery.isLoading || newListingsQuery.isLoading;

	const isRefreshing =
		(trendingQuery.isFetching && !trendingQuery.isLoading) ||
		(newListingsQuery.isFetching && !newListingsQuery.isLoading);

	const error = trendingQuery.error || newListingsQuery.error;

	const refetch = async () => {
		await Promise.all([trendingQuery.refetch(), newListingsQuery.refetch()]);
	};

	return {
		trendingKeys,
		newListings,
		isLoading,
		isRefreshing,
		error,
		refetch,
	};
}

/**
 * Hook for discovery feed with trending, new launches, and graduating soon sections.
 * Refreshes every 5 minutes.
 */
export function useDiscoveryFeed() {
	const FIVE_MINUTES_MS = 5 * 60 * 1000;

	const allKeysQuery = useQuery({
		queryKey: queryKeys.creators.list(),
		queryFn: () => courseService.getCourses({}),
		staleTime: FIVE_MINUTES_MS,
		refetchInterval: FIVE_MINUTES_MS,
	});

	const trendingKeys = useMemo<Course[]>(() => {
		if (!allKeysQuery.data) return [];
		return sortTrendingKeys(allKeysQuery.data);
	}, [allKeysQuery.data]);

	const newLaunches = useMemo<Course[]>(() => {
		if (!allKeysQuery.data) return [];
		const newKeys = filterNewLaunches(allKeysQuery.data);
		return [...newKeys]
			.sort(
				(a, b) =>
					new Date(b.createdAt || b.joinedAt || '').getTime() -
					new Date(a.createdAt || a.joinedAt || '').getTime()
			)
			.slice(0, 5);
	}, [allKeysQuery.data]);

	const graduatingSoon = useMemo<Course[]>(() => {
		if (!allKeysQuery.data) return [];
		return filterGraduatingSoon(allKeysQuery.data).slice(0, 5);
	}, [allKeysQuery.data]);

	const isLoading = allKeysQuery.isLoading;
	const isRefreshing = allKeysQuery.isFetching && !allKeysQuery.isLoading;
	const error = allKeysQuery.error;

	return {
		trendingKeys,
		newLaunches,
		graduatingSoon,
		isLoading,
		isRefreshing,
		error,
	};
}
