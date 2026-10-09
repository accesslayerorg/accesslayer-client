/**
 * BatchBuyConfirmDialog (#954)
 *
 * Confirmation modal shown before the user submits a batch buy transaction.
 * Displays:
 *  - Full list of creators with quantity, unit price, and per-item max_price
 *    (after slippage).
 *  - A slippage tolerance slider / input so users can tune per-key max_price.
 *  - Total estimated cost and worst-case (slippage-inclusive) total.
 *  - Network fee hint.
 *  - Cancel / Confirm Buy buttons — Confirm triggers the transaction flow.
 *
 * After the dialog is submitted the parent component handles the actual
 * simulated transaction and surfaces success/failure state.
 */

import { useId, useMemo } from 'react';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
	DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { StableButtonContent } from '@/components/ui/stable-button-content';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip } from '@/components/ui/tooltip';
import CreatorInitialsAvatar from '@/components/common/CreatorInitialsAvatar';
import NetworkFeeHint from '@/components/common/NetworkFeeHint';
import { cn } from '@/lib/utils';
import {
	useBatchBuyStore,
	selectTotalCostStroops,
	selectMaxTotalCostStroops,
	deriveMaxPriceStroops,
} from '@/hooks/useBatchBuyStore';
import { formatDisplayKeyPrice } from '@/utils/keyPriceDisplay.utils';
import { formatTransactionFeeDisplay } from '@/utils/transactionFee.utils';
import { BATCH_BUY, TRADE_FEE_ESTIMATE } from '@/constants/fees';
import { useShallow } from 'zustand/react/shallow';
import { Info, ShieldCheck } from 'lucide-react';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface BatchBuyConfirmDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onConfirm: () => void;
	isSubmitting?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const BatchBuyConfirmDialog: React.FC<BatchBuyConfirmDialogProps> = ({
	open,
	onOpenChange,
	onConfirm,
	isSubmitting = false,
}) => {
	const slippageInputId = useId();

	const { items, slippageBps, setSlippageBps } = useBatchBuyStore(
		useShallow(s => ({
			items: s.items,
			slippageBps: s.slippageBps,
			setSlippageBps: s.setSlippageBps,
		}))
	);

	const totalStroops = useBatchBuyStore(selectTotalCostStroops);
	const maxTotalStroops = useBatchBuyStore(selectMaxTotalCostStroops);

	const slippagePercent = (slippageBps / 100).toFixed(1);

	// Slippage percentage displayed as a decimal for the range input (0–5%).
	const slippageDecimalMax = BATCH_BUY.MAX_SLIPPAGE_BPS / 100;

	const estimatedFee = formatTransactionFeeDisplay(
		TRADE_FEE_ESTIMATE.DEFAULT_NETWORK_FEE,
		{ unit: TRADE_FEE_ESTIMATE.UNIT }
	);

	// Only let the dialog dismiss when not mid-submit.
	const handleOpenChange = (next: boolean) => {
		if (!isSubmitting) onOpenChange(next);
	};

	// Slippage input: accept a decimal string like "1.5" and convert to bps.
	const handleSlippageChange = (raw: string) => {
		const parsed = parseFloat(raw);
		if (!Number.isFinite(parsed)) return;
		const bps = Math.round(parsed * 100);
		setSlippageBps(bps);
	};

	const itemRows = useMemo(
		() =>
			items.map(item => {
				const itemTotal = item.priceStroops * item.quantity;
				const maxPerKey = deriveMaxPriceStroops(
					item.priceStroops,
					slippageBps
				);
				const maxItemTotal = maxPerKey * item.quantity;
				return { ...item, itemTotal, maxPerKey, maxItemTotal };
			}),
		[items, slippageBps]
	);

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent
				className="max-w-lg"
				showCloseButton={!isSubmitting}
				showEscapeHint={!isSubmitting}
				onEscapeKeyDown={e => {
					if (isSubmitting) e.preventDefault();
				}}
				onInteractOutside={e => {
					if (isSubmitting) e.preventDefault();
				}}
			>
				<DialogHeader>
					<DialogTitle>Confirm batch purchase</DialogTitle>
					<DialogDescription>
						Review all keys and costs before submitting. A single
						transaction will purchase all items below.
					</DialogDescription>
				</DialogHeader>

				{/* Item table */}
				<ScrollArea className="max-h-60 pr-1">
					<table className="w-full text-sm" aria-label="Batch order summary">
						<thead>
							<tr className="text-left text-xs text-white/40">
								<th scope="col" className="pb-2 font-medium">
									Creator
								</th>
								<th
									scope="col"
									className="pb-2 text-right font-medium"
								>
									Qty
								</th>
								<th
									scope="col"
									className="pb-2 text-right font-medium"
								>
									Subtotal
								</th>
								<th
									scope="col"
									className="pb-2 text-right font-medium"
								>
									<span className="inline-flex items-center gap-1">
										Max
										<Tooltip
											content={
												<p className="max-w-[18rem] text-xs">
													Max price per key including{' '}
													{slippagePercent}% slippage
													tolerance. The contract rejects
													the transaction if the on-chain
													price exceeds this value.
												</p>
											}
										>
											<Info className="size-3 cursor-help text-white/40" />
										</Tooltip>
									</span>
								</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-white/[0.06]">
							{itemRows.map(row => (
								<tr key={row.creatorId}>
									<td className="py-2.5">
										<div className="flex items-center gap-2">
											<div className="size-7 shrink-0 overflow-hidden rounded-lg">
												<CreatorInitialsAvatar
													name={row.creatorName}
													creatorId={row.creatorId}
													imageSrc={row.thumbnail}
												/>
											</div>
											<span
												className="max-w-[10rem] truncate text-white/80"
												title={row.creatorName}
											>
												{row.creatorName}
											</span>
										</div>
									</td>
									<td className="py-2.5 text-right tabular-nums text-white/60">
										{row.quantity}
									</td>
									<td className="py-2.5 text-right tabular-nums text-amber-300/90">
										{formatDisplayKeyPrice(row.itemTotal)}
									</td>
									<td className="py-2.5 text-right tabular-nums text-white/50">
										{formatDisplayKeyPrice(row.maxItemTotal)}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</ScrollArea>

				{/* Slippage control */}
				<div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 space-y-2">
					<div className="flex items-center justify-between">
						<label
							htmlFor={slippageInputId}
							className="flex items-center gap-1.5 text-xs font-medium text-white/60"
						>
							<ShieldCheck
								className="size-3.5 text-amber-500/60"
								aria-hidden="true"
							/>
							Slippage tolerance
						</label>
						<span
							className="tabular-nums text-sm font-semibold text-amber-300"
							aria-live="polite"
							aria-atomic="true"
						>
							{slippagePercent}%
						</span>
					</div>
					<input
						id={slippageInputId}
						type="range"
						min={BATCH_BUY.MIN_SLIPPAGE_BPS / 100}
						max={slippageDecimalMax}
						step="0.5"
						value={slippageBps / 100}
						onChange={e => handleSlippageChange(e.target.value)}
						disabled={isSubmitting}
						aria-label={`Slippage tolerance: ${slippagePercent} percent`}
						aria-valuemin={BATCH_BUY.MIN_SLIPPAGE_BPS / 100}
						aria-valuemax={slippageDecimalMax}
						aria-valuenow={slippageBps / 100}
						className={cn(
							'h-1.5 w-full cursor-pointer appearance-none rounded-full',
							'bg-white/10 accent-amber-500',
							'disabled:cursor-not-allowed disabled:opacity-50'
						)}
					/>
					<p className="text-[0.65rem] leading-relaxed text-white/35">
						Per-key max price is set to{' '}
						<span className="font-semibold text-white/50">
							price × (1 + {slippagePercent}%)
						</span>
						. The transaction reverts if the live price exceeds this
						limit.
					</p>
				</div>

				{/* Totals summary */}
				<div className="space-y-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
					<div className="flex items-center justify-between text-sm">
						<span className="text-white/50">Estimated total</span>
						<span className="tabular-nums font-semibold text-amber-300">
							{formatDisplayKeyPrice(totalStroops)}
						</span>
					</div>
					<div className="flex items-center justify-between text-xs">
						<span className="text-white/40">
							Max total (incl. slippage)
						</span>
						<span className="tabular-nums text-white/60">
							{formatDisplayKeyPrice(maxTotalStroops)}
						</span>
					</div>
					<div className="pt-1">
						<NetworkFeeHint
							variant="text"
							fee={estimatedFee}
							className="text-white/35"
						/>
					</div>
				</div>

				<DialogFooter className="sm:justify-between">
					<Button
						type="button"
						variant="ghost"
						onClick={() => onOpenChange(false)}
						disabled={isSubmitting}
						data-testid="batch-confirm-cancel"
					>
						Cancel
					</Button>
					<Button
						type="button"
						onClick={onConfirm}
						disabled={isSubmitting}
						aria-busy={isSubmitting || undefined}
						data-testid="batch-confirm-submit"
					>
						<StableButtonContent
							isLoading={isSubmitting}
							loadingLabel="Submitting…"
						>
							<ShieldCheck className="size-4" aria-hidden="true" />
							Confirm purchase
						</StableButtonContent>
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};

export default BatchBuyConfirmDialog;
