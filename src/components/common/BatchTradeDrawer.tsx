/**
 * BatchTradeDrawer (#1155)
 *
 * Slide-in panel allowing users to manage queued batch trade orders.
 * Each item provides amount editing, direction toggling, and per-item
 * slippage tolerance controls.
 *
 * The bottom summary displays the aggregated total estimated cost and
 * combined price impact across all queued orders.
 *
 * Submitting fires the atomic `batch_swap` contract call and triggers
 * the `BatchSwapExecuted` toast on confirmation.
 */

import React, { useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Layers, Trash2, X, ArrowDownUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import CreatorInitialsAvatar from '@/components/common/CreatorInitialsAvatar';
import {
	useBatchTradeStore,
	selectBatchHasItems,
	selectBatchItemCount,
	selectBatchIsOpen,
} from '@/hooks/useBatchTradeStore';
import { useBatchSwapMutation } from '@/hooks/useBatchSwap';
import {
	estimateBatchItemCost,
	sumBatchTotalCostStroops,
	computeBatchPriceImpactSummary,
} from '@/utils/batchTrade.utils';
import { formatDisplayKeyPrice } from '@/utils/keyPriceDisplay.utils';
import { formatPriceImpact } from '@/utils/priceImpact.utils';
import { BUY_QUANTITY_BOUNDS } from '@/constants/fees';
import { SLIPPAGE_TOLERANCE_BOUNDS, SLIPPAGE_TOLERANCE_PRESETS } from '@/utils/slippageTolerance.utils';
import { useShallow } from 'zustand/react/shallow';

export interface BatchTradeDrawerProps {
	open?: boolean;
	onClose?: () => void;
}

export const BatchTradeDrawer: React.FC<BatchTradeDrawerProps> = ({
	open: controlledOpen,
	onClose: controlledOnClose,
}) => {
	const storeOpen = useBatchTradeStore(selectBatchIsOpen);
	const storeClose = useBatchTradeStore(state => state.closeDrawer);

	const isDrawerOpen = controlledOpen !== undefined ? controlledOpen : storeOpen;
	const handleClose = controlledOnClose ?? storeClose;

	const {
		items,
		updateAmount,
		updateDirection,
		updateSlippage,
		removeItem,
		clearBatch,
	} = useBatchTradeStore(
		useShallow(s => ({
			items: s.items,
			updateAmount: s.updateAmount,
			updateDirection: s.updateDirection,
			updateSlippage: s.updateSlippage,
			removeItem: s.removeItem,
			clearBatch: s.clearBatch,
		}))
	);

	const hasItems = useBatchTradeStore(selectBatchHasItems);
	const itemCount = useBatchTradeStore(selectBatchItemCount);

	const batchSwapMutation = useBatchSwapMutation();
	const isSubmitting = batchSwapMutation.isPending;

	const costSummary = sumBatchTotalCostStroops(items);
	const impactSummary = computeBatchPriceImpactSummary(items);

	const handleAmountChange = useCallback(
		(keyId: string, rawValue: string) => {
			const parsed = Number(rawValue);
			if (!Number.isFinite(parsed)) return;
			updateAmount(keyId, parsed);
		},
		[updateAmount]
	);

	const handleSlippageChange = useCallback(
		(keyId: string, rawValue: string) => {
			const parsed = Number(rawValue);
			if (!Number.isFinite(parsed)) return;
			updateSlippage(keyId, parsed);
		},
		[updateSlippage]
	);

	const handleSubmit = () => {
		if (!hasItems || isSubmitting) return;
		batchSwapMutation.mutate();
	};

	return (
		<AnimatePresence>
			{isDrawerOpen && (
				<>
					{/* Backdrop */}
					<motion.div
						key="batch-trade-backdrop"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.2 }}
						className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
						aria-hidden="true"
						onClick={handleClose}
					/>

					{/* Drawer Panel */}
					<motion.aside
						key="batch-trade-panel"
						role="dialog"
						aria-label="Batch Trade"
						aria-modal="true"
						initial={{ x: '100%' }}
						animate={{ x: 0 }}
						exit={{ x: '100%' }}
						transition={{ type: 'spring', stiffness: 300, damping: 30 }}
						className={cn(
							'fixed right-0 top-0 z-50 flex h-full w-full flex-col',
							'bg-slate-900 shadow-2xl sm:max-w-md',
							'border-l border-white/10'
						)}
					>
						{/* Header */}
						<div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
							<div className="flex items-center gap-2">
								<Layers className="size-5 text-amber-400" aria-hidden="true" />
								<h2 className="text-base font-bold text-white">Batch Trade</h2>
								{itemCount > 0 && (
									<span
										className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-semibold text-amber-300"
										aria-label={`${itemCount} trade${itemCount !== 1 ? 's' : ''} in batch`}
										data-testid="batch-item-count-badge"
									>
										{itemCount}
									</span>
								)}
							</div>

							<div className="flex items-center gap-2">
								{hasItems && (
									<Button
										variant="ghost"
										size="xs"
										onClick={clearBatch}
										className="text-white/40 hover:text-red-400"
										data-testid="batch-clear-all"
									>
										Clear all
									</Button>
								)}
								<button
									type="button"
									onClick={handleClose}
									aria-label="Close batch trade drawer"
									className={cn(
										'flex size-8 items-center justify-center rounded-full text-white/50',
										'transition-colors hover:bg-white/10 hover:text-white',
										'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60'
									)}
								>
									<X className="size-4" aria-hidden="true" />
								</button>
							</div>
						</div>

						{/* Item List */}
						<ScrollArea className="min-h-0 flex-1">
							<AnimatePresence initial={false}>
								{!hasItems ? (
									<motion.div
										key="empty"
										initial={{ opacity: 0 }}
										animate={{ opacity: 1 }}
										exit={{ opacity: 0 }}
										className="flex flex-col items-center justify-center gap-3 py-16 text-center px-6"
									>
										<div className="flex size-14 items-center justify-center rounded-full bg-white/[0.04] text-white/30 border border-white/10">
											<Layers className="size-7" aria-hidden="true" />
										</div>
										<p className="text-sm font-semibold text-white/60">
											Your batch trade queue is empty
										</p>
										<p className="max-w-[18rem] text-xs text-white/40">
											Use{' '}
											<span className="font-semibold text-amber-400/80">
												Add to Batch
											</span>{' '}
											on discovery or creator key pages to queue multiple buy
											or sell trades into a single atomic transaction.
										</p>
									</motion.div>
								) : (
									<ul
										className="divide-y divide-white/[0.06] px-5"
										aria-label="Batch trade items"
										data-testid="batch-items-list"
									>
										{items.map(item => {
											const isBuy = item.direction === 'buy';
											const cost = estimateBatchItemCost(item);

											return (
												<motion.li
													key={item.keyId}
													layout
													initial={{ opacity: 0, y: -8 }}
													animate={{ opacity: 1, y: 0 }}
													exit={{ opacity: 0, height: 0, marginBottom: 0 }}
													transition={{ duration: 0.2 }}
													className="py-4 space-y-3"
													data-testid="batch-trade-item"
													data-key-id={item.keyId}
												>
													{/* Row 1: Avatar, Name, Direction Switch, Remove */}
													<div className="flex items-center justify-between gap-3">
														<div className="flex items-center gap-2.5 min-w-0">
															<div className="size-8 shrink-0 overflow-hidden rounded-full border border-white/10 bg-slate-800">
																<CreatorInitialsAvatar
																	name={item.keyName}
																	creatorId={item.keyId}
																	imageSrc={item.thumbnail}
																	className="size-full text-xs font-bold"
																/>
															</div>
															<div className="min-w-0">
																<p
																	className="truncate text-sm font-bold text-white"
																	title={item.keyName}
																	data-testid="batch-item-name"
																>
																	{item.keyName}
																</p>
																<p className="text-[0.7rem] text-white/45">
																	Key price: {formatDisplayKeyPrice(item.priceStroops)}
																</p>
															</div>
														</div>

														<div className="flex items-center gap-1.5 shrink-0">
															{/* Direction toggle */}
															<div
																className="flex items-center rounded-lg border border-white/10 bg-black/30 p-0.5"
																role="radiogroup"
																aria-label={`Trade side for ${item.keyName}`}
																data-testid="batch-item-direction"
															>
																<button
																	type="button"
																	role="radio"
																	aria-checked={isBuy}
																	disabled={isSubmitting}
																	onClick={() => updateDirection(item.keyId, 'buy')}
																	className={cn(
																		'rounded px-1.5 py-0.5 text-[0.68rem] font-bold uppercase transition-colors',
																		isBuy
																			? 'bg-emerald-500/20 text-emerald-300'
																			: 'text-white/40 hover:text-white'
																	)}
																>
																	Buy
																</button>
																<button
																	type="button"
																	role="radio"
																	aria-checked={!isBuy}
																	disabled={isSubmitting}
																	onClick={() => updateDirection(item.keyId, 'sell')}
																	className={cn(
																		'rounded px-1.5 py-0.5 text-[0.68rem] font-bold uppercase transition-colors',
																		!isBuy
																			? 'bg-amber-500/20 text-amber-300'
																			: 'text-white/40 hover:text-white'
																	)}
																>
																	Sell
																</button>
															</div>

															{/* Remove Button */}
															<button
																type="button"
																onClick={() => removeItem(item.keyId)}
																aria-label={`Remove ${item.keyName} from batch`}
																data-testid="batch-item-remove"
																className={cn(
																	'flex size-7 items-center justify-center rounded-md text-white/30',
																	'transition-colors hover:bg-red-500/10 hover:text-red-400',
																	'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/60'
																)}
															>
																<Trash2 className="size-3.5" aria-hidden="true" />
															</button>
														</div>
													</div>

													{/* Row 2: Inputs for Quantity and Per-Item Slippage Tolerance */}
													<div className="grid grid-cols-2 gap-3 rounded-xl bg-white/[0.03] p-2.5 border border-white/5">
														{/* Amount Input */}
														<div>
															<label
																htmlFor={`batch-qty-${item.keyId}`}
																className="block text-[0.68rem] font-medium text-white/50 mb-1"
															>
																Quantity
															</label>
															<input
																id={`batch-qty-${item.keyId}`}
																type="number"
																inputMode="numeric"
																min={BUY_QUANTITY_BOUNDS.MIN_QTY}
																max={BUY_QUANTITY_BOUNDS.MAX_QTY}
																value={item.amount}
																disabled={isSubmitting}
																onChange={e =>
																	handleAmountChange(item.keyId, e.target.value)
																}
																data-testid="batch-item-amount"
																className={cn(
																	'w-full rounded-lg border border-white/10 bg-slate-900/90 px-2 py-1 text-center font-mono text-xs font-semibold tabular-nums text-white outline-none transition-colors',
																	'focus:border-amber-400/50 focus:ring-1 focus:ring-amber-400/20',
																	'disabled:opacity-40'
																)}
															/>
														</div>

														{/* Per-item Slippage Tolerance Input */}
														<div>
															<div className="flex items-center justify-between mb-1">
																<label
																	htmlFor={`batch-slip-${item.keyId}`}
																	className="block text-[0.68rem] font-medium text-white/50"
																>
																	Slippage (%)
																</label>
																<div className="flex gap-1">
																	{SLIPPAGE_TOLERANCE_PRESETS.map(preset => (
																		<button
																			key={preset}
																			type="button"
																			onClick={() =>
																				updateSlippage(item.keyId, preset)
																			}
																			className={cn(
																				'text-[0.62rem] px-1 rounded transition-colors',
																				item.slippageTolerance === preset
																					? 'bg-amber-400/30 text-amber-300 font-bold'
																					: 'text-white/40 hover:text-white'
																			)}
																		>
																			{preset}%
																		</button>
																	))}
																</div>
															</div>

															<div className="relative">
																<input
																	id={`batch-slip-${item.keyId}`}
																	type="number"
																	step="0.1"
																	min={SLIPPAGE_TOLERANCE_BOUNDS.MIN_PERCENT}
																	max={SLIPPAGE_TOLERANCE_BOUNDS.MAX_PERCENT}
																	value={item.slippageTolerance}
																	disabled={isSubmitting}
																	onChange={e =>
																		handleSlippageChange(item.keyId, e.target.value)
																	}
																	aria-label={`Slippage tolerance for ${item.keyName}`}
																	data-testid="batch-item-slippage"
																	className={cn(
																		'w-full rounded-lg border border-white/10 bg-slate-900/90 px-2 py-1 pr-6 text-center font-mono text-xs font-semibold tabular-nums text-white outline-none transition-colors',
																		'focus:border-amber-400/50 focus:ring-1 focus:ring-amber-400/20',
																		'disabled:opacity-40'
																	)}
																/>
																<span className="absolute right-2 top-1 text-xs text-white/40 pointer-events-none">
																	%
																</span>
															</div>
														</div>
													</div>

													{/* Row 3: Estimated Cost / Proceeds */}
													<div className="flex items-center justify-between text-xs px-1">
														<span className="text-white/45">
															{isBuy ? 'Estimated Cost' : 'Estimated Proceeds'}
														</span>
														<span
															className="font-mono font-semibold text-white/80 tabular-nums"
															data-testid="batch-item-cost"
														>
															≈ {formatDisplayKeyPrice(cost.netCostStroops)}
														</span>
													</div>
												</motion.li>
											);
										})}
									</ul>
								)}
							</AnimatePresence>
						</ScrollArea>

						{/* Footer — Aggregated Total Cost and Combined Price Impact */}
						<div className="border-t border-white/10 px-5 py-4 space-y-3 bg-slate-900/80 backdrop-blur-md">
							{hasItems && (
								<div className="space-y-1.5">
									<div
										className="flex items-center justify-between"
										aria-live="polite"
										aria-atomic="true"
									>
										<span className="text-sm font-medium text-white/60">
											Total estimated cost
										</span>
										<span
											className="font-mono text-base font-bold tabular-nums text-amber-300"
											data-testid="batch-total-cost"
										>
											{formatDisplayKeyPrice(costSummary.totalEstimatedCostStroops)}
										</span>
									</div>

									{costSummary.totalBuyCostStroops > 0 &&
										costSummary.totalSellProceedsStroops > 0 && (
											<div className="flex items-center justify-between text-[0.7rem] text-white/40 font-mono">
												<span>
													Buys: {formatDisplayKeyPrice(costSummary.totalBuyCostStroops)} · Sells:{' '}
													{formatDisplayKeyPrice(costSummary.totalSellProceedsStroops)}
												</span>
												<span>
													Net: {formatDisplayKeyPrice(Math.abs(costSummary.netCostStroops))}
												</span>
											</div>
										)}
								</div>
							)}

							{hasItems && impactSummary && (
								<div
									className="flex items-center justify-between text-xs"
									data-testid="batch-price-impact"
								>
									<span className="text-white/50">Combined price impact</span>
									<span
										className={cn(
											'font-mono font-semibold tabular-nums',
											Math.abs(impactSummary.totalImpactPercent) > 5
												? 'text-amber-400'
												: 'text-white/70'
										)}
									>
										{formatPriceImpact(impactSummary.totalImpactPercent)}
									</span>
								</div>
							)}

							<Button
								onClick={handleSubmit}
								disabled={!hasItems || isSubmitting}
								className="w-full rounded-xl font-bold bg-amber-400 text-slate-950 hover:bg-amber-300 shadow-lg shadow-amber-500/10"
								aria-label={
									hasItems
										? `Submit batch trade of ${itemCount} order${itemCount !== 1 ? 's' : ''}`
										: 'Add trades to batch to continue'
								}
								data-testid="batch-submit-button"
							>
								{isSubmitting ? (
									<span className="inline-flex items-center gap-2">
										<ArrowDownUp className="size-4 animate-spin" />
										Submitting…
									</span>
								) : (
									`Submit Batch (${itemCount})`
								)}
							</Button>
						</div>
					</motion.aside>
				</>
			)}
		</AnimatePresence>
	);
};

export default BatchTradeDrawer;
