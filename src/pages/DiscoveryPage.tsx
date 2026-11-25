import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import {
	ArrowRight,
	RefreshCw,
	Flame,
	Sparkles,
	Layers,
	Trophy,
	Search,
} from 'lucide-react';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useNavigationTiming } from '@/hooks/useNavigationTiming';
import { useKeyDiscovery } from '@/hooks/useKeyDiscovery';
import { useDiscoveryAdvancedSearch } from '@/hooks/useDiscoveryAdvancedSearch';
import { useSavedViews } from '@/hooks/useSavedViews';
import AdvancedSearchDrawer from '@/components/common/AdvancedSearchDrawer';
import ActiveDiscoveryFilterChips from '@/components/common/ActiveDiscoveryFilterChips';
import SavedViewsMenu from '@/components/common/SavedViewsMenu';
import {
	clearDiscoveryFilterSearchParams,
	countActiveDiscoveryFilters,
	discoveryFiltersToSearchParams,
	parseDiscoveryFilters,
	type DiscoveryFilters,
} from '@/utils/advancedSearch.utils';
import DiscoveryKeyCard from '@/components/common/DiscoveryKeyCard';
import { DiscoveryCardGridSkeleton } from '@/components/common/DiscoveryKeyCardSkeleton';
import EmptyState from '@/components/common/EmptyState';
import MarketplaceSection from '@/components/common/MarketplaceSection';
import SectionDivider from '@/components/common/SectionDivider';
import SpotlightBanner from '@/components/marketplace/SpotlightBanner';
import CampaignsSection from '@/components/marketplace/CampaignsSection';
import BundleDiscoverySection from '@/components/common/BundleDiscoverySection';
import { Button } from '@/components/ui/button';
import { useBatchTradeStore, selectBatchItemCount } from '@/hooks/useBatchTradeStore';
import { useTranslation } from 'react-i18next';

/**
 * Key Discovery Page (#937).
 *
 * Features:
 * 1. Trending section: Top 5 keys by 24h volume with price and change.
 * 2. New listings section: Latest 10 keys ordered by creation date descending.
 * 3. Each key card displays avatar, name, price, and 24h change.
 * 4. "View all" links leading to the marketplace with pre-applied filters (sort=volume_desc and sort=newest).
 * 5. Automatic background refresh every 60 seconds without full page reload.
 * 6. Spotlight banner for the paid placement above the key grids (#1219).
 * 7. Seasonal campaigns with wallet eligibility below the spotlight (#1226).
 * 8. Advanced search drawer with combinable filters, removable chips, and
 *    URL-persisted state for shareable search links (#1260).
 */
