import React, { useRef, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Lock } from 'lucide-react';
import { formatHolderCount, formatPercent } from '@/utils/numberFormat.utils';
import { rankKeyHolders, type KeyHolder, type RankedKeyHolder } from '@/utils/keyHolderRanking.utils';
import CircularSpinner from '@/components/common/CircularSpinnerProps';

export interface KeyHolderListProps {
	holders: KeyHolder[];
	hasNextPage?: boolean;
	isFetchingNextPage?: boolean;
	fetchNextPage?: () => void;
}

function truncateAddress(address: string): string {
	if (address.length <= 10) return address;
	return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

function HolderRow({ holder }: { holder: RankedKeyHolder }) {
	return (
		<li
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
	);
}

const KeyHolderList: React.FC<KeyHolderListProps> = ({
	holders,
	hasNextPage = false,
	isFetchingNextPage = false,
	fetchNextPage,
}) => {
	const ranked = rankKeyHolders(holders);
	const parentRef = useRef<HTMLDivElement>(null);

	const virtualizer = useVirtualizer({
		count: ranked.length,
		getScrollElement: () => parentRef.current,
		estimateSize: () => 56,
		overscan: 5,
	});

	const handleScroll = useCallback(() => {
		if (!fetchNextPage || !hasNextPage || isFetchingNextPage) return;
		const lastItem = virtualizer.getVirtualItems().at(-1);
		if (!lastItem) return;
		if (lastItem.index >= ranked.length - 1 - 3) {
			fetchNextPage();
		}
	}, [virtualizer, ranked.length, fetchNextPage, hasNextPage, isFetchingNextPage]);

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
			<div
				ref={parentRef}
				onScroll={handleScroll}
				style={{ height: Math.min(ranked.length * 56, 448), overflow: 'auto' }}
				data-testid="key-holder-list"
				role="table"
				aria-rowcount={ranked.length}
				aria-label="Key holders"
			>
				<ol
					style={{
						height: virtualizer.getTotalSize(),
						width: '100%',
						position: 'relative',
					}}
				>
					{virtualizer.getVirtualItems().map(virtualRow => {
						const holder = ranked[virtualRow.index];
						return (
							<div
								key={virtualRow.key}
								data-index={virtualRow.index}
								ref={virtualizer.measureElement}
								style={{
									position: 'absolute',
									top: 0,
									left: 0,
									width: '100%',
									transform: `translateY(${virtualRow.start}px)`,
								}}
								role="row"
								aria-rowindex={virtualRow.index + 1}
							>
								<HolderRow holder={holder} />
							</div>
						);
					})}
				</ol>
			</div>

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
		</>
	);
};

export default KeyHolderList;
