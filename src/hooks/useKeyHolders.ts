import { useInfiniteQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { courseService, type KeyHolderEntry } from '@/services/course.service';
import { queryKeys } from '@/lib/queryKeys';

/**
 * Cursor-paginated infinite query for key holders, backed by
 * GET /keys/:keyId/holders. The first page loads on mount; subsequent
 * pages fetch on demand via `fetchNextPage` (wire to a useInfiniteScroll
 * sentinel). Fetching stops once the backend returns `nextCursor: null`.
 */
export function useKeyHolders(keyId: string) {
	const query = useInfiniteQuery({
		queryKey: queryKeys.creators.holders(keyId),
		queryFn: ({ pageParam }) =>
			courseService.getHoldersPage(keyId, pageParam),
		initialPageParam: null as string | null,
		getNextPageParam: lastPage => lastPage.nextCursor,
		enabled: !!keyId,
	});

	const holders = useMemo<KeyHolderEntry[]>(() => {
		const seen = new Set<string>();
		const result: KeyHolderEntry[] = [];
		for (const page of query.data?.pages ?? []) {
			for (const holder of page.holders) {
				if (seen.has(holder.id)) continue;
				seen.add(holder.id);
				result.push(holder);
			}
		}
		return result;
	}, [query.data]);

	return {
		holders,
		hasNextPage: query.hasNextPage,
		isFetchingNextPage: query.isFetchingNextPage,
		isLoading: query.isLoading,
		fetchNextPage: query.fetchNextPage,
	};
}
