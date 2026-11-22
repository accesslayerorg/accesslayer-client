import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useAccount } from 'wagmi';
import {
	BarChart3,
	Users,
	Award,
	Search,
	X,
	ArrowLeft,
	RefreshCw,
	Sparkles,
	Trophy,
	UserCheck,
} from 'lucide-react';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useNavigationTiming } from '@/hooks/useNavigationTiming';
import { useKeyDiscoveryLeaderboard } from '@/hooks/useKeyDiscoveryLeaderboard';
import type { LeaderboardMetric } from '@/services/analytics.service';
import CreatorInitialsAvatar from '@/components/common/CreatorInitialsAvatar';
import Change24hBadge from '@/components/common/Change24hBadge';
import EmptyState from '@/components/common/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
	formatHolderCount,
	formatNumber,
	formatXlmPrice,
} from '@/utils/numberFormat.utils';
import { cn } from '@/lib/utils';

const METRIC_TABS: Array<{
	id: LeaderboardMetric;
	label: string;
	description: string;
	icon: typeof BarChart3;
}> = [
	{
		id: 'volume',
		label: 'Volume',
		description: 'Ranked by 24-hour trading volume in XLM',
		icon: BarChart3,
	},
	{
		id: 'holders',
		label: 'Holders',
		description: 'Ranked by total unique creator key holders',
		icon: Users,
	},
	{
		id: 'reputation',
		label: 'Reputation Score',
		description: 'Ranked by community trust & reliability score',
		icon: Award,
	},
];

function isValidMetric(metric: string | null): metric is LeaderboardMetric {
	return metric === 'volume' || metric === 'holders' || metric === 'reputation';
}

