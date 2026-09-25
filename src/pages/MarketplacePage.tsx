import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { ChevronDown, RefreshCw } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useInfiniteCreatorMarketplace } from '@/hooks/useInfiniteCreatorMarketplace';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { useNavigationTiming } from '@/hooks/useNavigationTiming';
import type { Course, CourseSortOption } from '@/services/course.service';
import CreatorCard from '@/components/common/CreatorCard';
import { CreatorCardGridSkeleton } from '@/components/common/CreatorCardSkeleton';
import ClearedFiltersEmptyState from '@/components/common/ClearedFiltersEmptyState';
import EmptyState from '@/components/common/EmptyState';
import MarketplaceSection from '@/components/common/MarketplaceSection';
import SearchBar from '@/components/common/SearchBar';
import SectionDivider from '@/components/common/SectionDivider';
import StickyFilterBar from '@/components/common/StickyFilterBar';
import { Button } from '@/components/ui/button';
import {
	MARKETPLACE_SORT_OPTIONS,
	sortCreatorsByOption,
} from '@/utils/marketplaceSort.utils';
import { formatNumber } from '@/utils/numberFormat.utils';
import {
	SUPPLY_TIERS,
	matchesSupplyTier,
	type SupplyTierFilter,
} from '@/utils/supplyTier.utils';

const PAGE_LIMIT = 12;
const SEARCH_DEBOUNCE_MS = 300;
const PRICE_POLL_INTERVAL_MS = 30_000;

const VALID_SORT_OPTIONS: CourseSortOption[] = [
	'volume_desc',
	'price_asc',
	'price_desc',
	'newest',
];

function creatorMatchesSearch(creator: Course, query: string): boolean {
	return [creator.title, creator.name, creator.instructorId, creator.socialHandle]
		.filter(Boolean)
		.some(field => field!.toLowerCase().includes(query));
}

/**
 * The creator key marketplace listing page (#918).
 *
 * Every creator key on the platform is offered here at its live bonding-curve
 * price with minted supply and 24h volume. The listing polls once every 30
 * seconds so those prices track the on-chain curve without a manual refresh.
 * Sort (volume / price / newest) and supply-tier filtering run entirely
 * client-side over the already-loaded pages — changing them never triggers a
 * full page refetch.
 */
