import React from 'react';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { StableButtonContent } from '@/components/ui/stable-button-content';
import { formatNumber } from '@/utils/numberFormat.utils';
import { formatDisplayKeyPrice } from '@/utils/keyPriceDisplay.utils';
import PriceImpactWarning from '@/components/common/PriceImpactWarning';
import { isHighPriceImpact } from '@/utils/priceImpact.utils';
import { ShieldCheck, ArrowRight, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TradeConfirmationModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	side: 'buy' | 'sell';
	creatorName: string;
	amount: number;
	unitPriceStroops?: number | null;
	totalStroops?: number | null;
	slippageTolerancePercent: number;
	maxPriceStroops?: number | null;
	minPriceStroops?: number | null;
	priceImpactPercent?: number | null;
	onConfirm: () => Promise<void> | void;
	onCancel?: () => void;
	isSubmitting?: boolean;
}

/**
 * Trade confirmation modal showing max_price/min_price bounds and slippage
 * protection controls before transaction submission (#919).
 */
export const TradeConfirmationModal: React.FC<TradeConfirmationModalProps> = ({
	open,
	onOpenChange,
	side,
	creatorName,
	amount,
	unitPriceStroops,
	totalStroops,
	slippageTolerancePercent,
	maxPriceStroops,
	minPriceStroops,
	priceImpactPercent,
	onConfirm,
	onCancel,
	isSubmitting = false,
}) => {
	const isBuy = side === 'buy';
	const title = isBuy ? 'Confirm Buy Order' : 'Confirm Sell Order';
	const confirmButtonLabel = isBuy ? 'Confirm Buy' : 'Confirm Sell';

	const handleCancel = () => {
		if (isSubmitting) return;
		if (onCancel) {
			onCancel();
		} else {
			onOpenChange(false);
		}
	};

	return (
		<Dialog
			open={open}
			onOpenChange={next => !isSubmitting && onOpenChange(next)}
		>
			<DialogContent
				className="max-w-md border-white/10 bg-[#0b1728] text-white p-6"
				showCloseButton={!isSubmitting}
				showEscapeHint={!isSubmitting}
				onEscapeKeyDown={event => {
					if (isSubmitting) event.preventDefault();
				}}
				onInteractOutside={event => {
					if (isSubmitting) event.preventDefault();
				}}
				data-testid="trade-confirmation-modal"
			>
				<DialogHeader className="space-y-1.5 text-left">
					<div className="flex items-center gap-2">
						<span
							className={cn(
								'rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
								isBuy
									? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
									: 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
							)}
							data-testid="confirmation-modal-side-badge"
						>
							{side}
						</span>
						<DialogTitle
							className="text-lg font-bold"
							data-testid="trade-confirmation-modal-title"
						>
							{title}
						</DialogTitle>
					</div>
					<DialogDescription className="text-xs text-white/60">
						Please review your order details and slippage price bounds
						before submission.
					</DialogDescription>
				</DialogHeader>

				<div className="mt-4 space-y-4">
					{/* Trade Overview */}
					<div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
						<div className="flex items-center justify-between text-sm">
							<span className="text-white/60">Creator</span>
							<span className="font-semibold text-white">
								{creatorName}
							</span>
						</div>
						<div className="flex items-center justify-between text-sm">
							<span className="text-white/60">Quantity</span>
							<span
								className="font-mono font-semibold text-white"
								data-testid="confirmation-modal-amount"
							>
								{formatNumber(amount)} {amount === 1 ? 'key' : 'keys'}
							</span>
						</div>
						{unitPriceStroops != null && (
							<div className="flex items-center justify-between text-sm">
								<span className="text-white/60">Unit Price</span>
								<span className="font-mono text-white/90">
									{formatDisplayKeyPrice(unitPriceStroops)}
								</span>
							</div>
						)}
						{totalStroops != null && (
							<div className="flex items-center justify-between border-t border-white/5 pt-2 text-sm">
								<span className="text-white/70 font-medium">
									{isBuy ? 'Estimated Total' : 'Estimated Proceeds'}
								</span>
								<span
									className="font-mono text-base font-bold text-amber-300"
									data-testid="confirmation-modal-total"
								>
									{formatDisplayKeyPrice(totalStroops)}
								</span>
							</div>
						)}
					</div>

					{/* Slippage Protection Bounds */}
					<div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.05] p-4 space-y-3">
						<div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-amber-300">
							<ShieldCheck className="h-4 w-4 text-amber-400" />
							<span>Slippage Protection Controls</span>
						</div>

						<div className="flex items-center justify-between text-sm">
							<span className="text-white/70">Tolerance Setting</span>
							<span
								className="font-mono font-bold text-amber-300"
								data-testid="confirmation-modal-slippage"
							>
								{slippageTolerancePercent}%
							</span>
						</div>

						{isBuy && maxPriceStroops != null && (
							<div className="flex items-center justify-between text-sm border-t border-amber-500/10 pt-2">
								<div className="flex items-center gap-1 text-white/80">
									<span className="font-medium">
										Maximum Price (max_price)
									</span>
								</div>
								<span
									className="font-mono font-bold text-amber-300 text-sm"
									data-testid="confirmation-modal-max-price"
								>
									{formatDisplayKeyPrice(maxPriceStroops)}
								</span>
							</div>
						)}

						{!isBuy && minPriceStroops != null && (
							<div className="flex items-center justify-between text-sm border-t border-amber-500/10 pt-2">
								<div className="flex items-center gap-1 text-white/80">
									<span className="font-medium">
										Minimum Price (min_price)
									</span>
								</div>
								<span
									className="font-mono font-bold text-amber-300 text-sm"
									data-testid="confirmation-modal-min-price"
								>
									{formatDisplayKeyPrice(minPriceStroops)}
								</span>
							</div>
						)}

						<div className="flex items-start gap-1.5 text-[11px] text-white/50">
							<Info className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-400/70" />
							<p>
								{isBuy
									? `Your transaction will revert if the total cost exceeds ${formatDisplayKeyPrice(
											maxPriceStroops
										)}.`
									: `Your transaction will revert if the total proceeds fall below ${formatDisplayKeyPrice(
											minPriceStroops
										)}.`}
							</p>
						</div>
					</div>

					{/* Price Impact Warning if exceeds 5% */}
					{priceImpactPercent != null &&
						isHighPriceImpact(priceImpactPercent) && (
							<div data-testid="confirmation-modal-impact-warning">
								<PriceImpactWarning
									impactPercent={priceImpactPercent}
								/>
							</div>
						)}
				</div>

				<DialogFooter className="mt-6 flex flex-row items-center justify-between gap-3 sm:justify-between">
					<Button
						type="button"
						variant="ghost"
						onClick={handleCancel}
						disabled={isSubmitting}
						data-testid="confirmation-modal-cancel"
						className="text-white/70 hover:text-white"
					>
						Back
					</Button>
					<Button
						type="button"
						onClick={onConfirm}
						disabled={isSubmitting}
						aria-busy={isSubmitting || undefined}
						data-testid="confirmation-modal-confirm"
						className={cn(
							'font-semibold',
							isBuy
								? 'bg-amber-400 hover:bg-amber-300 text-slate-950'
								: 'bg-rose-500 hover:bg-rose-400 text-white'
						)}
					>
						<StableButtonContent
							isLoading={isSubmitting}
							loadingLabel="Submitting…"
						>
							<span className="flex items-center gap-1.5">
								{confirmButtonLabel}
								<ArrowRight className="h-4 w-4" />
							</span>
						</StableButtonContent>
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};

export default TradeConfirmationModal;
