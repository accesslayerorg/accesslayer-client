import React, { useEffect, useMemo, useState } from 'react';
import { Download, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Skeleton from '@/components/ui/skeleton';
import EmptyState from '@/components/common/EmptyState';
import { cn } from '@/lib/utils';
import { useAllTradeHistory } from '@/hooks/useAllTradeHistory';
import { formatNumber } from '@/utils/numberFormat.utils';
import { downloadCsv } from '@/utils/transactionHistory.utils';
import {
	EMPTY_TRADE_LEDGER_FILTERS,
	TRADE_LEDGER_PAGE_SIZE,
	buildTradeCsvFilename,
	computeTradeAmounts,
	filterTrades,
	pageCount,
	paginate,
	tradesToCsv,
	type TradeLedgerFilters,
} from '@/utils/tradeLedger.utils';
import type { Trade } from '@/services/tradeHistory.service';

export interface TradeHistoryLedgerProps {
	walletAddress: string;
	className?: string;
}

function formatXlm(value: number): string {
	return `${formatNumber(value, { minimumFractionDigits: 2, maximumFractionDigits: 7 })} XLM`;
}

function DirectionChip({ direction }: { direction: Trade['tradeType'] }) {
	const isBuy = direction === 'Buy';
	return (
		<span
			data-testid="direction-chip"
			data-direction={direction}
			className={cn(
				'inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
				isBuy
					? 'bg-emerald-500/10 text-emerald-400'
					: 'bg-rose-500/10 text-rose-400'
			)}
		>
			{direction}
		</span>
	);
}

/**
 * Paginated trade history for the portfolio page (#1114): date range and
 * key-name filters, colour-coded Buy/Sell chips, and a CSV export that
 * includes every matching row rather than only the current page.
 */
export const TradeHistoryLedger: React.FC<TradeHistoryLedgerProps> = ({
	walletAddress,
	className,
}) => {
	const {
		data: trades,
		isLoading,
		isError,
	} = useAllTradeHistory(walletAddress);
	const [filters, setFilters] = useState<TradeLedgerFilters>(
		EMPTY_TRADE_LEDGER_FILTERS
	);
	const [page, setPage] = useState(1);

	const filtered = useMemo(
		() => filterTrades(trades ?? [], filters),
		[trades, filters]
	);
	const totalPages = pageCount(filtered.length);
	const visible = useMemo(() => paginate(filtered, page), [filtered, page]);

	// A filter change can leave the current page past the end; go back to page 1.
	useEffect(() => {
		setPage(1);
	}, [filters]);

	const updateFilter = (key: keyof TradeLedgerFilters, value: string) =>
		setFilters(prev => ({ ...prev, [key]: value }));

	const hasActiveFilters =
		filters.from !== '' || filters.to !== '' || filters.search.trim() !== '';

	const handleExport = () => {
		downloadCsv(buildTradeCsvFilename(), tradesToCsv(filtered));
	};

	if (isLoading) {
		return (
			<div
				className="space-y-3"
				role="status"
				data-testid="trade-ledger-loading"
			>
				<Skeleton className="h-10 w-full" />
				<Skeleton className="h-48 w-full" />
			</div>
		);
	}

	if (isError) {
		return (
			<EmptyState
				title="Couldn't load trade history"
				description="There was a problem fetching your trades. Please try again shortly."
				data-testid="trade-ledger-error"
			/>
		);
	}

	if (!trades || trades.length === 0) {
		return (
			<EmptyState
				title="No trades yet"
				description="Your buys and sells will show up here once you start trading keys."
				data-testid="trade-ledger-empty"
			/>
		);
	}

	return (
		<div className={cn('space-y-4', className)} data-testid="trade-ledger">
			<div className="flex flex-wrap items-end gap-3">
				<label className="flex flex-col gap-1 text-xs text-white/60">
					From
					<input
						type="date"
						value={filters.from}
						max={filters.to || undefined}
						onChange={event => updateFilter('from', event.target.value)}
						className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1.5 text-sm text-white"
						data-testid="trade-ledger-from"
					/>
				</label>
				<label className="flex flex-col gap-1 text-xs text-white/60">
					To
					<input
						type="date"
						value={filters.to}
						min={filters.from || undefined}
						onChange={event => updateFilter('to', event.target.value)}
						className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1.5 text-sm text-white"
						data-testid="trade-ledger-to"
					/>
				</label>
				<label className="flex min-w-[10rem] flex-1 flex-col gap-1 text-xs text-white/60">
					Key name
					<span className="relative">
						<Search
							className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/40"
							aria-hidden="true"
						/>
						<input
							type="search"
							value={filters.search}
							onChange={event =>
								updateFilter('search', event.target.value)
							}
							placeholder="Search keys"
							className="w-full rounded-lg border border-white/10 bg-white/[0.04] py-1.5 pl-7 pr-2 text-sm text-white"
							data-testid="trade-ledger-search"
						/>
					</span>
				</label>
				<Button
					type="button"
					variant="ghost"
					onClick={handleExport}
					disabled={filtered.length === 0}
					data-testid="trade-ledger-export"
				>
					<Download className="mr-2 h-4 w-4" aria-hidden="true" />
					Export CSV
				</Button>
			</div>

			{filtered.length === 0 ? (
				<EmptyState
					title="No trades match your filters"
					description="Try a different date range or key name."
					data-testid="trade-ledger-no-matches"
				>
					{hasActiveFilters && (
						<Button
							type="button"
							variant="ghost"
							onClick={() => setFilters(EMPTY_TRADE_LEDGER_FILTERS)}
						>
							Clear filters
						</Button>
					)}
				</EmptyState>
			) : (
				<>
					<div className="overflow-x-auto rounded-xl border border-white/10">
						<table
							className="w-full text-left text-sm text-white"
							data-testid="trade-ledger-table"
						>
							<thead className="bg-white/[0.04] text-xs uppercase tracking-wide text-white/55">
								<tr>
									<th scope="col" className="px-3 py-2">
										Date
									</th>
									<th scope="col" className="px-3 py-2">
										Key
									</th>
									<th scope="col" className="px-3 py-2">
										Direction
									</th>
									<th scope="col" className="px-3 py-2 text-right">
										Amount
									</th>
									<th scope="col" className="px-3 py-2 text-right">
										Price
									</th>
									<th scope="col" className="px-3 py-2 text-right">
										Fee
									</th>
									<th scope="col" className="px-3 py-2 text-right">
										Total
									</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-white/5">
								{visible.map(trade => {
									const { fee, total } = computeTradeAmounts(trade);
									return (
										<tr key={trade.id} data-testid="trade-ledger-row">
											<td className="whitespace-nowrap px-3 py-2">
												{new Date(
													trade.timestamp
												).toLocaleDateString('en-US', {
													year: 'numeric',
													month: 'short',
													day: 'numeric',
													timeZone: 'UTC',
												})}
											</td>
											<td className="px-3 py-2">{trade.keyName}</td>
											<td className="px-3 py-2">
												<DirectionChip
													direction={trade.tradeType}
												/>
											</td>
											<td className="px-3 py-2 text-right tabular-nums">
												{formatNumber(trade.quantity)}
											</td>
											<td className="px-3 py-2 text-right tabular-nums">
												{formatXlm(trade.pricePerKey)}
											</td>
											<td className="px-3 py-2 text-right tabular-nums">
												{formatXlm(fee)}
											</td>
											<td className="px-3 py-2 text-right tabular-nums">
												{formatXlm(total)}
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					</div>

					<nav
						className="flex items-center justify-between text-sm text-white/65"
						aria-label="Trade history pages"
					>
						<span data-testid="trade-ledger-summary">
							{formatNumber(filtered.length)} trade
							{filtered.length !== 1 ? 's' : ''} · Page{' '}
							{Math.min(page, totalPages)} of {totalPages} (
							{TRADE_LEDGER_PAGE_SIZE} per page)
						</span>
						<span className="flex gap-2">
							<Button
								type="button"
								variant="ghost"
								onClick={() => setPage(p => Math.max(1, p - 1))}
								disabled={page <= 1}
								data-testid="trade-ledger-prev"
							>
								Previous
							</Button>
							<Button
								type="button"
								variant="ghost"
								onClick={() =>
									setPage(p => Math.min(totalPages, p + 1))
								}
								disabled={page >= totalPages}
								data-testid="trade-ledger-next"
							>
								Next
							</Button>
						</span>
					</nav>
				</>
			)}
		</div>
	);
};

export default TradeHistoryLedger;
