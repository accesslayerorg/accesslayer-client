import { Lock } from 'lucide-react';
import { formatHolderCount, formatPercent } from '@/utils/numberFormat.utils';
import { rankKeyHolders, type KeyHolder } from '@/utils/keyHolderRanking.utils';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import CircularSpinner from '@/components/common/CircularSpinnerProps';

export interface KeyHolderListProps {
	holders: KeyHolder[];
	/** Whether there are more pages to load. */
	hasNextPage?: boolean;
	/** Whether the next page is currently being fetched. */
	isFetchingNextPage?: boolean;
	/** Callback to fetch the next page of holders. */
	fetchNextPage?: () => void;
}

function truncateAddress(address: string): string {
	if (address.length <= 10) return address;
	return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

/**
 * Ranks investors by total quantity held (liquid + staked) and shows each
 * holder's share of the supply held across the list, alongside a per-row
 * Staked / Liquid split so true liquid supply is visible at a glance. Rows
 * with staked keys carry a staking badge. When infinite scroll props are
 * provided, a sentinel triggers the next page fetch and a loading spinner is
 * shown while the next page loads. When no more pages remain, "All holders
 * loaded" is displayed at the bottom.
 */
const KeyHolderList: React.FC<KeyHolderListProps> = ({
	holders,
	hasNextPage = false,
	isFetchingNextPage = false,
	fetchNextPage,
}) => {
	const ranked = rankKeyHolders(holders);

	const sentinelRef = useInfiniteScroll<HTMLDivElement>({
		enabled: !isFetchingNextPage && !!hasNextPage,
		hasMore: !!hasNextPage,
		onLoadMore: () => {
			fetchNextPage?.();
		},
	});

	if (ranked.length === 0 && !isFetchingNextPage) {
		return (
			<p className="py-8 text-center text-sm text-white/50" data-testid="key-holder-list-empty">
				No holders yet.
			</p>
		);
	}

	return (
		<>
			<div
				className="flex items-center justify-between gap-3 border-b border-white/10 pb-2 text-[0.65rem] font-bold uppercase tracking-[0.18em] text-white/40"
				data-testid="key-holder-list-header"
			>
				<span>Holder</span>
				<div className="flex items-center gap-3 text-right shrink-0">
					<span className="w-16">Staked</span>
					<span className="w-16">Liquid</span>
					<span className="w-16">Total</span>
					<span className="w-16">Share</span>
				</div>
			</div>
			<ol className="divide-y divide-white/5" data-testid="key-holder-list">
				{ranked.map(holder => (
					<li
						key={holder.id}
						className="flex items-center justify-between gap-3 py-3"
						data-testid="key-holder-row"
					>
						<div className="flex items-center gap-3 min-w-0">
							<span
								className="inline-flex size-7 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-xs font-bold text-white/70"
								data-testid="key-holder-rank"
								aria-label={`Rank ${holder.rank}`}
							>
								{holder.rank}
							</span>
							{holder.walletAddress ? (
								<span
									className="text-sm font-medium text-white truncate font-mono"
									title={holder.walletAddress}
									data-testid="key-holder-wallet"
								>
									{truncateAddress(holder.walletAddress)}
								</span>
							) : (
								<span className="text-sm font-medium text-white">
									{holder.displayName}
								</span>
							)}
							{holder.stakedQuantity > 0 && (
								<span
									className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-400/10 px-1.5 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wide text-amber-300"
									data-testid="key-holder-staking-badge"
									title={`${formatHolderCount(holder.stakedQuantity)} keys staked`}
									aria-label={`${formatHolderCount(holder.stakedQuantity)} keys staked`}
								>
									<Lock className="size-2.5" aria-hidden="true" />
									Staking
								</span>
							)}
						</div>
						<div className="flex items-center gap-3 text-right shrink-0 tabular-nums">
							<span
								className="w-16 shrink-0 text-sm text-amber-300/90"
								data-testid="key-holder-staked"
							>
								{formatHolderCount(holder.stakedQuantity)}
							</span>
							<span
								className="w-16 shrink-0 text-sm text-white/70"
								data-testid="key-holder-liquid"
							>
								{formatHolderCount(holder.liquidQuantity)}
							</span>
							<span
								className="w-16 shrink-0 text-sm text-white/70"
								data-testid="key-holder-key-count"
							>
								{formatHolderCount(holder.keyCount)}
							</span>
							<span
								className="w-16 shrink-0 text-sm font-semibold text-amber-300/90"
								data-testid="key-holder-share"
							>
								{formatPercent(holder.sharePercent, { maximumFractionDigits: 1 })}
							</span>
						</div>
					</li>
				))}
			</ol>

			{isFetchingNextPage && (
				<div className="flex justify-center py-4" data-testid="key-holders-loading-more">
					<CircularSpinner size={24} color="white" />
				</div>
			)}

			{!hasNextPage && ranked.length > 0 && (
				<p
					className="py-4 text-center text-xs text-white/40"
					data-testid="key-holders-all-loaded"
				>
					All holders loaded
				</p>
			)}

			{hasNextPage && (
				<div
					ref={sentinelRef}
					data-testid="key-holders-sentinel"
					aria-hidden="true"
					className="h-px w-full"
				/>
			)}
		</>
	);
};

export default KeyHolderList;
