import { useInfiniteQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useRef } from 'react';
import { courseService, type Course, type GetCoursesParams } from '@/services/course.service';
import { queryKeys } from '@/lib/queryKeys';

const FIRST_PAGE = 1;

// #691 — cached pages are served instantly and treated as fresh for this
// long; a background refetch only kicks in once data is older than this.
const MARKETPLACE_STALE_TIME_MS = 60_000;

// #918 — live bonding-curve prices on the marketplace listing. Every listing
// polls silently at this interval so the displayed key price (and supply,
// volume) tracks the on-chain curve without a manual refresh.
const MARKETPLACE_POLL_INTERVAL_MS = 30_000;

export interface UseInfiniteCreatorMarketplaceOptions {
	/**
	 * How often (ms) to silently refetch the loaded pages so bonding-curve
	 * prices stay current (#918). Defaults to 30s. Pass `false` to disable
	 * polling entirely (e.g. in tests or non-reactive contexts).
	 */
	pollIntervalMs?: number | false;
}

/**
 * Cursor-based (page-number) infinite pagination over the creator key
 * marketplace listing, backed by React Query's useInfiniteQuery (#685).
 *
 * Replaces "load everything up front, reveal more client-side" with real
 * paged fetches: only the first page loads initially, later pages fetch on
 * demand via `fetchNextPage` (wire this to a useInfiniteScroll sentinel),
 * and fetching stops once the last page reports `hasMore: false`.
 *
 * #691 — `staleTime` enables stale-while-revalidate: a cached list renders
 * immediately (no spinner) on remount within 60s, while React Query silently
 * refetches in the background once it's stale. `isRefreshing` distinguishes
 * that silent background refetch from the initial (spinner-worthy) load.
 *
 * #918 — `refetchInterval` polls the listing on a fixed cadence so the
 * bonding-curve price, supply, and volume stay live on the marketplace page.
 */
export function useInfiniteCreatorMarketplace(
	params?: Omit<GetCoursesParams, 'page'>,
	options?: UseInfiniteCreatorMarketplaceOptions
) {
	const pollIntervalMs = options?.pollIntervalMs ?? MARKETPLACE_POLL_INTERVAL_MS;

	const query = useInfiniteQuery({
		queryKey: queryKeys.creators.infiniteList(params),
		queryFn: ({ pageParam }) => courseService.getCoursesPage(pageParam, params),
		initialPageParam: FIRST_PAGE,
		getNextPageParam: lastPage => (lastPage.hasMore ? lastPage.page + 1 : undefined),
		staleTime: MARKETPLACE_STALE_TIME_MS,
		// #918 — silently refetch the loaded pages on a fixed cadence so the
		// bonding-curve price stays current on the marketplace listing.
		refetchInterval: pollIntervalMs === false ? false : pollIntervalMs,
	});

	// Track whether we've already logged a background refetch for the
	// current fetch cycle so the debug log fires exactly once per refetch.
	const hasLoggedRefetchRef = useRef(false);

	// Track page count to emit a debug log when a new page is fetched via scroll.
	const pageCountRef = useRef(0);

	// Structured debug log on stale-while-revalidate background refetch (#595).
	// Fires when isFetching transitions to true while isLoading is false,
	// which means the data is being silently refreshed in the background
	// rather than loading for the first time. Skipped in test environments.
	useEffect(() => {
		if (import.meta.env.MODE === 'test') return;

		if (query.isFetching && !query.isLoading) {
			if (!hasLoggedRefetchRef.current) {
				hasLoggedRefetchRef.current = true;
				console.debug('[query-background-refetch]', {
					query_key: queryKeys.creators.infiniteList(params),
					stale_time_ms: 0,
					refetch_triggered_at: new Date().toISOString(),
				});
			}
		} else {
			hasLoggedRefetchRef.current = false;
		}
	}, [query.isFetching, query.isLoading, params]);

	// Structured debug log on infinite scroll next page fetch (#624).
	// Emits when the data pages array grows beyond its previous length,
	// ignoring the initial page load (when pageCountRef is 0).
	useEffect(() => {
		if (import.meta.env.MODE === 'test') return;
		if (!query.data) return;

		const currentPages = query.data.pages;
		// Log if page count increased and it wasn't the initial load
		if (currentPages.length > pageCountRef.current && pageCountRef.current > 0) {
			const lastPage = currentPages[currentPages.length - 1];
			console.debug('[infinite-scroll-next-page]', {
				cursor: lastPage.page,
				results_fetched: lastPage.items.length,
				has_more: lastPage.hasMore,
				fetched_at: new Date().toISOString(),
			});
		}
		pageCountRef.current = currentPages.length;
	}, [query.data]);

	// De-duplicate creators across pages by id -- a creator that shifts
	// position between page fetches (e.g. sort order changing as data
	// updates) should never be rendered twice.
	const creators = useMemo<Course[]>(() => {
		const seen = new Set<string>();
		const result: Course[] = [];
		for (const page of query.data?.pages ?? []) {
			for (const creator of page.items) {
				if (seen.has(creator.id)) continue;
				seen.add(creator.id);
				result.push(creator);
			}
		}
		return result;
	}, [query.data]);

	return {
		creators,
		hasMore: query.hasNextPage,
		isLoadingFirstPage: query.isLoading,
		isFetchingNextPage: query.isFetchingNextPage,
		// True only while a background revalidation is in flight after data
		// has already been shown once — never true during the very first,
		// spinner-worthy load (that's isLoadingFirstPage).
		isRefreshing: query.isFetching && !query.isLoading && !query.isFetchingNextPage,
		fetchNextPage: query.fetchNextPage,
		// Manual re-fetch of every loaded page (used by the error retry action).
		refetch: () => query.refetch(),
		error: query.error,
	};
}
