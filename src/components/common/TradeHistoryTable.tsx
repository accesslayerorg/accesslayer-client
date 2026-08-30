// src/components/common/TradeHistoryTable.tsx
import React, { useMemo } from 'react';
import { ArrowUpRight, ArrowDownRight, ClockIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import EmptyState from '@/components/common/EmptyState';
import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/utils/time.utils';
import type { Trade } from '@/services/tradeHistory.service';
import { useTradeHistory } from '@/hooks/useWallet';

interface TradeHistoryTableProps {
	/** Connected wallet address used as the query key. */
	walletAddress: string;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function totalCost(trade: Trade): string {
	return (trade.quantity * trade.pricePerKey).toFixed(4);
}

function TradeTypePill({ type }: { type: Trade['tradeType'] }) {
	const isBuy = type === 'Buy';
	return (
		<span
			className={cn(
				'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
				isBuy
					? 'bg-emerald-500/10 text-emerald-400'
					: 'bg-rose-500/10 text-rose-400'
			)}
		>
			{isBuy ? (
				<ArrowUpRight className="size-3" aria-hidden="true" />
			) : (
				<ArrowDownRight className="size-3" aria-hidden="true" />
			)}
			{type}
		</span>
	);
}

// ─── skeleton loader ───────────────────────────────────────────────────────────

function SkeletonRow() {
	return (
		<div
			className="flex items-center gap-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4"
			aria-hidden="true"
		>
			<div className="h-4 w-1/4 animate-pulse rounded bg-white/10" />
			<div className="h-4 w-12 animate-pulse rounded bg-white/10" />
			<div className="h-4 w-10 animate-pulse rounded bg-white/10" />
			<div className="h-4 w-16 animate-pulse rounded bg-white/10" />
			<div className="h-4 w-20 animate-pulse rounded bg-white/10" />
			<div className="ml-auto h-4 w-20 animate-pulse rounded bg-white/10" />
		</div>
	);
}

// ─── single row ───────────────────────────────────────────────────────────────

function TradeRow({ trade }: { trade: Trade }) {
	const isBuy = trade.tradeType === 'Buy';
	return (
		<div
			data-testid={`trade-row-${trade.tradeType.toLowerCase()}`}
			className={cn(
				'flex flex-col gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-4 pl-5 transition-colors hover:border-white/20 hover:bg-white/[0.04] sm:flex-row sm:items-center sm:justify-between',
				// Accent left border per acceptance criterion
				isBuy
					? 'border-l-4 border-l-emerald-500'
					: 'border-l-4 border-l-rose-500'
			)}
		>
			{/* Key name */}
			<span className="min-w-0 flex-1 truncate text-sm font-semibold text-white">
				{trade.keyName}
			</span>

			{/* Type pill */}
			<TradeTypePill type={trade.tradeType} />

			{/* Numeric columns */}
			<div className="flex items-center gap-4 text-xs text-white/60 sm:gap-6">
				<div className="flex flex-col items-end">
					<span className="text-[10px] font-bold uppercase tracking-widest text-white/30">
						Qty
					</span>
					<span className="font-mono text-white/80">{trade.quantity}</span>
				</div>

				<div className="flex flex-col items-end">
					<span className="text-[10px] font-bold uppercase tracking-widest text-white/30">
						Price / key
					</span>
					<span className="font-mono text-white/80">
						{trade.pricePerKey.toFixed(4)} XLM
					</span>
				</div>

				<div className="flex flex-col items-end">
					<span className="text-[10px] font-bold uppercase tracking-widest text-white/30">
						Total
					</span>
					<span
						className={cn(
							'font-mono font-semibold',
							isBuy ? 'text-rose-400' : 'text-emerald-400'
						)}
					>
						{isBuy ? '−' : '+'}
						{totalCost(trade)} XLM
					</span>
				</div>

				<div className="flex flex-col items-end">
					<span className="text-[10px] font-bold uppercase tracking-widest text-white/30">
						When
					</span>
					<span
						className="font-mono text-white/60"
						title={new Date(trade.timestamp).toLocaleString()}
					>
						{formatRelativeTime(trade.timestamp)}
					</span>
				</div>
			</div>
		</div>
	);
}

// ─── main component ────────────────────────────────────────────────────────────

/**
 * Trade History Table — issue #784.
 *
 * Fetches from GET /users/:wallet/trades with cursor pagination and renders
 * a flat list of all settled trades. Buy rows carry a green left border;
 * sell rows carry a red left border. A "Load More" button is shown when
 * the server signals more pages exist. An empty-state panel is shown when
 * the user has no trade history.
 */
const TradeHistoryTable: React.FC<TradeHistoryTableProps> = ({
	walletAddress,
}) => {
	const {
		data,
		fetchNextPage,
		hasNextPage,
		isFetchingNextPage,
		isLoading,
		isError,
	} = useTradeHistory(walletAddress);

	// Flatten pages and deduplicate by id (defensive against overlapping cursors)
	const trades = useMemo(() => {
		const seen = new Set<string>();
		const result: Trade[] = [];
		for (const page of data?.pages ?? []) {
			for (const trade of page.trades) {
				if (seen.has(trade.id)) continue;
				seen.add(trade.id);
				result.push(trade);
			}
		}
		return result;
	}, [data]);

	// ── Loading state ──────────────────────────────────────────────────────────
	if (isLoading) {
		return (
			<section
				className="space-y-2"
				aria-label="Loading trade history"
				aria-busy="true"
			>
				{Array.from({ length: 5 }).map((_, i) => (
					<SkeletonRow key={i} />
				))}
			</section>
		);
	}

	// ── Error state ────────────────────────────────────────────────────────────
	if (isError) {
		return (
			<EmptyState
				title="Couldn't load trade history"
				description="There was a problem fetching your trades. Please try again shortly."
				data-testid="trade-history-error"
			/>
		);
	}

	// ── Empty state ────────────────────────────────────────────────────────────
	if (trades.length === 0) {
		return (
			<EmptyState
				title="No trades yet"
				description="Your buy and sell history will appear here once you make your first trade."
				data-testid="trade-history-empty"
			/>
		);
	}

	// ── Populated table ────────────────────────────────────────────────────────
	return (
		<section aria-label="Trade history">
			{/* Column header row — hidden on mobile, visible on sm+ */}
			<div className="mb-2 hidden items-center gap-4 px-5 text-[10px] font-bold uppercase tracking-widest text-white/30 sm:flex sm:justify-between">
				<span className="flex-1">Key</span>
				<div className="flex items-center gap-4 sm:gap-6">
					<span className="w-12 text-right">Type</span>
					<span className="w-10 text-right">Qty</span>
					<span className="w-20 text-right">Price / key</span>
					<span className="w-24 text-right">Total cost</span>
					<span className="flex items-center gap-1 w-24 text-right">
						<ClockIcon className="size-3" aria-hidden="true" />
						When
					</span>
				</div>
			</div>

			<div className="space-y-2" data-testid="trade-history-list">
				{trades.map(trade => (
					<TradeRow key={trade.id} trade={trade} />
				))}
			</div>

			{/* Load More ─────────────────────────────────────────────────────── */}
			{hasNextPage && (
				<div className="mt-6 flex justify-center">
					<Button
						variant="outline"
						onClick={() => void fetchNextPage()}
						disabled={isFetchingNextPage}
						data-testid="trade-history-load-more"
						className="rounded-xl border-white/15 bg-white/5 px-8 text-white/80 hover:bg-white/10 hover:text-white"
					>
						{isFetchingNextPage ? 'Loading…' : 'Load More'}
					</Button>
				</div>
			)}
		</section>
	);
};

export default TradeHistoryTable;
