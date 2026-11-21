import { useCallback, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAccount } from 'wagmi';
import { BarChart3, Wallet, Layers } from 'lucide-react';
import EmptyState from '@/components/common/EmptyState';
import { Button } from '@/components/ui/button';
import { useBatchTradeStore, selectBatchItemCount } from '@/hooks/useBatchTradeStore';
import SectionErrorBoundary from '@/components/common/SectionErrorBoundary';
import BadgeProgressTracker from '@/components/common/BadgeProgressTracker';
import Skeleton from '@/components/ui/skeleton';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useWalletHoldings } from '@/hooks/useWallet';
import { useCreatorPrices } from '@/hooks/useCreatorPrices';
import { cn } from '@/lib/utils';
import { formatDisplayKeyPrice, resolveCreatorKeyPriceStroops } from '@/utils/keyPriceDisplay.utils';
import { useActiveKeySplits } from '@/hooks/useKeySplit';
import { isSplitActive } from '@/utils/keySplit.utils';
import KeySplitBanner from '@/components/common/KeySplitBanner';
import SplitAppliedBadge from '@/components/common/SplitAppliedBadge';
import {
	calculatePnLSummary,
	calculatePortfolioValue,
	getPnLToneClassName,
	getPortfolioValueHelperText,
	formatPnLDisplay,
	formatPnLPercentage,
	formatPortfolioValueDisplay,
	sortHoldingsByTotalValue,
} from '@/utils/portfolioValue.utils';
import {
	buildPortfolioTableRows,
	defaultDirectionForSortKey,
	sortPortfolioTableRows,
	type PortfolioTableSortDirection,
	type PortfolioTableSortKey,
} from '@/utils/portfolioTable.utils';

const SKELETON_ROW_COUNT = 4;

/**
 * Column layout for the positions table. Exactly three columns are sortable,
 * one per supported ordering (key name, current value, PnL %) so each sort
 * control maps to a unique column header.
 */
const COLUMNS: Array<{
	label: string;
	sortKey?: PortfolioTableSortKey;
	alignRight?: boolean;
}> = [
	{ label: 'Key', sortKey: 'key_name' },
	{ label: 'Quantity', alignRight: true },
	{ label: 'Avg buy price', alignRight: true },
	{ label: 'Current price', sortKey: 'current_value', alignRight: true },
	{ label: 'Unrealised PnL', alignRight: true },
	{ label: 'PnL %', sortKey: 'pnl_percent', alignRight: true },
];

function resolveCurrentPriceStroops(priceFields?: {
	priceStroops?: number | null;
	price?: number | null;
}): number | null {
	if (!priceFields) return null;
	const priceStroops = resolveCreatorKeyPriceStroops(priceFields);
	return priceStroops != null && priceStroops > 0 ? priceStroops : null;
}

/**
 * Wallet portfolio page (#1116).
 *
 * Shows the connected wallet's creator-key holdings in a sortable positions
 * table (key, quantity, average buy price, current price, unrealised PnL and
 * PnL %) above summary cards for the total portfolio value and total
 * unrealised PnL. Rows link through to the key detail page, and a wallet
 * without holdings sees an explicit empty state.
 */
