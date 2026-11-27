
import { useInfiniteQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import {
	courseService,
	type KeyHolderLeaderboardEntry,
	type KeyHolderLeaderboardMetric,
} from '@/services/course.service';
import { queryKeys } from '@/lib/queryKeys';

export interface UseKeyHolderLeaderboardOptions {
	metric: KeyHolderLeaderboardMetric;
	userWallet?: string;
	pageSize?: number;
	enabled?: boolean;
}

/**
 * Hook to fetch paginated key holder leaderboard entries ranked by metric (#1203).
 * Backed by GET /keys/:keyId/leaderboard?metric=X
 */
export function useKeyHolderLeaderboard(
	keyId: string,
	options?: Partial<UseKeyHolderLeaderboardOptions>
) {
	const metric: KeyHolderLeaderboardMetric = options?.metric ?? 'volume';
	const userWallet = options?.userWallet;
	const pageSize = options?.pageSize ?? 10;
	const enabled = options?.enabled ?? true;

	const query = useInfiniteQuery({
		queryKey: queryKeys.creators.holderLeaderboard(keyId, metric, userWallet),
		queryFn: ({ pageParam, signal }) =>
			courseService.getKeyHolderLeaderboard(keyId, {
				metric,
				limit: pageSize,
				cursor: pageParam ?? undefined,
				userWallet,
				signal,
			}),
		initialPageParam: null as string | null,
		getNextPageParam: lastPage =>
			lastPage?.hasMore ? lastPage.nextCursor : undefined,
		enabled: Boolean(keyId) && enabled,
	});

	const entries = useMemo<KeyHolderLeaderboardEntry[]>(() => {
		const seen = new Set<string>();
		const result: KeyHolderLeaderboardEntry[] = [];

		for (const page of query.data?.pages ?? []) {
			for (const entry of page.entries) {
				const uniqueKey = `${entry.rank}:${entry.walletAddress}`;
				if (seen.has(uniqueKey)) continue;
				seen.add(uniqueKey);
				result.push(entry);
			}
		}

		return result;
	}, [query.data]);

	const userRank = useMemo<KeyHolderLeaderboardEntry | null>(() => {
		const apiUserRank = query.data?.pages?.[0]?.userRank;
		if (apiUserRank) return apiUserRank;

		if (userWallet) {
			const found = entries.find(
				e => e.walletAddress.toLowerCase() === userWallet.toLowerCase()
			);
			if (found) return found;
		}

		return null;
	}, [query.data, entries, userWallet]);

	const isUserInTop10 = useMemo(() => {
		if (!userWallet) return false;
		const normalized = userWallet.toLowerCase();

		return entries
			.slice(0, 10)
			.some(e => e.walletAddress.toLowerCase() === normalized);
	}, [entries, userWallet]);

	return {
		entries,
		userRank,
		isUserInTop10,
		hasNextPage: !!query.hasNextPage,
		isFetchingNextPage: query.isFetchingNextPage,
		isLoading: query.isLoading,
		isError: query.isError,
		error: query.error,
		fetchNextPage: query.fetchNextPage,
		refetch: query.refetch,
	};
}