export default function DiscoveryPage() {
	const { t } = useTranslation();
	useNavigationTiming('discovery');
	useDocumentTitle('Discover Creator Keys — AccessLayer');

	const [searchParams, setSearchParams] = useSearchParams();
	const [isAdvancedSearchOpen, setIsAdvancedSearchOpen] = useState(false);

	const filters = useMemo(
		() => parseDiscoveryFilters(searchParams),
		[searchParams]
	);
	const activeFilterCount = countActiveDiscoveryFilters(filters);

	const {
		views: savedViews,
		saveView,
		renameView,
		deleteView,
	} = useSavedViews();
	const [appliedViewId, setAppliedViewId] = useState<string | null>(null);
	const [appliedViewSnapshot, setAppliedViewSnapshot] = useState<string | null>(
		null
	);
	const currentFiltersSnapshot = useMemo(
		() => JSON.stringify(filters),
		[filters]
	);
	const isViewModified =
		appliedViewId !== null && appliedViewSnapshot !== currentFiltersSnapshot;

	const {
		trendingKeys: discoveredTrendingKeys,
		newListings: discoveredNewListings,
		isLoading,
		isRefreshing,
		error,
		refetch,
	} = useKeyDiscovery({ pollIntervalMs: 60_000 });

	const {
		trendingKeys,
		newListings,
		isLoadingReputation,
	} = useDiscoveryAdvancedSearch({
		trendingKeys: discoveredTrendingKeys,
		newListings: discoveredNewListings,
		filters,
	});

	const isFilteringResults = isLoadingReputation;

	const applyFilters = (nextFilters: DiscoveryFilters) => {
		setSearchParams(previous =>
			discoveryFiltersToSearchParams(nextFilters, previous)
		);
	};

	const clearAllFilters = () => {
		setSearchParams(previous => clearDiscoveryFilterSearchParams(previous));
	};

	const applySavedView = (viewId: string) => {
		const view = savedViews.find(candidate => candidate.id === viewId);
		if (!view) return;
		setSearchParams(previous =>
			discoveryFiltersToSearchParams(view.filters, previous)
		);
		setAppliedViewId(view.id);
		setAppliedViewSnapshot(JSON.stringify(view.filters));
	};

	const saveCurrentView = (name: string) => {
		const created = saveView({ name, filters });
		if (created) {
			setAppliedViewId(created.id);
			setAppliedViewSnapshot(currentFiltersSnapshot);
		}
		return created;
	};

	const renameSavedView = (viewId: string, name: string) => {
		renameView(viewId, name);
	};

	const deleteSavedView = (viewId: string) => {
		deleteView(viewId);
		if (appliedViewId === viewId) {
			setAppliedViewId(null);
			setAppliedViewSnapshot(null);
		}
	};

	const removeFilter = (params: readonly string[]) => {
		setSearchParams(previous => {
			const next = new URLSearchParams(previous);
			params.forEach(param => next.delete(param));
			return next;
		});
	};

	const noFilterMatchMessage =
		activeFilterCount > 0
			? 'No keys match your active filters.'
			: undefined;

	const batchItemCount = useBatchTradeStore(selectBatchItemCount);
	const openBatchDrawer = useBatchTradeStore(state => state.openDrawer);

	const hasError = Boolean(
		error &&
			discoveredTrendingKeys.length === 0 &&
			discoveredNewListings.length === 0
	);

	return (
		<div className="relative min-h-screen overflow-x-hidden bg-[linear-gradient(160deg,#08111f_0%,#10213b_45%,#f0b14d_160%)] px-6 pt-12 pb-28 md:px-12 md:pb-16">
			{/* Ambient background glows */}
			<div className="absolute left-[-4rem] top-[10%] size-72 rounded-full bg-amber-300/20 blur-[100px]" />
			<div className="absolute bottom-[8%] right-[-3rem] size-72 rounded-full bg-emerald-300/15 blur-[100px]" />
			<div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,186,73,0.1),transparent_40%),radial-gradient(circle_at_bottom_left,rgba(74,222,128,0.08),transparent_35%)]" />

			<div className="relative z-10 mx-auto max-w-7xl">
				{/* Page Header */}
				<MarketplaceSection as="header" spacing="major" className="text-center">
					<img
						className="mx-auto mb-8 size-10"
						src="/icons/logo.svg"
						alt="Access Layer logo"
					/>
					<p className="mb-3 text-sm font-bold uppercase tracking-[0.25em] text-amber-400/80">
						{t('discovery.eyebrow')}
					</p>
					<h1 className="mb-4 font-grotesque text-[clamp(2.5rem,8vw,4rem)] font-extrabold leading-[1.1] tracking-tight text-white">
						{t('discovery.heading')}
					</h1>
					<p className="mx-auto mb-6 max-w-2xl font-jakarta text-sm leading-relaxed text-white/60">
						{t('discovery.description')}
					</p>

					{/* 60s Live Auto-Refresh Status & Batch Trade Trigger */}
					<div className="flex flex-wrap items-center justify-center gap-3">
						<span
							role="status"
							aria-live="polite"
							aria-busy={isRefreshing || undefined}
							data-testid="discovery-poll-status"
							className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-white/70"
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
							{isRefreshing ? t('discovery.refreshing') : t('discovery.refreshEvery')}
						</span>

						<Button
							variant="outline"
							size="xs"
							onClick={() => setIsAdvancedSearchOpen(true)}
							data-testid="discovery-search-button"
							aria-haspopup="dialog"
							aria-expanded={isAdvancedSearchOpen}
							className="h-7 rounded-full border-white/15 bg-white/5 px-3 text-[0.72rem] font-bold text-white/80 hover:border-amber-400/40 hover:bg-white/10 hover:text-white"
						>
							<Search className="mr-1.5 size-3.5" aria-hidden="true" />
							Search
							{activeFilterCount > 0 && (
								<span
									data-testid="discovery-filter-count"
									className="ml-1.5 rounded-full bg-amber-400 px-1.5 py-0.2 font-mono text-[0.65rem] font-bold text-slate-950"
								>
									{activeFilterCount}
								</span>
							)}
						</Button>

						<SavedViewsMenu
							views={savedViews}
							activeViewId={appliedViewId}
							isModified={isViewModified}
							onApply={applySavedView}
							onSave={saveCurrentView}
							onRename={renameSavedView}
							onDelete={deleteSavedView}
						/>

						<Button
							variant="outline"
							size="xs"
							onClick={openBatchDrawer}
							data-testid="discovery-batch-trade-button"
							className="h-7 rounded-full border-amber-400/30 bg-amber-400/10 px-3 text-[0.72rem] font-bold text-amber-300 hover:bg-amber-400/20 hover:border-amber-400/50"
						>
							<Layers className="mr-1.5 size-3.5" aria-hidden="true" />
							{t('discovery.batchTrade')}
							{batchItemCount > 0 && (
								<span
									className="ml-1.5 rounded-full bg-amber-400 px-1.5 py-0.2 font-mono text-[0.65rem] font-bold text-slate-950"
									data-testid="discovery-batch-count"
								>
									{batchItemCount}
								</span>
							)}
						</Button>

						<Link
							to="/discovery/leaderboard"
							data-testid="discovery-leaderboard-link"
							className="inline-flex h-7 items-center rounded-full border border-amber-400/30 bg-amber-400/10 px-3 text-[0.72rem] font-bold text-amber-300 transition-colors hover:border-amber-400/50 hover:bg-amber-400/20"
						>
							<Trophy className="mr-1.5 size-3.5" aria-hidden="true" />
							{t('discovery.leaderboard')}
						</Link>
					</div>

					{/* Removable chips for the applied advanced search filters */}
					<div className="mt-5">
						<ActiveDiscoveryFilterChips
							filters={filters}
							onRemove={removeFilter}
							onClearAll={clearAllFilters}
						/>
					</div>
				</MarketplaceSection>

				<main id="discovery-main" aria-label={t('discovery.mainLabel')}>
					<SpotlightBanner className="mt-8" />
					<CampaignsSection />
					<div className="mt-8 rounded-3xl border border-white/10 bg-slate-900/40 p-6 backdrop-blur-md">
						<BundleDiscoverySection heading={t('discovery.creatorBundles')} />
					</div>

					{hasError ? (
						<EmptyState
							title={t('discovery.loadErrorTitle')}
							description={t('discovery.loadErrorDescription')}
							cta={{ label: t('discovery.tryAgain'), onClick: () => void refetch() }}
							className="mx-auto my-12 w-full max-w-xl"
						/>
					) : (
						<>
							{/* ================= TRENDING SECTION ================= */}
							<section
								aria-labelledby="trending-section-title"
								data-testid="trending-section"
								className="mt-8 mb-16"
							>
								<div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
									<div>
										<div className="flex items-center gap-2 text-amber-400">
											<Flame className="size-5" aria-hidden="true" />
											<span className="font-mono text-xs font-bold uppercase tracking-wider">
												{t('discovery.topVolume')}
											</span>
										</div>
										<h2
											id="trending-section-title"
											className="mt-1 font-grotesque text-2xl font-bold tracking-tight text-white sm:text-3xl"
										>
											{t('discovery.trendingKeys')}
										</h2>
										<p className="mt-1 font-jakarta text-xs text-white/50">
											{t('discovery.trendingDescription')}
										</p>
									</div>

									<Link
										to="/marketplace?sort=volume_desc"
										data-testid="view-all-trending"
										className="inline-flex items-center gap-1.5 font-jakarta text-xs font-semibold text-amber-400 transition-colors hover:text-amber-300"
									>
										{t('discovery.viewAllTrending')}
										<ArrowRight className="size-3.5" aria-hidden="true" />
									</Link>
								</div>

								{isLoading || isFilteringResults ? (
									<div data-testid="trending-loading-skeleton">
										<DiscoveryCardGridSkeleton count={5} />
									</div>
								) : trendingKeys.length === 0 ? (
									<div className="rounded-2xl border border-white/10 bg-slate-900/40 p-8 text-center backdrop-blur-md">
										<p className="font-jakarta text-sm text-white/50">
											{noFilterMatchMessage ?? 'No trending keys found right now.'}
										</p>
										{noFilterMatchMessage && (
											<Button
												type="button"
												variant="outline"
												size="sm"
												onClick={clearAllFilters}
												data-testid="trending-clear-filters"
												className="mt-4 rounded-xl border-white/10 bg-white/5 font-bold text-white hover:border-amber-500/30 hover:bg-amber-500/10"
											>
												Clear All
											</Button>
										)}
									</div>
								) : (
									<div
										data-testid="trending-keys-grid"
										className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
									>
										{trendingKeys.map((creator, index) => (
											<DiscoveryKeyCard
												key={creator.id}
												creator={creator}
												rank={index + 1}
											/>
										))}
									</div>
								)}
							</section>

							<SectionDivider title={t('discovery.newOn')} spacing="relaxed" />

							{/* ================= NEW LISTINGS SECTION ================= */}
							<section
								aria-labelledby="new-listings-section-title"
								data-testid="new-listings-section"
								className="mt-8 mb-16"
							>
								<div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
									<div>
										<div className="flex items-center gap-2 text-emerald-400">
											<Sparkles className="size-5" aria-hidden="true" />
											<span className="font-mono text-xs font-bold uppercase tracking-wider">
												{t('discovery.freshArrivals')}
											</span>
										</div>
										<h2
											id="new-listings-section-title"
											className="mt-1 font-grotesque text-2xl font-bold tracking-tight text-white sm:text-3xl"
										>
											{t('discovery.newListings')}
										</h2>
										<p className="mt-1 font-jakarta text-xs text-white/50">
											{t('discovery.newListingsDescription')}
										</p>
									</div>

									<Link
										to="/marketplace?sort=newest"
										data-testid="view-all-newest"
										className="inline-flex items-center gap-1.5 font-jakarta text-xs font-semibold text-emerald-400 transition-colors hover:text-emerald-300"
									>
										{t('discovery.viewAllNew')}
										<ArrowRight className="size-3.5" aria-hidden="true" />
									</Link>
								</div>

								{isLoading || isFilteringResults ? (
									<div data-testid="new-listings-loading-skeleton">
										<DiscoveryCardGridSkeleton count={10} />
									</div>
								) : newListings.length === 0 ? (
									<div className="rounded-2xl border border-white/10 bg-slate-900/40 p-8 text-center backdrop-blur-md">
										<p className="font-jakarta text-sm text-white/50">
											{noFilterMatchMessage ??
												'No new listings available right now.'}
										</p>
										{noFilterMatchMessage && (
											<Button
												type="button"
												variant="outline"
												size="sm"
												onClick={clearAllFilters}
												data-testid="new-listings-clear-filters"
												className="mt-4 rounded-xl border-white/10 bg-white/5 font-bold text-white hover:border-amber-500/30 hover:bg-amber-500/10"
											>
												Clear All
											</Button>
										)}
									</div>
								) : (
									<div
										data-testid="new-listings-grid"
										className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
									>
										{newListings.map(creator => (
											<DiscoveryKeyCard
												key={creator.id}
												creator={creator}
												badgeLabel="NEW"
											/>
										))}
									</div>
								)}
							</section>
						</>
					)}
				</main>
			</div>

			<AdvancedSearchDrawer
				open={isAdvancedSearchOpen}
				onOpenChange={setIsAdvancedSearchOpen}
				filters={filters}
				onApply={applyFilters}
				onClearAll={clearAllFilters}
			/>
		</div>
	);
}