export default function WalletPortfolioPage() {
	useDocumentTitle('Portfolio — AccessLayer');
	const { address } = useAccount();
	const navigate = useNavigate();

	const holdingsQuery = useWalletHoldings(address ?? '');
	const { data: creators = [], isLoading: areCreatorsLoading } =
		useCreatorPrices();

	const [sortKey, setSortKey] = useState<PortfolioTableSortKey>(
		'current_value'
	);
	const [sortDirection, setSortDirection] =
		useState<PortfolioTableSortDirection>(
			defaultDirectionForSortKey('current_value')
		);

	const batchItemCount = useBatchTradeStore(selectBatchItemCount);
	const openBatchDrawer = useBatchTradeStore(state => state.openDrawer);

	const heldPositions = useMemo(
		() =>
			sortHoldingsByTotalValue(
				(holdingsQuery.data ?? [])
					.map(holding => {
						const creator = creators.find(
							candidate => candidate.id === holding.creatorId
						);
						const currentPriceStroops =
							resolveCurrentPriceStroops(creator) ??
							resolveCurrentPriceStroops(holding);
						return {
							...holding,
							priceStroops: currentPriceStroops,
							price: null,
						};
					})
					.filter(holding => (holding.quantity ?? 0) > 0)
			),
		[holdingsQuery.data, creators]
	);

	const keyNames = useMemo(() => {
		const map: Record<string, string | undefined> = {};
		for (const creator of creators) {
			map[creator.id] = creator.title;
		}
		return map;
	}, [creators]);

	const rows = useMemo(
		() => buildPortfolioTableRows(heldPositions, keyNames),
		[heldPositions, keyNames]
	);

	const sortedRows = useMemo(
		() => sortPortfolioTableRows(rows, sortKey, sortDirection),
		[rows, sortKey, sortDirection]
	);

	const portfolioValue = useMemo(
		() => calculatePortfolioValue(heldPositions),
		[heldPositions]
	);
	const pnlSummary = useMemo(
		() => calculatePnLSummary(heldPositions),
		[heldPositions]
	);

	const isLoading =
		holdingsQuery.isLoading || areCreatorsLoading;

	const { isKeySplitActive: isKeySplitActiveFromHook } =
		useActiveKeySplits(address);

	const checkKeySplitActive = useCallback(
		(creatorId: string) => {
			if (isKeySplitActiveFromHook(creatorId)) return true;
			const creator = creators.find(c => c.id === creatorId);
			return Boolean(
				isSplitActive(creator?.recentSplit) ||
					isSplitActive(creator?.splitExecuted)
			);
		},
		[creators, isKeySplitActiveFromHook]
	);

	const splitHolding = useMemo(() => {
		return heldPositions.find(p => checkKeySplitActive(p.creatorId));
	}, [heldPositions, checkKeySplitActive]);

	const splitCreator = useMemo(() => {
		if (!splitHolding) return undefined;
		return creators.find(c => c.id === splitHolding.creatorId);
	}, [splitHolding, creators]);

	const handleSort = (key: PortfolioTableSortKey) => {
		if (key === sortKey) {
			setSortDirection(previous => (previous === 'asc' ? 'desc' : 'asc'));
			return;
		}
		setSortKey(key);
		setSortDirection(defaultDirectionForSortKey(key));
	};

	if (!address) {
		return (
			<main className="min-h-screen bg-[#06111f] px-6 py-16 text-white md:px-12">
				<div className="mx-auto max-w-6xl">
					<EmptyState
						icon={<Wallet className="size-10 text-amber-300" aria-hidden="true" />}
						title="No wallet connected"
						description="Connect a wallet to see your creator-key holdings, their current value, and unrealised PnL."
						ctaLabel="Browse the marketplace"
						ctaHref="/marketplace"
						data-testid="portfolio-connect-empty"
					/>
				</div>
			</main>
		);
	}

	return (
		<main
			className="min-h-screen bg-[#06111f] px-6 py-16 text-white md:px-12"
			data-testid="wallet-portfolio-page"
		>
			<div className="mx-auto max-w-6xl space-y-6">
				<div className="flex flex-wrap items-center justify-between gap-4">
					<div>
						<h1 className="font-grotesque text-2xl font-black tracking-tight">
							Portfolio
						</h1>
						<p className="mt-1 text-sm text-white/60">
							Your creator-key holdings valued at the current bonding-curve
							price.
						</p>
					</div>

					<Button
						variant="outline"
						onClick={openBatchDrawer}
						data-testid="portfolio-batch-trade-button"
						className="gap-2 rounded-xl border-amber-400/30 bg-amber-400/10 font-bold text-amber-300 hover:bg-amber-400/20 hover:border-amber-400/50"
					>
						<Layers className="size-4" aria-hidden="true" />
						Batch Trade
						{batchItemCount > 0 && (
							<span
								className="rounded-full bg-amber-400 px-1.5 py-0.2 font-mono text-[0.68rem] font-bold text-slate-950"
								data-testid="portfolio-batch-count"
							>
								{batchItemCount}
							</span>
						)}
					</Button>
				</div>

				{splitHolding && (
					<KeySplitBanner
						creator={splitCreator}
						keyId={splitHolding.creatorId}
						userAddress={address}
						holdingsCount={splitHolding.quantity ?? 0}
					/>
				)}

				{/* Summary cards (#1116) */}
				<div
					className="grid grid-cols-1 gap-4 sm:grid-cols-2"
					data-testid="portfolio-summary-cards"
				>
					<div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
						<p className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-white/40">
							Total portfolio value
						</p>
						<p
							className="mt-2 font-mono text-2xl font-bold text-white"
							data-testid="portfolio-total-value"
						>
							{isLoading ? '—' : formatPortfolioValueDisplay(portfolioValue)}
						</p>
						<p className="mt-1 text-xs text-white/45">
							{getPortfolioValueHelperText(portfolioValue)}
						</p>
					</div>

					<div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
						<p className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-white/40">
							Total unrealised PnL
						</p>
						<p
							className={cn(
								'mt-2 font-mono text-2xl font-bold',
								pnlSummary.status === 'ready'
									? getPnLToneClassName(pnlSummary.unrealisedPnL)
									: 'text-white'
							)}
							data-testid="portfolio-total-pnl"
						>
							{isLoading || pnlSummary.status !== 'ready'
								? '—'
								: formatPnLDisplay(pnlSummary.unrealisedPnL)}
						</p>
						<p
							className="mt-1 text-xs text-white/45"
							data-testid="portfolio-total-pnl-percent"
						>
							{pnlSummary.status === 'ready'
								? formatPnLPercentage(pnlSummary.pnlPercentage)
								: 'Cost basis unavailable for one or more positions.'}
						</p>
					</div>
				</div>

				<SectionErrorBoundary sectionName="portfolio positions">
					{isLoading ? (
						<div
							className="space-y-3"
							role="status"
							aria-label="Loading portfolio positions"
							data-testid="portfolio-table-skeleton"
						>
							{Array.from({ length: SKELETON_ROW_COUNT }).map((_, index) => (
								<Skeleton key={index} className="h-14 w-full" />
							))}
						</div>
					) : rows.length === 0 ? (
						<EmptyState
							icon={
								<BarChart3
									className="size-10 text-amber-300"
									aria-hidden="true"
								/>
							}
							title="No keys yet"
							description="This wallet doesn't hold any creator keys. Browse the marketplace to pick some up."
							ctaLabel="Browse the marketplace"
							ctaHref="/marketplace"
							data-testid="portfolio-positions-empty"
						/>
					) : (
						<div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.02]">
							<table
								className="w-full min-w-[48rem] text-left text-sm"
								data-testid="portfolio-positions-table"
							>
								<thead>
									<tr className="border-b border-white/10 text-[0.65rem] uppercase tracking-[0.18em] text-white/40">
										{COLUMNS.map(column => {
										const isActive =
											column.sortKey != null &&
											column.sortKey === sortKey;
										return (
											<th
												key={column.label}
												scope="col"
												aria-sort={
													column.sortKey == null
														? undefined
														: isActive
															? sortDirection === 'asc'
																? 'ascending'
																: 'descending'
															: 'none'
												}
												className={cn(
													'py-3 pr-4 font-bold',
													column.alignRight && 'text-right'
												)}
											>
												{column.sortKey ? (
													<button
														type="button"
														data-testid={`portfolio-sort-${column.sortKey}`}
														onClick={() => handleSort(column.sortKey!)}
														className={cn(
															'inline-flex items-center gap-1 uppercase tracking-[0.18em] transition-colors hover:text-white',
															isActive && 'text-amber-300'
														)}
													>
														{column.label}
														{isActive && (
															<span aria-hidden="true">
																{sortDirection === 'asc' ? '↑' : '↓'}
															</span>
														)}
													</button>
												) : (
													column.label
												)}
											</th>
										);
									})}
									</tr>
								</thead>
								<tbody>
									{sortedRows.map(row => {
										const isLoadingRow = row.pnl.status === 'loading';
										const isUnavailable = row.pnl.status === 'unavailable';
										const displayPnL =
											row.pnl.unrealisedPnLStroops == null
												? '—'
												: formatPnLDisplay(row.pnl.unrealisedPnLStroops);
										const displayPnLPercent =
											row.pnl.pnlPercentage == null
												? '—'
												: formatPnLPercentage(row.pnl.pnlPercentage);

										return (
											<tr
												key={row.creatorId}
												data-testid="portfolio-position-row"
												data-key-id={row.creatorId}
												onClick={() => navigate(`/creator/${row.creatorId}`)}
												className="cursor-pointer border-b border-white/5 transition-colors hover:bg-white/[0.04]"
											>
												<td className="py-3 pr-4">
													<div className="flex items-center gap-2">
														<Link
															to={`/creator/${row.creatorId}`}
															className="font-semibold text-white hover:text-amber-300"
															onClick={event => event.stopPropagation()}
														>
															{row.keyName}
														</Link>
														{checkKeySplitActive(row.creatorId) && (
															<SplitAppliedBadge />
														)}
													</div>
												</td>
												<td className="py-3 pr-4 text-right font-mono text-white/80">
													{row.pnl.quantity}
												</td>
												<td className="py-3 pr-4 text-right font-mono text-white/80">
													{isLoadingRow
														? '—'
														: formatDisplayKeyPrice(
																row.pnl.averagePurchasePriceStroops
															)}
												</td>
												<td
													className="py-3 pr-4 text-right font-mono text-white"
													data-testid="portfolio-row-current-price"
												>
													{isLoadingRow || isUnavailable
														? '—'
														: formatDisplayKeyPrice(
																row.pnl.currentPriceStroops
															)}
												</td>
												<td
													className={cn(
														'py-3 pr-4 text-right font-mono font-semibold',
														row.pnl.unrealisedPnLStroops == null
															? 'text-white/50'
															: getPnLToneClassName(
																	row.pnl.unrealisedPnLStroops
																)
													)}
													data-testid="portfolio-row-pnl"
												>
													{displayPnL}
												</td>
												<td
													className={cn(
														'py-3 pr-4 text-right font-mono font-semibold',
														row.pnl.pnlPercentage == null
															? 'text-white/50'
															: getPnLToneClassName(
																	row.pnl.pnlPercentage
																)
													)}
													data-testid="portfolio-row-pnl-percent"
												>
													{displayPnLPercent}
												</td>
											</tr>
										);
									})}
								</tbody>
							</table>
						</div>
					)}
				</SectionErrorBoundary>

				<SectionErrorBoundary sectionName="badge progress">
					<BadgeProgressTracker wallet={address} className="mt-10" />
				</SectionErrorBoundary>
			</div>
		</main>
	);
}