function truncateAddress(address: string): string {
	if (!address) return '';
	if (address.length <= 12) return address;
	return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatMetricValue(
	value: number,
	metric: LeaderboardMetric
): string {
	switch (metric) {
		case 'volume':
			return formatXlmPrice(value);
		case 'holders':
			return `${formatHolderCount(value)} holders`;
		case 'reputation':
			return `${formatNumber(value, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} / 100`;
		default:
			return formatNumber(value);
	}
}

function RankBadge({ rank }: { rank: number }) {
	if (rank === 1) {
		return (
			<span
				data-testid={`rank-badge-${rank}`}
				className="inline-flex size-7 items-center justify-center rounded-full border border-amber-400/50 bg-amber-400/20 text-xs font-black text-amber-300 shadow-sm shadow-amber-500/20"
				title="Rank 1"
			>
				<Trophy className="size-3.5" aria-hidden="true" />
				<span className="sr-only">Rank 1</span>
			</span>
		);
	}
	if (rank === 2) {
		return (
			<span
				data-testid={`rank-badge-${rank}`}
				className="inline-flex size-7 items-center justify-center rounded-full border border-slate-300/40 bg-slate-300/20 text-xs font-black text-slate-200"
				title="Rank 2"
			>
				2
			</span>
		);
	}
	if (rank === 3) {
		return (
			<span
				data-testid={`rank-badge-${rank}`}
				className="inline-flex size-7 items-center justify-center rounded-full border border-amber-600/40 bg-amber-700/20 text-xs font-black text-amber-400"
				title="Rank 3"
			>
				3
			</span>
		);
	}
	return (
		<span
			data-testid={`rank-badge-${rank}`}
			className="inline-flex size-7 items-center justify-center font-mono text-xs font-semibold tabular-nums text-white/50"
		>
			{rank}
		</span>
	);
}

function LeaderboardSkeletonRow() {
	return (
		<div className="flex items-center gap-4 border-b border-white/5 px-5 py-4 last:border-b-0">
			<div className="size-7 shrink-0 rounded-full bg-white/10 skeleton-shimmer" />
			<div className="flex min-w-0 flex-1 items-center gap-3">
				<div className="size-10 shrink-0 rounded-full bg-white/10 skeleton-shimmer" />
				<div className="space-y-2">
					<div className="h-4 w-32 rounded bg-white/10 skeleton-shimmer" />
					<div className="h-3 w-20 rounded bg-white/5 skeleton-shimmer" />
				</div>
			</div>
			<div className="hidden w-36 shrink-0 sm:block">
				<div className="h-4 w-24 rounded bg-white/10 skeleton-shimmer" />
			</div>
			<div className="w-28 shrink-0 text-right">
				<div className="ml-auto h-4 w-20 rounded bg-white/10 skeleton-shimmer" />
			</div>
			<div className="w-24 shrink-0 text-right">
				<div className="ml-auto h-5 w-16 rounded-full bg-white/10 skeleton-shimmer" />
			</div>
		</div>
	);
}

/**
 * Key Discovery Leaderboard Page (#1206).
 *
 * Scope:
 * - Metric tabs: Volume, Holders, Reputation Score
 * - Top 50 keys ranked with position, key name, creator, metric value, and 24h change
 * - Connected wallet's created keys highlighted in list if present
 * - Search bar to find specific key in leaderboard
 * - Data fetched from GET /analytics/keys/leaderboard?metric=X API
 */
export default function KeyDiscoveryLeaderboardPage() {
	useNavigationTiming('key-discovery-leaderboard');
	useDocumentTitle('Key Discovery Leaderboard — AccessLayer');

	const [searchParams, setSearchParams] = useSearchParams();
	const requestedMetric = searchParams.get('metric');
	const activeMetric: LeaderboardMetric = isValidMetric(requestedMetric)
		? requestedMetric
		: 'volume';

	const [searchQuery, setSearchQuery] = useState('');
	const { address: connectedAddress } = useAccount();

	const {
		data: keys = [],
		isLoading,
		isFetching,
		error,
		refetch,
	} = useKeyDiscoveryLeaderboard(activeMetric);

	const handleMetricChange = (metric: LeaderboardMetric) => {
		setSearchParams(
			prev => {
				const next = new URLSearchParams(prev);
				next.set('metric', metric);
				return next;
			},
			{ replace: true }
		);
	};

	// Filter top 50 results based on search query
	const filteredKeys = useMemo(() => {
		const normalizedQuery = searchQuery.trim().toLowerCase();
		if (!normalizedQuery) {
			return keys;
		}
		return keys.filter(item => {
			const nameMatch = item.name.toLowerCase().includes(normalizedQuery);
			const symbolMatch = item.symbol?.toLowerCase().includes(normalizedQuery);
			const creatorNameMatch = item.creator.name
				?.toLowerCase()
				.includes(normalizedQuery);
			const creatorAddressMatch = item.creator.address
				.toLowerCase()
				.includes(normalizedQuery);
			return nameMatch || symbolMatch || creatorNameMatch || creatorAddressMatch;
		});
	}, [keys, searchQuery]);

	const activeTabMeta =
		METRIC_TABS.find(tab => tab.id === activeMetric) ?? METRIC_TABS[0];
	const hasError = Boolean(error && keys.length === 0);

	return (
		<div className="relative min-h-screen overflow-x-hidden bg-[linear-gradient(160deg,#08111f_0%,#10213b_45%,#f0b14d_160%)] px-4 pt-12 pb-28 sm:px-6 md:px-12 md:pb-16">
			{/* Ambient glows */}
			<div className="pointer-events-none absolute left-[-4rem] top-[8%] size-80 rounded-full bg-amber-400/15 blur-[120px]" />
			<div className="pointer-events-none absolute bottom-[12%] right-[-4rem] size-80 rounded-full bg-emerald-400/10 blur-[120px]" />
			<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,186,73,0.08),transparent_40%)]" />

			<div className="relative z-10 mx-auto max-w-6xl">
				{/* Top Navigation */}
				<div className="mb-6 flex items-center justify-between">
					<Link
						to="/discovery"
						className="inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-white/60 transition-colors hover:text-white"
					>
						<ArrowLeft className="size-3.5" aria-hidden="true" />
						Back to Discovery
					</Link>

					<span
						role="status"
						aria-live="polite"
						aria-busy={isFetching || undefined}
						data-testid="leaderboard-refresh-status"
						className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-slate-900/40 px-3.5 py-1 text-[0.68rem] font-bold uppercase tracking-wider text-white/70 backdrop-blur-md"
					>
						{isFetching && !isLoading ? (
							<RefreshCw
								className="size-3 animate-spin text-amber-400 motion-reduce:animate-none"
								aria-hidden="true"
							/>
						) : (
							<span
								className="size-1.5 animate-pulse rounded-full bg-emerald-400"
								aria-hidden="true"
							/>
						)}
						{isFetching && !isLoading ? 'Refreshing…' : 'Live analytics'}
					</span>
				</div>

				{/* Page Header */}
				<header className="mb-8 text-center sm:text-left">
					<div className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-300">
						<Sparkles className="size-3.5" aria-hidden="true" />
						Platform Discovery
					</div>
					<h1 className="mt-3 font-grotesque text-3xl font-extrabold tracking-tight text-white sm:text-4xl md:text-5xl">
						Top Performing Creator Keys
					</h1>
					<p className="mt-2 max-w-2xl font-jakarta text-sm leading-relaxed text-white/60">
						Explore the top 50 ranked creator keys across the platform. Switch between
						trading volume, holder distribution, and reputation score to discover high-momentum opportunities.
					</p>
				</header>

				{/* Controls Bar: Metric Tabs & Search */}
				<div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
					{/* Metric Tabs */}
					<div
						role="tablist"
						aria-label="Leaderboard metrics"
						className="inline-flex rounded-xl border border-white/10 bg-slate-900/60 p-1 backdrop-blur-md"
					>
						{METRIC_TABS.map(tab => {
							const Icon = tab.icon;
							const isSelected = activeMetric === tab.id;
							return (
								<button
									key={tab.id}
									type="button"
									role="tab"
									id={`metric-tab-${tab.id}`}
									aria-selected={isSelected}
									aria-controls="leaderboard-panel"
									data-testid={`tab-${tab.id}`}
									onClick={() => handleMetricChange(tab.id)}
									className={cn(
										'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold tracking-wide transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400',
										isSelected
											? 'bg-amber-400 text-slate-950 shadow-md font-extrabold'
											: 'text-white/60 hover:bg-white/5 hover:text-white'
									)}
								>
									<Icon className="size-3.5" aria-hidden="true" />
									<span>{tab.label}</span>
								</button>
							);
						})}
					</div>

					{/* Search input */}
					<div className="relative w-full sm:w-80">
						<Search
							className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/40"
							aria-hidden="true"
						/>
						<Input
							type="text"
							value={searchQuery}
							onChange={e => setSearchQuery(e.target.value)}
							placeholder="Search by key or creator..."
							data-testid="leaderboard-search-input"
							aria-label="Search keys in leaderboard"
							className="h-10 rounded-xl border-white/10 bg-slate-900/60 pl-9 pr-9 text-xs text-white placeholder:text-white/40 backdrop-blur-md focus:border-amber-400/50 focus:ring-amber-400/20"
						/>
						{searchQuery && (
							<button
								type="button"
								onClick={() => setSearchQuery('')}
								data-testid="clear-search-button"
								aria-label="Clear search"
								className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-white/40 transition-colors hover:text-white"
							>
								<X className="size-3.5" aria-hidden="true" />
							</button>
						)}
					</div>
				</div>

				{/* Active Metric Subtitle & Count */}
				<div className="mb-4 flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-white/50 font-jakarta">
					<span>{activeTabMeta.description}</span>
					<span>
						{searchQuery
							? `Showing ${filteredKeys.length} of ${keys.length} keys`
							: `Top ${keys.length} keys`}
					</span>
				</div>

				{/* Main Content Card */}
				<div
					id="leaderboard-panel"
					role="tabpanel"
					aria-labelledby={`metric-tab-${activeMetric}`}
					className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-md shadow-2xl"
				>
					{hasError ? (
						<EmptyState
							title="Couldn't load discovery leaderboard"
							description="We couldn't retrieve the latest key ranking metrics. Please check your connection and try again."
							cta={{ label: 'Try again', onClick: () => void refetch() }}
							className="p-12 text-center"
						/>
					) : (
						<>
							{/* Table Header */}
							<div
								aria-hidden="true"
								className="flex items-center gap-4 border-b border-white/10 bg-white/[0.02] px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-white/40"
							>
								<span className="w-7 shrink-0 text-center">#</span>
								<span className="min-w-0 flex-1">Creator Key</span>
								<span className="hidden w-36 shrink-0 sm:block">Creator</span>
								<span className="w-28 shrink-0 text-right">{activeTabMeta.label}</span>
								<span className="w-24 shrink-0 text-right">24h Change</span>
							</div>

							{/* Loading State */}
							{isLoading ? (
								<div data-testid="leaderboard-loading-skeleton">
									{Array.from({ length: 10 }).map((_, index) => (
										<LeaderboardSkeletonRow key={index} />
									))}
								</div>
							) : filteredKeys.length === 0 ? (
								/* Empty Search State */
								<div
									data-testid="leaderboard-empty-search"
									className="flex flex-col items-center justify-center p-12 text-center"
								>
									<div className="mb-3 rounded-full border border-white/10 bg-white/5 p-3 text-white/40">
										<Search className="size-6" aria-hidden="true" />
									</div>
									<h2 className="font-grotesque text-lg font-bold text-white">
										No creator keys found
									</h2>
									<p className="mt-1 max-w-sm text-xs text-white/50">
										{searchQuery
											? `No keys or creators matched "${searchQuery}". Try a different keyword.`
											: 'No leaderboard entries are currently available for this metric.'}
									</p>
									{searchQuery && (
										<Button
											variant="outline"
											size="sm"
											onClick={() => setSearchQuery('')}
											className="mt-4 rounded-xl border-white/15 bg-white/5 text-xs text-white hover:bg-white/10"
										>
											Clear search
										</Button>
									)}
								</div>
							) : (
								/* Key Rows */
								<div
									data-testid="leaderboard-rows-container"
									className="divide-y divide-white/5"
								>
									{filteredKeys.map(entry => {
										const isOwnKey = Boolean(
											connectedAddress &&
												entry.creator.address &&
												connectedAddress.toLowerCase() ===
													entry.creator.address.toLowerCase()
										);

										const creatorDisplayName =
											entry.creator.name || truncateAddress(entry.creator.address);

										return (
											<div
												key={entry.id}
												data-testid={`leaderboard-row-${entry.rank}`}
												className={cn(
													'group flex items-center gap-4 px-5 py-3.5 transition-colors duration-150',
													isOwnKey
														? 'bg-amber-400/10 border-l-4 border-l-amber-400 hover:bg-amber-400/15'
														: 'hover:bg-white/[0.04]'
												)}
											>
												{/* Rank Column */}
												<div className="flex w-7 shrink-0 items-center justify-center">
													<RankBadge rank={entry.rank} />
												</div>

												{/* Key Name & Avatar Column */}
												<div className="flex min-w-0 flex-1 items-center gap-3">
													<div className="size-10 shrink-0 overflow-hidden rounded-full border border-white/15 bg-slate-800 shadow-sm">
														<CreatorInitialsAvatar
															name={entry.name}
															creatorId={entry.id}
															imageSrc={entry.thumbnail}
															className="size-full text-xs font-bold"
														/>
													</div>
													<div className="min-w-0 flex-1">
														<div className="flex items-center gap-2">
															<Link
																to={`/creator/${entry.id}`}
																className="truncate font-jakarta text-sm font-bold text-white transition-colors hover:text-amber-400"
															>
																{entry.name}
															</Link>
															{entry.symbol && (
																<span className="hidden font-mono text-[10px] font-semibold uppercase text-white/40 sm:inline">
																	${entry.symbol}
																</span>
															)}
															{isOwnKey && (
																<span
																	data-testid="own-key-badge"
																	className="inline-flex items-center gap-1 rounded-full border border-amber-400/40 bg-amber-400/20 px-2 py-0.5 text-[0.62rem] font-extrabold uppercase tracking-wide text-amber-300"
																>
																	<UserCheck className="size-2.5" aria-hidden="true" />
																	Your Key
																</span>
															)}
														</div>
														<div className="mt-0.5 flex items-center gap-2 text-xs text-white/50 sm:hidden">
															<span>{creatorDisplayName}</span>
														</div>
													</div>
												</div>

												{/* Creator Column (Desktop) */}
												<div className="hidden w-36 shrink-0 sm:block">
													<Link
														to={`/creator/${entry.creator.address}/profile`}
														className="truncate font-jakarta text-xs text-white/70 transition-colors hover:text-white"
														title={entry.creator.address}
													>
														{creatorDisplayName}
													</Link>
												</div>

												{/* Metric Value Column */}
												<div className="w-28 shrink-0 text-right font-mono text-xs font-semibold tabular-nums text-white">
													<span data-testid={`metric-value-${entry.rank}`}>
														{formatMetricValue(entry.metricValue, activeMetric)}
													</span>
												</div>

												{/* 24h Change Column */}
												<div className="flex w-24 shrink-0 items-center justify-end">
													<Change24hBadge
														change={entry.change24h}
														className="text-xs"
													/>
												</div>
											</div>
										);
									})}
								</div>
							)}
						</>
					)}
				</div>
			</div>
		</div>
	);
}
