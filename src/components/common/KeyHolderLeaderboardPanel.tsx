import { useState } from 'react';
import { Medal, Loader2 } from 'lucide-react';
import { useKeyHolderLeaderboard } from '@/hooks/useKeyHolderLeaderboard';
import {
	LEADERBOARD_METRIC_TABS,
	formatLeaderboardScore,
	type KeyHolderLeaderboardMetric,
	type KeyHolderLeaderboardEntry,
} from '@/utils/keyHolderLeaderboard.utils';
import { shortenAddress } from '@/lib/web3/format';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export interface KeyHolderLeaderboardPanelProps {
	keyId: string;
	connectedWalletAddress?: string | null;
	className?: string;
	/** Optional title override */
	title?: string;
	/** Optional subtitle override */
	description?: string;
}

function getMedalConfig(rank: number) {
	if (rank === 1) {
		return {
			testId: 'medal-icon-gold',
			colorClass: 'text-amber-400',
			bgClass: 'bg-amber-400/10 border-amber-400/30',
			label: 'Gold medal',
		};
	}
	if (rank === 2) {
		return {
			testId: 'medal-icon-silver',
			colorClass: 'text-slate-300',
			bgClass: 'bg-slate-300/10 border-slate-300/30',
			label: 'Silver medal',
		};
	}
	if (rank === 3) {
		return {
			testId: 'medal-icon-bronze',
			colorClass: 'text-amber-600',
			bgClass: 'bg-amber-600/10 border-amber-600/30',
			label: 'Bronze medal',
		};
	}
	return null;
}

interface LeaderboardRowProps {
	entry: KeyHolderLeaderboardEntry;
	metric: KeyHolderLeaderboardMetric;
	isConnected: boolean;
	isPinned?: boolean;
}

function LeaderboardRow({
	entry,
	metric,
	isConnected,
	isPinned = false,
}: LeaderboardRowProps) {
	const medal = getMedalConfig(entry.rank);
	const formattedScore =
		entry.formattedScore ?? formatLeaderboardScore(entry.score, metric);

	return (
		<div
			className={cn(
				'flex items-center justify-between gap-4 px-4 py-3 transition-colors',
				isConnected
					? 'bg-amber-400/10 border-amber-400/30 font-medium'
					: 'hover:bg-white/[0.02]',
				isPinned
					? 'border-t-2 border-amber-400/40 bg-amber-500/10 shadow-lg'
					: 'border-b border-white/5'
			)}
			data-testid={isPinned ? 'pinned-user-row' : 'leaderboard-row'}
			data-rank={entry.rank}
		>
			<div className="flex items-center gap-3.5 min-w-0">
				{medal ? (
					<span
						className={cn(
							'inline-flex size-8 shrink-0 items-center justify-center rounded-full border',
							medal.bgClass
						)}
						title={`Rank ${entry.rank} - ${medal.label}`}
						data-testid={`rank-medal-${entry.rank}`}
					>
						<Medal
							className={cn('size-4', medal.colorClass)}
							data-testid={medal.testId}
							aria-hidden="true"
						/>
						<span className="sr-only">Rank {entry.rank}</span>
					</span>
				) : (
					<span
						className="inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-xs font-bold text-white/60 tabular-nums"
						data-testid={`rank-number-${entry.rank}`}
					>
						{entry.rank}
					</span>
				)}

				<div className="flex items-center gap-2 min-w-0">
					<span
						className={cn(
							'truncate font-mono text-xs sm:text-sm',
							isConnected
								? 'font-bold text-amber-300'
								: 'text-white/90'
						)}
						title={entry.walletAddress}
						data-testid="holder-wallet-address"
					>
						{shortenAddress(entry.walletAddress)}
					</span>
					{isConnected && (
						<span
							className="inline-flex items-center rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300"
							data-testid="connected-wallet-badge"
						>
							You
						</span>
					)}
				</div>
			</div>

			<div className="text-right shrink-0">
				<span
					className={cn(
						'text-xs sm:text-sm font-semibold tabular-nums',
						isConnected ? 'text-amber-300' : 'text-white'
					)}
					data-testid="holder-score"
				>
					{formattedScore}
				</span>
			</div>
		</div>
	);
}