export default function MarketplacePage() {
	useNavigationTiming('marketplace');
	useDocumentTitle('Marketplace — AccessLayer');

	const [searchParams, setSearchParams] = useSearchParams();

	const initialSortParam = searchParams.get('sort');
	const initialSort: CourseSortOption =
		initialSortParam && VALID_SORT_OPTIONS.includes(initialSortParam as CourseSortOption)
			? (initialSortParam as CourseSortOption)
			: 'volume_desc';

	const {
		creators,
		hasMore,
		isLoadingFirstPage,
		isFetchingNextPage,
		isRefreshing,
		fetchNextPage,
		refetch,
		error,
	} = useInfiniteCreatorMarketplace(
		{ limit: PAGE_LIMIT },
		{ pollIntervalMs: PRICE_POLL_INTERVAL_MS }
	);

	const [searchQuery, setSearchQuery] = useState('');
	const debouncedSearchQuery = useDebounce(searchQuery, SEARCH_DEBOUNCE_MS);
	const trimmedSearch = debouncedSearchQuery.trim().toLowerCase();

	const [sortOption, setSortOption] = useState<CourseSortOption>(initialSort);
	const [supplyTier, setSupplyTier] = useState<SupplyTierFilter>('all');

	// Synchronize sortOption if URL query param changes
	useEffect(() => {
		const param = searchParams.get('sort');
		if (param && VALID_SORT_OPTIONS.includes(param as CourseSortOption)) {
			setSortOption(param as CourseSortOption);
		}
	}, [searchParams]);

	const handleSortChange = (newSort: CourseSortOption) => {
		setSortOption(newSort);
		const newParams = new URLSearchParams(searchParams);
		if (newSort === 'volume_desc') {
			newParams.delete('sort');
		} else {
			newParams.set('sort', newSort);
		}
		setSearchParams(newParams, { replace: true });
	};

	const hasActiveFilters =
		Boolean(trimmedSearch) || supplyTier !== 'all' || sortOption !== 'volume_desc';

	// #918 — sort and supply-tier filter are applied client-side over the
	// pages already fetched from the server, so they work instantly and never
	// require a fresh network fetch.
	const visibleCreators = useMemo(() => {
		const searched = trimmedSearch
			? creators.filter(creator => creatorMatchesSearch(creator, trimmedSearch))
			: creators;
		const tierFiltered = searched.filter(creator =>
			matchesSupplyTier(creator.creatorShareSupply, supplyTier)
		);
		return sortCreatorsByOption(tierFiltered, sortOption);
	}, [creators, trimmedSearch, supplyTier, sortOption]);

	const sentinelRef = useInfiniteScroll<HTMLDivElement>({
		enabled: !isLoadingFirstPage && !isFetchingNextPage,
		hasMore: Boolean(hasMore),
		onLoadMore: () => {
			void fetchNextPage();
		},
	});

	const handleResetFilters = () => {
		setSearchQuery('');
		setSupplyTier('all');
		setSortOption('volume_desc');
		const newParams = new URLSearchParams(searchParams);
		newParams.delete('sort');
		setSearchParams(newParams, { replace: true });
	};

	const handleRetry = () => {
		void refetch();
	};

	return (
		<div className="relative min-h-screen overflow-x-hidden bg-[linear-gradient(160deg,#08111f_0%,#10213b_45%,#f0b14d_160%)] px-6 pt-12 pb-28 md:px-12 md:pb-12">
			<div className="absolute left-[-4rem] top-[10%] size-72 rounded-full bg-amber-300/20 blur-[100px]" />
			<div className="absolute bottom-[8%] right-[-3rem] size-72 rounded-full bg-emerald-300/15 blur-[100px]" />
			<div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,186,73,0.1),transparent_40%),radial-gradient(circle_at_bottom_left,rgba(74,222,128,0.08),transparent_35%)]" />

			<div className="relative z-10 mx-auto max-w-7xl">
				<MarketplaceSection as="header" spacing="major" className="text-center">
					<img
						className="mx-auto mb-8 size-10"
						src="/icons/logo.svg"
						alt="Access Layer logo"
					/>
					<p className="mb-3 text-sm font-bold uppercase tracking-[0.25em] text-amber-400/80">
						Creator Keys Marketplace
					</p>
					<h1 className="mb-4 font-grotesque text-[clamp(2.5rem,8vw,4rem)] font-extrabold leading-[1.1] tracking-tight text-white">
						Explore the market
					</h1>
					<p className="mx-auto mb-6 max-w-2xl font-jakarta text-sm leading-relaxed text-white/55">
						Every creator key on Access Layer, priced live from its
						bonding curve. Sort by volume or price, filter by supply
						milestone, and watch prices refresh automatically — no page
						reloads.
					</p>
					<div className="flex justify-center">
						<span
							role="status"
							aria-live="polite"
							aria-busy={isRefreshing || undefined}
							data-testid="marketplace-poll-status"
							className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-white/60"
						>
							{isRefreshing ? (
								<RefreshCw
									className="size-3.5 animate-spin text-amber-400 motion-reduce:animate-none"
									aria-hidden="true"
								/>
							) : (
								<span
									className="size-1.5 animate-pulse rounded-full bg-emerald-400"
									aria-hidden="true"
								/>
							)}
							{isRefreshing ? 'Refreshing live prices…' : 'Prices refresh every 30s'}
						</span>
					</div>
				</MarketplaceSection>

				<main id="marketplace-listing-main" aria-label="Creator key marketplace listing">
					<SectionDivider title="Discover creators" spacing="relaxed" />

					<StickyFilterBar
						eyebrow="Marketplace filters"
						title="Sort and filter creator keys"
						description="Sort by 24h volume, bonding-curve price, or newest. Filter by supply milestone tier. Both apply instantly to the keys already loaded — they never trigger a page refetch."
						resultCount={isLoadingFirstPage ? undefined : visibleCreators.length}
						onReset={handleResetFilters}
						showReset={hasActiveFilters}
					>
						<div className="space-y-3">
							<SearchBar
								value={searchQuery}
								onChange={setSearchQuery}
								placeholder="Search creators by name or handle"
								className="max-w-none"
							/>
							<div className="flex flex-col gap-3 sm:flex-row">
								<div className="flex items-center gap-3">
									<label
										htmlFor="marketplace-sort"
										className="marketplace-label-muted text-xs font-semibold uppercase tracking-[0.16em]"
									>
										Sort
									</label>
									<select
										id="marketplace-sort"
										data-testid="marketplace-sort-select"
										value={sortOption}
										onChange={e =>
											handleSortChange(e.target.value as CourseSortOption)
										}
										className="h-9 w-full rounded-lg border border-white/15 bg-slate-950/80 px-3 text-sm text-white outline-none focus:border-amber-400/60"
									>
										{MARKETPLACE_SORT_OPTIONS.map(option => (
											<option key={option.value} value={option.value}>
												{option.label}
											</option>
										))}
									</select>
								</div>
								<div className="flex items-center gap-3">
									<label
										htmlFor="marketplace-supply-tier"
										className="marketplace-label-muted text-xs font-semibold uppercase tracking-[0.16em]"
									>
										Supply tier
									</label>
									<select
										id="marketplace-supply-tier"
										data-testid="marketplace-supply-tier-select"
										value={supplyTier}
										onChange={e =>
											setSupplyTier(e.target.value as SupplyTierFilter)
										}
										className="h-9 w-full rounded-lg border border-white/15 bg-slate-950/80 px-3 text-sm text-white outline-none focus:border-amber-400/60"
									>
										<option value="all">All supply tiers</option>
										{SUPPLY_TIERS.map(tier => (
											<option key={tier.id} value={tier.id}>
												{tier.label}
											</option>
										))}
									</select>
								</div>
							</div>
						</div>
					</StickyFilterBar>

					<SectionDivider title="Marketplace results" spacing="default" />

					<MarketplaceSection
						id="marketplace-listing"
						tabIndex={-1}
						spacing="none"
						aria-busy={isRefreshing || undefined}
					>
						{isLoadingFirstPage ? (
							<div data-testid="marketplace-loading-skeleton">
								<CreatorCardGridSkeleton count={PAGE_LIMIT} />
							</div>
						) : error && creators.length === 0 ? (
							<EmptyState
								title="Couldn't load the marketplace"
								description="We couldn't load creator keys right now. Check your connection and try again."
								cta={{ label: 'Try again', onClick: handleRetry }}
								className="mx-auto w-full max-w-xl"
							/>
						) : visibleCreators.length === 0 ? (
							<div className="flex flex-col items-center gap-6 py-12">
								{creators.length === 0 ? (
									<ClearedFiltersEmptyState
										onBrowseAll={handleResetFilters}
										className="w-full max-w-xl"
									/>
								) : (
									<EmptyState
										image="/images/no-results.png"
										title="No creators found"
										description={`No creator keys match your current filters. Try a different name, handle, or supply tier.`}
										onReset={handleResetFilters}
										className="w-full max-w-xl"
									/>
								)}
							</div>
						) : (
							<div className="space-y-4">
								<div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
									{visibleCreators.map(creator => (
										<CreatorCard
											key={creator.id}
											creator={creator}
											isPriceRefreshing={isRefreshing}
										/>
									))}
								</div>

								{isFetchingNextPage && (
									<div data-testid="marketplace-next-page-skeleton" className="mt-6">
										<CreatorCardGridSkeleton count={3} />
									</div>
								)}

								{hasMore && (
									<div
										ref={sentinelRef}
										data-testid="marketplace-sentinel"
										aria-hidden="true"
										className="h-px w-full"
									/>
								)}

								<div
									role="status"
									aria-live="polite"
									className="mt-8 flex flex-col items-center gap-3"
								>
									{hasMore && !isFetchingNextPage ? (
										<Button
											type="button"
											variant="outline"
											onClick={() => void fetchNextPage()}
											className="rounded-full border-white/10 bg-white/5 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-white"
										>
											<ChevronDown className="size-4" aria-hidden="true" />
											Load more creators
										</Button>
									) : (
										!isFetchingNextPage &&
										visibleCreators.length > 0 && (
											<p className="text-center text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
												{`You've reached the end — ${formatNumber(visibleCreators.length)} creator key${visibleCreators.length === 1 ? '' : 's'} on the marketplace.`}
											</p>
										)
									)}
								</div>
							</div>
						)}
					</MarketplaceSection>
				</main>
			</div>
		</div>
	);
}