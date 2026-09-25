import {
	Activity,
	Coins,
	KeyRound,
	RefreshCw,
	Users,
	AlertCircle,
} from 'lucide-react';
import { useProtocolStats } from '@/hooks/useProtocolStats';
import Change24hBadge from '@/components/common/Change24hBadge';
import Skeleton from '@/components/ui/skeleton';
import { formatCompactNumber, formatNumber } from '@/utils/numberFormat.utils';
import { Button } from '@/components/ui/button';

export default function MarketOverview() {
	const { data, isLoading, isError, error, refetch } = useProtocolStats();

	return (
		<section
			aria-labelledby="market-overview-heading"
			className="relative w-full border-y border-white/10 bg-[#060c14] py-12 px-6"
		>
			<div className="mx-auto max-w-5xl">
				{/* Section Header */}
				<div className="mb-8 flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-end">
					<div>
						<div className="flex items-center gap-2">
							<span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
							<span className="font-mono text-xs uppercase tracking-widest text-white/50">
								Protocol Metrics
							</span>
						</div>
						<h2
							id="market-overview-heading"
							className="mt-2 font-pt-serif text-2xl font-normal text-white md:text-3xl"
						>
							Market Overview
						</h2>
					</div>
					<p className="font-jakarta text-xs text-white/40 max-w-xs sm:text-right">
						Live protocol stats updated automatically every 5 minutes.
					</p>
				</div>

				{/* Content Grid */}
				{isLoading ? (
					<div
						data-testid="market-overview-skeletons"
						className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
					>
						{Array.from({ length: 4 }).map((_, i) => (
							<div
								key={i}
								className="flex h-[130px] flex-col justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-md"
							>
								<div className="flex items-center justify-between">
									<Skeleton className="h-4 w-24 bg-white/10" />
									<Skeleton className="size-8 rounded-full bg-white/10" />
								</div>
								<Skeleton className="h-8 w-32 bg-white/10" />
								<Skeleton className="h-4 w-16 bg-white/10" />
							</div>
						))}
					</div>
				) : isError ? (
					<div
						role="alert"
						data-testid="market-overview-error"
						className="flex w-full flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-red-500/30 bg-red-500/5 p-8 text-center"
					>
						<AlertCircle className="size-8 text-red-400" />
						<div>
							<h3 className="font-semibold text-white">
								Unable to load market overview
							</h3>
							<p className="mt-1 text-xs text-white/60">
								{error?.message ||
									'Failed to fetch protocol statistics.'}
							</p>
						</div>
						<Button
							variant="outline"
							size="sm"
							onClick={() => refetch()}
							className="mt-2 gap-2 border-white/20 bg-white/5 text-white hover:bg-white/10"
						>
							<RefreshCw className="size-3.5" />
							Try Again
						</Button>
					</div>
				) : data ? (
					<div
						data-testid="market-overview-grid"
						className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
					>
						{/* Stat 1: Total Volume */}
						<div
							data-testid="stat-card-total-volume"
							className="group flex h-[130px] flex-col justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-md transition-all hover:border-white/20 hover:bg-white/[0.05]"
						>
							<div className="flex items-center justify-between">
								<span className="font-jakarta text-xs font-medium text-white/50">
									Total Volume
								</span>
								<div className="flex size-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-emerald-400">
									<Coins className="size-4" />
								</div>
							</div>
							<div className="flex items-baseline justify-between gap-2">
								<span className="font-mono text-2xl font-bold tracking-tight text-white">
									{formatCompactNumber(data.totalVolume)} XLM
								</span>
								{data.volumeChange24h !== undefined && (
									<Change24hBadge change={data.volumeChange24h} />
								)}
							</div>
						</div>

						{/* Stat 2: Active Keys */}
						<div
							data-testid="stat-card-active-keys"
							className="group flex h-[130px] flex-col justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-md transition-all hover:border-white/20 hover:bg-white/[0.05]"
						>
							<div className="flex items-center justify-between">
								<span className="font-jakarta text-xs font-medium text-white/50">
									Active Keys
								</span>
								<div className="flex size-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-amber-400">
									<KeyRound className="size-4" />
								</div>
							</div>
							<span className="font-mono text-2xl font-bold tracking-tight text-white">
								{formatNumber(data.activeKeys)}
							</span>
						</div>

						{/* Stat 3: Total Holders */}
						<div
							data-testid="stat-card-total-holders"
							className="group flex h-[130px] flex-col justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-md transition-all hover:border-white/20 hover:bg-white/[0.05]"
						>
							<div className="flex items-center justify-between">
								<span className="font-jakarta text-xs font-medium text-white/50">
									Total Holders
								</span>
								<div className="flex size-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-indigo-400">
									<Users className="size-4" />
								</div>
							</div>
							<span className="font-mono text-2xl font-bold tracking-tight text-white">
								{formatNumber(data.totalHolders)}
							</span>
						</div>

						{/* Stat 4: 24h Trades */}
						<div
							data-testid="stat-card-24h-trades"
							className="group flex h-[130px] flex-col justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-md transition-all hover:border-white/20 hover:bg-white/[0.05]"
						>
							<div className="flex items-center justify-between">
								<span className="font-jakarta text-xs font-medium text-white/50">
									24h Trades
								</span>
								<div className="flex size-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-sky-400">
									<Activity className="size-4" />
								</div>
							</div>
							<div className="flex items-baseline justify-between gap-2">
								<span className="font-mono text-2xl font-bold tracking-tight text-white">
									{formatNumber(data.trades24h)}
								</span>
								{data.tradesChange24h !== undefined && (
									<Change24hBadge change={data.tradesChange24h} />
								)}
							</div>
						</div>
					</div>
				) : null}
			</div>
		</section>
	);
}
