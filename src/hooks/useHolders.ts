import { useInfiniteQuery } from '@tanstack/react-query';
import { holderService } from '@/services/holder.service';
import type { HolderRow } from '@/types/holder.types';
import { useMemo } from 'react';

const PAGE_SIZE = 50;

/**
 * Hook for fetching paginated holder data with automatic rank and share recalculation
 */
export function useHolders(creatorId: string) {
	const query = useInfiniteQuery({
		queryKey: ['holders', creatorId],
		queryFn: ({ pageParam }) =>
			holderService.getHolders({
				creatorId,
				limit: PAGE_SIZE,
				cursor: pageParam,
			}),
		getNextPageParam: lastPage =>
			lastPage.hasMore ? lastPage.nextCursor : undefined,
		initialPageParam: undefined as string | undefined,
		enabled: !!creatorId,
		staleTime: 30_000, // 30 seconds
		gcTime: 5 * 60_000, // 5 minutes
	});

	// Flatten all pages and recalculate ranks and shares
	const { holders, totalCount, holderMap } = useMemo(() => {
		const pages = query.data?.pages ?? [];
		const allHolders: HolderRow[] = [];
		const map = new Map<number, HolderRow>();

		// Get total count from the most recent page
		const total = pages[pages.length - 1]?.total ?? 0;

		// Flatten all pages
		pages.forEach(page => {
			allHolders.push(...page.holders);
		});

		// Recalculate ranks and share percentages
		// Use Float64Array for performance with large datasets
		const totalKeys = allHolders.reduce(
			(sum, holder) => sum + holder.keyCount,
			0
		);

		allHolders.forEach((holder, index) => {
			const recalculated: HolderRow = {
				...holder,
				rank: index + 1,
				sharePercentage:
					totalKeys > 0 ? (holder.keyCount / totalKeys) * 100 : 0,
			};
			map.set(index, recalculated);
		});

		return {
			holders: allHolders,
			totalCount: total,
			holderMap: map,
		};
	}, [query.data?.pages]);

	return {
		holders,
		totalCount,
		holderMap,
		isLoading: query.isLoading,
		isError: query.isError,
		error: query.error,
		fetchNextPage: query.fetchNextPage,
		hasNextPage: query.hasNextPage,
		isFetchingNextPage: query.isFetchingNextPage,
	};
}