export default function KeyHolderLeaderboardPanel({
	keyId,
	connectedWalletAddress,
	className,
	title = 'Key Holder Leaderboard',
	description = 'Top holders ranked by trading volume, realized profit, and holding duration',
}: KeyHolderLeaderboardPanelProps) {
	const [activeMetric, setActiveMetric] =
		useState<KeyHolderLeaderboardMetric>('volume');

	const {
		entries,
		userRank,
		isUserInTop10,
		hasNextPage,
		isFetchingNextPage,
		isLoading,
		isError,
		fetchNextPage,
	} = useKeyHolderLeaderboard(keyId, {
		metric: activeMetric,
		userWallet: connectedWalletAddress ?? undefined,
		pageSize: 10,
	});

	const activeTab = LEADERBOARD_METRIC_TABS.find(t => t.id === activeMetric);
	const metricLabel = activeTab ? activeTab.label : 'Score';

	// The connected wallet should be pinned if the user is connected, has a rank,
	// and is not inside the currently rendered top 10 entries (#1203).
	const shouldPinConnectedWallet = Boolean(
		connectedWalletAddress && userRank && !isUserInTop10
	);

	return (
		<section
			className={cn(
				'rounded-2xl border border-white/10 bg-slate-950/40 backdrop-blur-sm p-4 sm:p-6',
				className
			)}
			data-testid="key-holder-leaderboard"
			aria-labelledby="leaderboard-heading"
		>
			{/* Header with Title and Metric Tabs */}
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
				<div>
					<h2
						id="leaderboard-heading"
						className="font-grotesque text-xl sm:text-2xl font-bold tracking-tight text-white"
					>
						{title}
					</h2>
					<p className="text-xs sm:text-sm text-white/50 mt-1">
						{description}
					</p>
				</div>

				{/* Metric Tabs */}
				<div
					className="flex items-center rounded-lg border border-white/10 bg-black/30 p-1"
					role="tablist"
					aria-label="Leaderboard metrics"
				>
					{LEADERBOARD_METRIC_TABS.map(tab => {
						const isSelected = activeMetric === tab.id;
						return (
							<button
								key={tab.id}
								type="button"
								role="tab"
								aria-selected={isSelected}
								data-testid={`leaderboard-metric-tab-${tab.id}`}
								onClick={() => setActiveMetric(tab.id)}
								className={cn(
									'rounded-md px-3 py-1.5 text-xs font-semibold tracking-wide transition-all',
									isSelected
										? 'bg-amber-400 text-slate-950 shadow-sm'
										: 'text-white/60 hover:text-white hover:bg-white/5'
								)}
							>
								{tab.label}
							</button>
						);
					})}
				</div>
			</div>

			{/* Table Header */}
			<div className="flex items-center justify-between border-b border-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-white/40">
				<span>Rank & Holder</span>
				<span>{metricLabel}</span>
			</div>

			{/* Content Area */}
			{isLoading ? (
				<div
					className="py-12 flex flex-col items-center justify-center gap-3 text-white/50"
					data-testid="leaderboard-loading"
				>
					<Loader2 className="size-6 animate-spin text-amber-400" />
					<span className="text-xs">Loading leaderboard entries...</span>
				</div>
			) : isError ? (
				<div
					className="py-12 text-center text-white/50 text-xs"
					data-testid="leaderboard-error"
				>
					Failed to load leaderboard data. Please try again.
				</div>
			) : entries.length === 0 ? (
				<div
					className="py-12 text-center text-white/40 text-xs"
					data-testid="leaderboard-empty"
				>
					No key holders recorded yet.
				</div>
			) : (
				<div className="divide-y divide-white/5">
					{/* Ranked entries list */}
					<div className="flex flex-col" data-testid="leaderboard-entries-list">
						{entries.map(entry => {
							const isConnected = Boolean(
								connectedWalletAddress &&
									entry.walletAddress.toLowerCase() ===
										connectedWalletAddress.toLowerCase()
							);
							return (
								<LeaderboardRow
									key={`${entry.rank}-${entry.walletAddress}`}
									entry={entry}
									metric={activeMetric}
									isConnected={isConnected}
								/>
							);
						})}
					</div>

					{/* Load More Button */}
					{hasNextPage && (
						<div className="p-4 text-center">
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={() => fetchNextPage()}
								disabled={isFetchingNextPage}
								data-testid="leaderboard-load-more"
								className="border-white/10 bg-white/5 hover:bg-white/10 text-white text-xs"
							>
								{isFetchingNextPage ? (
									<>
										<Loader2 className="size-3.5 animate-spin mr-2" />
										Loading more...
									</>
								) : (
									'Load More'
								)}
							</Button>
						</div>
					)}

					{/* Connected Wallet Pinned Row (when outside visible top 10) */}
					{shouldPinConnectedWallet && userRank && (
						<div className="mt-2">
							<div className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-400/80 bg-amber-400/5 border-t border-amber-400/20">
								Your Position
							</div>
							<LeaderboardRow
								entry={userRank}
								metric={activeMetric}
								isConnected={true}
								isPinned={true}
							/>
						</div>
					)}
				</div>
			)}
		</section>
	);
}
