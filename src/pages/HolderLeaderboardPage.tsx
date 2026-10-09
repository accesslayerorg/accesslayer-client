import { useEffect, useState } from 'react';
import { ArrowLeft, RefreshCw, Trophy } from 'lucide-react';
import { Link, useParams } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { useKeyHolders } from '@/hooks/useKeyHolders';
import { useCreatorDetail } from '@/hooks/useCreators';
import { useProfileStore } from '@/hooks/useProfileStore';
import { rankKeyHolders, type RankedKeyHolder } from '@/utils/keyHolderRanking.utils';
import { formatHolderCount, formatPercent } from '@/utils/numberFormat.utils';
import CircularSpinner from '@/components/common/CircularSpinnerProps';
import { cn } from '@/lib/utils';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useNavigationTiming } from '@/hooks/useNavigationTiming';

const AUTO_REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes
const TOP_HOLDERS_LIMIT = 100;

function truncateAddress(address: string): string {
	if (address.length <= 10) return address;
	return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

function getRankColor(rank: number): string {
	if (rank === 1) return 'text-amber-400';
	if (rank === 2) return 'text-slate-300';
	if (rank === 3) return 'text-amber-600';
	return 'text-white/60';
}

function getRankBackground(rank: number): string {
	if (rank === 1) return 'bg-amber-400/10 border-amber-400/30';
	if (rank === 2) return 'bg-slate-300/10 border-slate-300/30';
	if (rank === 3) return 'bg-amber-600/10 border-amber-600/30';
	return 'bg-white/5 border-white/10';
}

interface HolderLeaderboardRowProps {
	holder: RankedKeyHolder;
	rank: number;
	isConnectedWallet: boolean;
}

function HolderLeaderboardRow({ holder, rank, isConnectedWallet }: HolderLeaderboardRowProps) {
	return (
		<li
			className={cn(
				'flex items-center justify-between gap-4 border-b border-white/5 py-3 transition-colors',
				isConnectedWallet && 'bg-amber-400/5 border-amber-400/20'
			)}
			data-testid="holder-leaderboard-row"
		>
			<div className="flex items-center gap-3 min-w-0">
				<span
					className={cn(
						'inline-flex size-8 shrink-0 items-center justify-center rounded-full border text-sm font-bold',
						getRankBackground(rank),
						getRankColor(rank)
					)}
					data-testid="holder-rank"
					aria-label={`Rank ${rank}`}
				>
					{rank <= 3 ? <Trophy className="size-4" aria-hidden="true" /> : rank}
				</span>
				<div className="min-w-0 flex-1">
					<span
						className={cn(
							'text-sm font-medium truncate font-mono',
							isConnectedWallet ? 'text-amber-300' : 'text-white'
						)}
						title={holder.walletAddress}
						data-testid="holder-wallet"
					>
						{holder.walletAddress ? truncateAddress(holder.walletAddress) : holder.displayName}
					</span>
					{isConnectedWallet && (
						<span
							className="inline-flex items-center gap-1 rounded-full bg-amber-400/20 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-amber-300 ml-2"
							data-testid="connected-wallet-badge"
						>
							You
						</span>
					)}
				</div>
			</div>
			<div className="flex items-center gap-4 text-right shrink-0 tabular-nums">
				<div
					className={cn(
						'w-20 text-right text-sm font-semibold',
						isConnectedWallet ? 'text-amber-300' : 'text-white'
					)}
					data-testid="holder-balance"
				>
					{formatHolderCount(holder.keyCount)}
				</div>
				<div
					className={cn(
						'w-16 text-right text-sm font-semibold',
						isConnectedWallet ? 'text-amber-300' : 'text-amber-300/90'
					)}
					data-testid="holder-share"
				>
					{formatPercent(holder.sharePercent, { maximumFractionDigits: 2 })}
				</div>
			</div>
		</li>
	);
}

function HolderLeaderboardSkeleton() {
	return (
		<>
			{Array.from({ length: 10 }).map((_, index) => (
				<li
					key={index}
					className="flex items-center justify-between gap-4 border-b border-white/5 py-3"
				>
					<div className="flex items-center gap-3 min-w-0">
						<div className="size-8 shrink-0 rounded-full bg-white/10 animate-pulse" />
						<div className="h-4 w-32 bg-white/10 rounded animate-pulse" />
					</div>
					<div className="flex items-center gap-4">
						<div className="h-4 w-20 bg-white/10 rounded animate-pulse" />
						<div className="h-4 w-16 bg-white/10 rounded animate-pulse" />
					</div>
				</li>
			))}
		</>
	);
}

export default function HolderLeaderboardPage() {
	useNavigationTiming('holder_leaderboard');
	const { id } = useParams<{ id: string }>();
	const queryClient = useQueryClient();
	const profile = useProfileStore(state => state.profile);
	const userAddress = profile?.id?.toLowerCase();

	const [isAutoRefreshing, setIsAutoRefreshing] = useState(false);

	const {
		data: creator,
		isLoading: isCreatorLoading,
		error: creatorError,
	} = useCreatorDetail(id || '');

	const {
		holders,
		hasNextPage,
		isFetchingNextPage,
		isLoading: isHoldersLoading,
		fetchNextPage,
	} = useKeyHolders(id || '');

	useDocumentTitle(creator ? `${creator.title} Holder Leaderboard — AccessLayer` : 'Holder Leaderboard — AccessLayer');

	// Auto-refresh every 5 minutes
	useEffect(() => {
		if (!id) return;

		const interval = setInterval(async () => {
			setIsAutoRefreshing(true);
			try {
				await queryClient.invalidateQueries({ queryKey: ['creators', 'holders', id] });
				await queryClient.invalidateQueries({ queryKey: ['creator', id] });
			} finally {
				setIsAutoRefreshing(false);
			}
		}, AUTO_REFRESH_INTERVAL);

		return () => clearInterval(interval);
	}, [id, queryClient]);

	// Rank holders and limit to top 100
	const rankedHolders = rankKeyHolders(holders).slice(0, TOP_HOLDERS_LIMIT);

	// Find connected wallet rank
	const connectedWalletRank = userAddress
		? rankedHolders.findIndex(h => h.walletAddress?.toLowerCase() === userAddress)
		: -1;

	if (isCreatorLoading || isHoldersLoading) {
		return (
			<main className="min-h-screen bg-[#06111f] px-6 py-16 text-white md:px-12">
				<div className="mx-auto max-w-4xl">
					<Link
						to={`/creator/${id}`}
						className="mb-6 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-white/50 transition-colors hover:text-white"
					>
						<ArrowLeft className="size-3.5" />
						Back to creator
					</Link>
					<div className="mb-6">
						<div className="h-8 w-64 bg-white/10 rounded animate-pulse mb-2" />
						<div className="h-4 w-96 bg-white/10 rounded animate-pulse" />
					</div>
					<div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
						<HolderLeaderboardSkeleton />
					</div>
				</div>
			</main>
		);
	}

	if (creatorError || !creator) {
		return (
			<main className="min-h-screen bg-[#06111f] px-6 py-16 text-white md:px-12">
				<div className="mx-auto max-w-4xl text-center">
					<Link
						to={`/creator/${id}`}
						className="mb-6 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-white/50 transition-colors hover:text-white"
					>
						<ArrowLeft className="size-3.5" />
						Back to creator
					</Link>
					<h1 className="font-grotesque text-2xl font-black mb-4">
						Holder Leaderboard
					</h1>
					<p className="text-white/50">
						Unable to load holder leaderboard. Please try again later.
					</p>
				</div>
			</main>
		);
	}

	return (
		<main className="min-h-screen bg-[#06111f] px-6 py-16 text-white md:px-12">
			<div className="mx-auto max-w-4xl space-y-6">
				<Link
					to={`/creator/${id}`}
					className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-white/50 transition-colors hover:text-white"
				>
					<ArrowLeft className="size-3.5" />
					Back to creator
				</Link>

				<div className="flex items-start justify-between gap-4">
					<div>
						<h1 className="font-grotesque text-2xl font-black tracking-tight text-white mb-2">
							{creator.title} Holder Leaderboard
						</h1>
						<p className="text-sm text-white/60">
							Top {TOP_HOLDERS_LIMIT} holders ranked by balance
						</p>
					</div>
					<div
						className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/50"
						data-testid="refresh-status"
					>
						{isAutoRefreshing ? (
							<RefreshCw className="size-3 animate-spin motion-reduce:animate-none" aria-hidden="true" />
						) : (
							<span className="size-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
						)}
						{isAutoRefreshing ? 'Refreshing…' : 'Updates every 5m'}
					</div>
				</div>

				<div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 shadow-2xl backdrop-blur-md">
					<div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3 text-[0.65rem] font-bold uppercase tracking-[0.18em] text-white/40 mb-2">
						<span className="flex-1">Holder</span>
						<div className="flex items-center gap-4 text-right shrink-0">
							<span className="w-20">Balance</span>
							<span className="w-16">Share</span>
						</div>
					</div>

					<ol className="divide-y divide-white/5" data-testid="holder-leaderboard-list">
						{rankedHolders.length === 0 ? (
							<li className="py-12 text-center text-sm text-white/50" data-testid="empty-state">
								No holders yet.
							</li>
						) : (
							rankedHolders.map((holder, index) => (
								<HolderLeaderboardRow
									key={holder.id}
									holder={holder}
									rank={index + 1}
									isConnectedWallet={index === connectedWalletRank}
								/>
							))
						)}
					</ol>

					{isFetchingNextPage && (
						<div className="flex justify-center py-4" data-testid="loading-more">
							<CircularSpinner size={24} color="white" />
						</div>
					)}

					{!hasNextPage && rankedHolders.length > 0 && (
						<p
							className="py-4 text-center text-xs text-white/40"
							data-testid="all-holders-loaded"
						>
							Showing top {rankedHolders.length} holders
						</p>
					)}

					{hasNextPage && rankedHolders.length < TOP_HOLDERS_LIMIT && (
						<button
							type="button"
							onClick={() => {
								void fetchNextPage();
							}}
							className="w-full py-3 text-sm font-semibold text-amber-300 hover:text-amber-200 transition-colors"
							data-testid="load-more-button"
						>
							Load more holders
						</button>
					)}
				</div>

				{connectedWalletRank >= TOP_HOLDERS_LIMIT && userAddress && (
					<div className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-4 text-center">
						<p className="text-sm text-amber-200">
							Your wallet is not in the top {TOP_HOLDERS_LIMIT} holders
						</p>
					</div>
				)}
			</div>
		</main>
	);
}
