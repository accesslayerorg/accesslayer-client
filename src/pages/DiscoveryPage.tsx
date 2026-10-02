import { Link } from 'react-router';
import { ArrowRight, RefreshCw, Flame, Sparkles } from 'lucide-react';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useNavigationTiming } from '@/hooks/useNavigationTiming';
import { useKeyDiscovery } from '@/hooks/useKeyDiscovery';
import DiscoveryKeyCard from '@/components/common/DiscoveryKeyCard';
import { DiscoveryCardGridSkeleton } from '@/components/common/DiscoveryKeyCardSkeleton';
import EmptyState from '@/components/common/EmptyState';
import MarketplaceSection from '@/components/common/MarketplaceSection';
import SectionDivider from '@/components/common/SectionDivider';

/**
 * Key Discovery Page (#937).
 *
 * Features:
 * 1. Trending section: Top 5 keys by 24h volume with price and change.
 * 2. New listings section: Latest 10 keys ordered by creation date descending.
 * 3. Each key card displays avatar, name, price, and 24h change.
 * 4. "View all" links leading to the marketplace with pre-applied filters (sort=volume_desc and sort=newest).
 * 5. Automatic background refresh every 60 seconds without full page reload.
 */
export default function DiscoveryPage() {
	useNavigationTiming('discovery');
	useDocumentTitle('Discover Creator Keys — AccessLayer');

	const {
		trendingKeys,
		newListings,
		isLoading,
		isRefreshing,
		error,
		refetch,
	} = useKeyDiscovery({ pollIntervalMs: 60_000 });

	const hasError = Boolean(error && trendingKeys.length === 0 && newListings.length === 0);

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
						Key Discovery
					</p>
					<h1 className="mb-4 font-grotesque text-[clamp(2.5rem,8vw,4rem)] font-extrabold leading-[1.1] tracking-tight text-white">
						Find active opportunities
					</h1>
					<p className="mx-auto mb-6 max-w-2xl font-jakarta text-sm leading-relaxed text-white/60">
						Explore top creator keys trending by 24-hour trading volume and the freshest
						listings on Access Layer, updated live every 60 seconds without page reloads.
					</p>

					{/* 60s Live Auto-Refresh Status */}
					<div className="flex justify-center">
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
							{isRefreshing ? 'Refreshing live data…' : 'Data refreshes every 60s'}
						</span>
					</div>
				</MarketplaceSection>

				<main id="discovery-main" aria-label="Creator key discovery">
					{hasError ? (
						<EmptyState
							title="Couldn't load discovery opportunities"
							description="We couldn't load trending or new creator keys right now. Check your connection and try again."
							cta={{ label: 'Try again', onClick: () => void refetch() }}
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
												Top by 24h Volume
											</span>
										</div>
										<h2
											id="trending-section-title"
											className="mt-1 font-grotesque text-2xl font-bold tracking-tight text-white sm:text-3xl"
										>
											Trending Keys
										</h2>
										<p className="mt-1 font-jakarta text-xs text-white/50">
											Top 5 keys by 24h trading volume
										</p>
									</div>

									<Link
										to="/marketplace?sort=volume_desc"
										data-testid="view-all-trending"
										className="inline-flex items-center gap-1.5 font-jakarta text-xs font-semibold text-amber-400 transition-colors hover:text-amber-300"
									>
										View all trending keys
										<ArrowRight className="size-3.5" aria-hidden="true" />
									</Link>
								</div>

								{isLoading ? (
									<div data-testid="trending-loading-skeleton">
										<DiscoveryCardGridSkeleton count={5} />
									</div>
								) : trendingKeys.length === 0 ? (
									<div className="rounded-2xl border border-white/10 bg-slate-900/40 p-8 text-center backdrop-blur-md">
										<p className="font-jakarta text-sm text-white/50">
											No trending keys found right now.
										</p>
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

							<SectionDivider title="New on Access Layer" spacing="relaxed" />

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
												Fresh Arrivals
											</span>
										</div>
										<h2
											id="new-listings-section-title"
											className="mt-1 font-grotesque text-2xl font-bold tracking-tight text-white sm:text-3xl"
										>
											New Listings
										</h2>
										<p className="mt-1 font-jakarta text-xs text-white/50">
											Latest 10 keys ordered by creation date
										</p>
									</div>

									<Link
										to="/marketplace?sort=newest"
										data-testid="view-all-newest"
										className="inline-flex items-center gap-1.5 font-jakarta text-xs font-semibold text-emerald-400 transition-colors hover:text-emerald-300"
									>
										View all new listings
										<ArrowRight className="size-3.5" aria-hidden="true" />
									</Link>
								</div>

								{isLoading ? (
									<div data-testid="new-listings-loading-skeleton">
										<DiscoveryCardGridSkeleton count={10} />
									</div>
								) : newListings.length === 0 ? (
									<div className="rounded-2xl border border-white/10 bg-slate-900/40 p-8 text-center backdrop-blur-md">
										<p className="font-jakarta text-sm text-white/50">
											No new listings available right now.
										</p>
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
		</div>
	);
}
