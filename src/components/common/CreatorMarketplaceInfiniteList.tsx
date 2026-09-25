import { useEffect, useMemo, useState } from 'react';
import { useInfiniteCreatorMarketplace } from '@/hooks/useInfiniteCreatorMarketplace';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import CreatorCard from '@/components/common/CreatorCard';
import SearchBar from '@/components/common/SearchBar';
import { CreatorGridSkeleton } from '@/components/common/CreatorSkeleton';
import type { GetCoursesParams } from '@/services/course.service';

export interface CreatorMarketplaceInfiniteListProps {
	params?: Omit<GetCoursesParams, 'page'>;
}

const SEARCH_DEBOUNCE_MS = 300;

/**
 * Creator key marketplace listing with IntersectionObserver-driven infinite
 * scroll (#685): fetches the first page on mount, then automatically fetches
 * subsequent pages via useInfiniteQuery as the user scrolls the sentinel
 * element into view. Shows a skeleton row while the next page is loading and
 * stops fetching once the backend reports no more pages.
 *
 * A search bar (#699) filters the currently-loaded creators client-side by
 * display name (case-insensitive substring match), debounced by 300ms. This
 * filters within the page(s) already fetched rather than issuing a new
 * server request per keystroke — the cursor-based pagination in
 * useInfiniteCreatorMarketplace has no server-side name filter today.
 */
export default function CreatorMarketplaceInfiniteList({
	params,
}: CreatorMarketplaceInfiniteListProps) {
	const {
		creators,
		hasMore,
		isLoadingFirstPage,
		isFetchingNextPage,
		isRefreshing,
		fetchNextPage,
	} = useInfiniteCreatorMarketplace(params);

	const [searchQuery, setSearchQuery] = useState('');
	const [debouncedQuery, setDebouncedQuery] = useState('');

	useEffect(() => {
		const timer = setTimeout(() => setDebouncedQuery(searchQuery), SEARCH_DEBOUNCE_MS);
		return () => clearTimeout(timer);
	}, [searchQuery]);

	// Reset the filter whenever the loaded creator set changes identity due
	// to a new cursor/page landing, per the issue's "filter resets when the
	// page changes" acceptance criterion — a stale query shouldn't silently
	// keep hiding newly-loaded creators from a previous page's context. Both
	// the live input value and the debounced value used for filtering are
	// cleared together so there's no window where they disagree.
	const creatorsKey = creators.map(creator => creator.id).join(',');
	const [lastCreatorsKey, setLastCreatorsKey] = useState(creatorsKey);
	if (creatorsKey !== lastCreatorsKey) {
		setLastCreatorsKey(creatorsKey);
		if (searchQuery) setSearchQuery('');
		if (debouncedQuery) setDebouncedQuery('');
	}

	const trimmedQuery = debouncedQuery.trim().toLowerCase();
	const filteredCreators = useMemo(() => {
		if (!trimmedQuery) return creators;
		return creators.filter(creator => creator.title.toLowerCase().includes(trimmedQuery));
	}, [creators, trimmedQuery]);

	const sentinelRef = useInfiniteScroll<HTMLDivElement>({
		enabled: !isLoadingFirstPage && !isFetchingNextPage,
		hasMore: Boolean(hasMore),
		onLoadMore: () => {
			void fetchNextPage();
		},
	});

	if (isLoadingFirstPage) {
		return (
			<div data-testid="creator-marketplace-initial-skeleton">
				<CreatorGridSkeleton />
			</div>
		);
	}

	return (
		<div data-testid="creator-marketplace-infinite-list">
			{isRefreshing && (
				<div
					data-testid="creator-marketplace-refreshing-indicator"
					role="status"
					aria-live="polite"
					className="mb-3 text-xs text-muted-foreground"
				>
					Refreshing…
				</div>
			)}
			<SearchBar
				value={searchQuery}
				onChange={setSearchQuery}
				placeholder="Search creators"
				className="mb-6"
			/>

			{trimmedQuery && filteredCreators.length === 0 ? (
				<p
					data-testid="creator-marketplace-search-empty-state"
					className="py-12 text-center text-sm text-white/50"
				>
					No results for &quot;{debouncedQuery.trim()}&quot;
				</p>
			) : (
				<div className="grid w-full grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
					{filteredCreators.map(creator => (
						<CreatorCard key={creator.id} creator={creator} />
					))}
				</div>
			)}

			{isFetchingNextPage && (
				<div data-testid="creator-marketplace-next-page-skeleton" className="mt-6">
					<CreatorGridSkeleton count={3} />
				</div>
			)}

			{hasMore && (
				<div ref={sentinelRef} data-testid="creator-marketplace-sentinel" aria-hidden="true" />
			)}
		</div>
	);
}
