import { useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { SearchX } from 'lucide-react';
import KeyCard from '@/components/common/KeyCard';
import { DiscoveryCardGridSkeleton } from '@/components/common/DiscoveryKeyCardSkeleton';
import EmptyState from '@/components/common/EmptyState';
import { Button } from '@/components/ui/button';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useInfiniteCreatorMarketplace } from '@/hooks/useInfiniteCreatorMarketplace';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { cn } from '@/lib/utils';
import {
	DEFAULT_DISCOVERY_CATEGORY,
	DISCOVERY_FEED_CATEGORIES,
	DISCOVERY_FEED_SORT_OPTIONS,
	filterDiscoveryKeysByCategory,
	isValidDiscoveryFeedSort,
	mapDiscoverySortToServerSort,
	sortDiscoveryKeys,
	type DiscoveryFeedSortOption,
} from '@/utils/discoveryFeed.utils';

const SORT_PARAM = 'sort';
const CATEGORY_PARAM = 'category';

const SKELETON_CARD_COUNT = 10;

/**
 * Key discovery feed (#1113).
 *
 * Lists every creator key in an infinite-scroll grid with a sort dropdown
 * (Trending / Newest / Volume / Market Cap) and category filter chips.
 * Sorting and filtering are reflected in the URL so a feed view is
 * shareable, and a dedicated empty state appears when the active filters
 * match no keys.
 */
export default function KeyDiscoveryFeedPage() {
	useDocumentTitle('Discover keys — AccessLayer');
	const [searchParams, setSearchParams] = useSearchParams();

	const requestedSort = searchParams.get(SORT_PARAM);
	const sort: DiscoveryFeedSortOption = isValidDiscoveryFeedSort(requestedSort)
		? requestedSort
		: 'trending';
	const activeCategory =
		searchParams.get(CATEGORY_PARAM) || DEFAULT_DISCOVERY_CATEGORY;

	const updateSearchParam = (key: string, value: string) => {
		setSearchParams(previous => {
			const next = new URLSearchParams(previous);
			next.set(key, value);
			return next;
		});
	};

	const {
		creators,
		hasMore,
		isLoadingFirstPage,
		isFetchingNextPage,
		fetchNextPage,
		refetch,
		error,
	} = useInfiniteCreatorMarketplace(
		{
			sort: mapDiscoverySortToServerSort(sort),
			category:
				activeCategory === DEFAULT_DISCOVERY_CATEGORY
					? undefined
					: activeCategory,
		},
		{ pollIntervalMs: 30_000 }
	);

	const displayKeys = useMemo(
		() =>
			sortDiscoveryKeys(
				filterDiscoveryKeysByCategory(creators, activeCategory),
				sort
			),
		[creators, activeCategory, sort]
	);

	const sentinelRef = useInfiniteScroll<HTMLDivElement>({
		enabled: !isLoadingFirstPage && !isFetchingNextPage,
		hasMore: Boolean(hasMore),
		onLoadMore: () => {
			void fetchNextPage();
		},
	});

	const hasActiveFilters = activeCategory !== DEFAULT_DISCOVERY_CATEGORY;

	const handleResetFilters = () => {
		setSearchParams(previous => {
			const next = new URLSearchParams(previous);
			next.delete(CATEGORY_PARAM);
			return next;
		});
	};

	return (
		<main
			className="min-h-screen bg-[#06111f] px-6 py-16 text-white md:px-12"
			data-testid="key-discovery-feed-page"
		>
			<div className="mx-auto max-w-7xl space-y-6">
				{/* Header */}
				<div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
					<div>
						<h1 className="font-grotesque text-2xl font-black tracking-tight">
							Discover keys
						</h1>
						<p className="mt-1 text-sm text-white/60" data-testid="discovery-feed-result-count">
							{displayKeys.length} creator{' '}
							{displayKeys.length === 1 ? 'key' : 'keys'} listed
						</p>
					</div>

					<div className="flex items-center gap-2">
						<label
							htmlFor="discovery-feed-sort"
							className="text-xs font-semibold uppercase tracking-wider text-white/55"
						>
							Sort by
						</label>
						<select
							id="discovery-feed-sort"
							data-testid="discovery-feed-sort"
							value={sort}
							onChange={event =>
								updateSearchParam(SORT_PARAM, event.target.value)
							}
							className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm font-semibold text-white outline-none focus:border-amber-400/40"
						>
							{DISCOVERY_FEED_SORT_OPTIONS.map(option => (
								<option key={option.value} value={option.value}>
									{option.label}
								</option>
							))}
						</select>
					</div>
				</div>

				{/* Category filter chips */}
				<div
					className="flex flex-wrap gap-2"
					role="group"
					aria-label="Filter keys by category"
					data-testid="discovery-feed-categories"
				>
					{DISCOVERY_FEED_CATEGORIES.map(category => {
						const isActive = category === activeCategory;
						return (
							<button
								key={category}
								type="button"
								aria-pressed={isActive}
								data-testid={`discovery-feed-category-${category.toLowerCase()}`}
								onClick={() => updateSearchParam(CATEGORY_PARAM, category)}
								className={cn(
									'rounded-full px-4 py-1.5 text-xs font-semibold transition-all duration-200 outline-none',
									isActive
										? 'border border-amber-400/40 bg-amber-400/15 text-white'
										: 'border border-white/10 bg-white/[0.06] text-white/60 hover:border-white/20 hover:bg-white/10 hover:text-white/80'
								)}
							>
								{category}
							</button>
						);
					})}
				</div>

				{/* Feed body */}
				{error ? (
					<EmptyState
						icon={<SearchX className="size-10 text-amber-300" aria-hidden="true" />}
						title="We couldn't load the discovery feed"
						description="Something went wrong while fetching creator keys. Try again in a moment."
						ctaLabel="Try again"
						onCtaClick={() => {
							void refetch();
						}}
						data-testid="discovery-feed-error"
					/>
				) : isLoadingFirstPage ? (
					<DiscoveryCardGridSkeleton count={SKELETON_CARD_COUNT} />
				) : displayKeys.length === 0 ? (
					<EmptyState
						icon={
							<SearchX className="size-10 text-amber-300" aria-hidden="true" />
						}
						title="No keys match your filters"
						description={
							hasActiveFilters
								? `Nothing is listed under “${activeCategory}” right now. Clear the filter to browse every key.`
								: 'No creator keys are listed right now. Check back soon.'
						}
						ctaLabel={hasActiveFilters ? 'Clear filters' : undefined}
						onCtaClick={hasActiveFilters ? handleResetFilters : undefined}
						data-testid="discovery-feed-empty"
					/>
				) : (
					<>
						<div
							className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
							data-testid="discovery-feed-grid"
						>
							{displayKeys.map(creator => (
								<KeyCard key={creator.id} creator={creator} />
							))}
						</div>

						{isFetchingNextPage && (
							<DiscoveryCardGridSkeleton count={2} />
						)}

						{hasMore && (
							<div
								ref={sentinelRef}
								data-testid="discovery-feed-sentinel"
								className="h-px w-full"
							/>
						)}

						{hasMore && !isFetchingNextPage && (
							<div className="flex justify-center pt-2">
								<Button
									type="button"
									variant="outline"
									data-testid="discovery-feed-load-more"
									className="rounded-xl border-white/10 bg-white/5 font-bold text-white transition-all hover:border-amber-500/30 hover:bg-amber-500/10"
									onClick={() => {
										void fetchNextPage();
									}}
								>
									Load more keys
								</Button>
							</div>
						)}
					</>
				)}
			</div>
		</main>
	);
}
