import React, { useEffect } from 'react';
import { useKeyAnalyticsStore } from '@/hooks/useKeyAnalyticsStore';
import { Tooltip } from '@/components/ui/tooltip';
import { formatNumber, formatCompactNumber } from '@/utils/numberFormat.utils';
import { cn } from '@/lib/utils';
import { Users, ArrowLeftRight, TrendingUp, RefreshCw, Info } from 'lucide-react';
import Skeleton from '@/components/ui/skeleton';

export interface KeyAnalyticsPanelProps {
	creatorId?: string;
	className?: string;
}

export const KeyAnalyticsPanel: React.FC<KeyAnalyticsPanelProps> = ({
	creatorId,
	className,
}) => {
	const {
		data,
		currency,
		isLoading,
		isRefreshing,
		setCurrency,
		startPolling,
		stopPolling,
	} = useKeyAnalyticsStore();

	useEffect(() => {
		startPolling(creatorId);
		return () => {
			stopPolling();
		};
	}, [creatorId, startPolling, stopPolling]);

	const volumeDisplay = () => {
		if (!data) return '—';
		if (currency === 'XLM') {
			return `${formatCompactNumber(data.cumulativeVolumeXlm)} XLM`;
		}
		return `$${formatNumber(Math.round(data.cumulativeVolumeUsd))} USD`;
	};

	const volumeFullDisplay = () => {
		if (!data) return '';
		if (currency === 'XLM') {
			return `${formatNumber(data.cumulativeVolumeXlm)} XLM`;
		}
		return `$${formatNumber(data.cumulativeVolumeUsd, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`;
	};

	return (
		<div
			className={cn(
				'relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-md transition-all duration-300',
				className
			)}
			data-testid="key-analytics-panel"
		>
			{/* Header with Title and Currency Toggle */}
			<div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/10">
				<div className="flex items-center gap-2.5">
					<div className="flex size-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
						<TrendingUp className="size-4" />
					</div>
					<div>
						<h3 className="font-grotesque text-base font-bold tracking-tight text-white">
							Key Analytics
						</h3>
						<p className="text-xs text-white/40">
							On-chain accumulator stats (updates every 60s)
						</p>
					</div>
					{isRefreshing && (
						<RefreshCw
							className="size-3 animate-spin text-white/30 ml-1"
							aria-label="Updating stats..."
						/>
					)}
				</div>

				{/* Currency Toggle (#966) */}
				<div
					role="group"
					aria-label="Volume currency toggle"
					className="inline-flex items-center rounded-xl border border-white/10 bg-white/[0.04] p-1"
				>
					<button
						type="button"
						onClick={() => setCurrency('XLM')}
						className={cn(
							'rounded-lg px-2.5 py-1 text-xs font-semibold transition-all',
							currency === 'XLM'
								? 'bg-amber-500 text-slate-950 shadow-sm'
								: 'text-white/60 hover:text-white'
						)}
						aria-pressed={currency === 'XLM'}
						data-testid="currency-toggle-xlm"
					>
						XLM
					</button>
					<button
						type="button"
						onClick={() => setCurrency('USD')}
						className={cn(
							'rounded-lg px-2.5 py-1 text-xs font-semibold transition-all',
							currency === 'USD'
								? 'bg-amber-500 text-slate-950 shadow-sm'
								: 'text-white/60 hover:text-white'
						)}
						aria-pressed={currency === 'USD'}
						data-testid="currency-toggle-usd"
					>
						USD
					</button>
				</div>
			</div>

			{/* Stats Grid - Fixed min-height to prevent layout shift (#966) */}
			<div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
				{/* Stat 1: Unique Traders */}
				<div
					className="relative overflow-hidden rounded-xl border border-white/5 bg-white/[0.02] p-4 transition-colors hover:border-white/10 hover:bg-white/[0.04]"
					data-testid="stat-unique-traders"
				>
					<div className="flex items-center justify-between text-xs text-white/45">
						<span className="font-semibold uppercase tracking-wider text-[0.65rem]">
							Unique Traders
						</span>
						<Tooltip content="Total distinct wallet addresses that have bought or sold this creator's keys.">
							<button
								type="button"
								className="text-white/30 hover:text-white/60 focus:outline-hidden"
								aria-label="Explain unique traders stat"
							>
								<Info className="size-3.5" />
							</button>
						</Tooltip>
					</div>

					<div className="mt-2 flex items-baseline gap-2">
						{isLoading && !data ? (
							<Skeleton className="h-7 w-20" />
						) : (
							<span className="font-jakarta text-2xl font-bold tracking-tight text-white">
								{data ? formatNumber(data.uniqueTraderCount) : '—'}
							</span>
						)}
					</div>
					<div className="mt-1 flex items-center gap-1.5 text-[11px] text-white/40">
						<Users className="size-3 text-emerald-400" />
						<span>Active market participants</span>
					</div>
				</div>

				{/* Stat 2: Total Trades */}
				<div
					className="relative overflow-hidden rounded-xl border border-white/5 bg-white/[0.02] p-4 transition-colors hover:border-white/10 hover:bg-white/[0.04]"
					data-testid="stat-total-trades"
				>
					<div className="flex items-center justify-between text-xs text-white/45">
						<span className="font-semibold uppercase tracking-wider text-[0.65rem]">
							Total Trades
						</span>
						<Tooltip content="Cumulative number of key transactions (buys + sells) executed on-chain.">
							<button
								type="button"
								className="text-white/30 hover:text-white/60 focus:outline-hidden"
								aria-label="Explain total trades stat"
							>
								<Info className="size-3.5" />
							</button>
						</Tooltip>
					</div>

					<div className="mt-2 flex items-baseline gap-2">
						{isLoading && !data ? (
							<Skeleton className="h-7 w-20" />
						) : (
							<span className="font-jakarta text-2xl font-bold tracking-tight text-white">
								{data ? formatNumber(data.totalTradeCount) : '—'}
							</span>
						)}
					</div>
					<div className="mt-1 flex items-center gap-1.5 text-[11px] text-white/40">
						<ArrowLeftRight className="size-3 text-cyan-400" />
						<span>Buys and sells settled</span>
					</div>
				</div>

				{/* Stat 3: Cumulative Volume */}
				<div
					className="relative overflow-hidden rounded-xl border border-white/5 bg-white/[0.02] p-4 transition-colors hover:border-white/10 hover:bg-white/[0.04]"
					data-testid="stat-cumulative-volume"
				>
					<div className="flex items-center justify-between text-xs text-white/45">
						<span className="font-semibold uppercase tracking-wider text-[0.65rem]">
							Cumulative Volume ({currency})
						</span>
						<Tooltip content={`Total trading volume across all transactions on the bonding curve in ${currency}.`}>
							<button
								type="button"
								className="text-white/30 hover:text-white/60 focus:outline-hidden"
								aria-label="Explain cumulative volume stat"
							>
								<Info className="size-3.5" />
							</button>
						</Tooltip>
					</div>

					<div className="mt-2 flex items-baseline gap-2">
						{isLoading && !data ? (
							<Skeleton className="h-7 w-28" />
						) : (
							<span
								className="font-jakarta text-2xl font-bold tracking-tight text-amber-300"
								title={volumeFullDisplay()}
							>
								{volumeDisplay()}
							</span>
						)}
					</div>
					<div className="mt-1 flex items-center gap-1.5 text-[11px] text-white/40">
						<TrendingUp className="size-3 text-amber-400" />
						<span>Total on-chain turnover</span>
					</div>
				</div>
			</div>
		</div>
	);
};

export default KeyAnalyticsPanel;
