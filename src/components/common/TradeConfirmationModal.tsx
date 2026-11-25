import React, { useEffect, useState } from 'react';
import { Link } from 'react-router';
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
import DynamicFeeBreakdown from '@/components/common/DynamicFeeBreakdown';
import SlippageToleranceSelector from '@/components/common/SlippageToleranceSelector';
import FeeImpactPreview from '@/components/fees/FeeImpactPreview';
import { usePendingFeeChange } from '@/hooks/useFeeChange';
import {
	formatPriceImpact,
	isHighPriceImpact,
	PRICE_IMPACT_THRESHOLD_PERCENT,
} from '@/utils/priceImpact.utils';
import {
	computeMaxPriceStroops,
	computeMinPriceStroops,
} from '@/utils/slippageTolerance.utils';
import type { DynamicFeeBreakdown as DynamicFeeBreakdownData } from '@/utils/dynamicFeeRate.utils';
import { ShieldCheck, ArrowRight, Info, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { validateSlippageTolerance } from '@/utils/slippage.utils';
import LargeTradeGuard from '@/components/common/LargeTradeGuard';
import { evaluateLargeTradeRules } from '@/utils/largeTradeGuard.utils';

export interface TradeConfirmationModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	side: 'buy' | 'sell';
	creatorName: string;
	amount: number;
	unitPriceStroops?: number | null;
	totalStroops?: number | null;
	feeStroops?: number | null;
	netReceivedStroops?: number | null;
	priceImpactBps?: number | null;
	slippageTolerancePercent: number;
	onSlippageChange?: (percent: number) => void;
	maxPriceStroops?: number | null;
	minPriceStroops?: number | null;
	priceImpactPercent?: number | null;
	/** Circulating supply of the key used for whale supply-percentage guard (#1480). */
	currentSupply?: number | null;
	/** Dynamic fee quote from the contract; rendered when provided (#994). */
	feeBreakdown?: DynamicFeeBreakdownData | null;
	/** True while the dynamic fee rate is being fetched from the contract. */
	feeIsLoading?: boolean;
	/** Error message when the dynamic fee rate could not be fetched. */
	feeError?: string | null;
	/** Retry callback for the dynamic fee fetch. */
	onFeeRetry?: () => void;
	onConfirm: () => Promise<void> | void;
	onCancel?: () => void;
	isSubmitting?: boolean;
	disabled?: boolean;
}

/**
 * Trade confirmation modal showing price breakdown, estimated output, price impact bps,
 * fee, net received, max_price/min_price bounds and adjustable slippage protection
 * controls before transaction submission (#919, #1112).
 */
export const TradeConfirmationModal: React.FC<TradeConfirmationModalProps> = ({
	open,
	onOpenChange,
	side,
	creatorName,
	amount,
	unitPriceStroops,
	totalStroops,
	feeStroops,
	netReceivedStroops,
	priceImpactBps,
	slippageTolerancePercent,
	onSlippageChange,
	maxPriceStroops,
	minPriceStroops,
	priceImpactPercent,
	currentSupply = null,
	feeBreakdown = null,
	feeIsLoading = false,
	feeError = null,
	onFeeRetry,
	onConfirm,
	onCancel,
	isSubmitting = false,
	disabled = false,
}) => {
	const [currentSlippage, setCurrentSlippage] = useState(
		slippageTolerancePercent
	);
	const [slippageError, setSlippageError] = useState<string | null>(null);
	const [largeTradeAcknowledged, setLargeTradeAcknowledged] = useState(false);
	const pendingFeeChange = usePendingFeeChange();

	const triggeredLargeTradeRules = evaluateLargeTradeRules({
		amount,
		unitPriceStroops,
		totalStroops,
		priceImpactPercent,
		currentSupply,
		side,
	});
	const hasLargeTradeGuard = triggeredLargeTradeRules.length > 0;

	useEffect(() => {
		if (!open) {
			setLargeTradeAcknowledged(false);
		}
	}, [open]);

	useEffect(() => {
		setCurrentSlippage(slippageTolerancePercent);
		setSlippageError(validateSlippageTolerance(slippageTolerancePercent));
	}, [slippageTolerancePercent]);

	const handleSlippageChange = (nextPercent: number) => {
		setCurrentSlippage(nextPercent);
		const err = validateSlippageTolerance(nextPercent);
		setSlippageError(err);
		onSlippageChange?.(nextPercent);
	};

	const isBuy = side === 'buy';
	const title = isBuy ? 'Confirm Buy Order' : 'Confirm Sell Order';
	const confirmButtonLabel = isBuy ? 'Confirm Buy' : 'Confirm Sell';

	const resolvedMaxPriceStroops =
		currentSlippage !== slippageTolerancePercent && totalStroops != null
			? computeMaxPriceStroops(totalStroops, currentSlippage)
			: maxPriceStroops;
	const resolvedMinPriceStroops =
		currentSlippage !== slippageTolerancePercent && totalStroops != null
			? computeMinPriceStroops(totalStroops, currentSlippage)
			: minPriceStroops;

	const resolvedFeeStroops = feeStroops ?? feeBreakdown?.totalFeeStroops ?? 0;
	const resolvedNetReceivedStroops =
		netReceivedStroops ??
		feeBreakdown?.netProceedsStroops ??
		(totalStroops != null
			? isBuy
				? totalStroops + resolvedFeeStroops
				: Math.max(0, totalStroops - resolvedFeeStroops)
			: null);
	const resolvedPriceImpactBps =
		priceImpactBps ??
		(priceImpactPercent != null
			? Math.round(Math.abs(priceImpactPercent) * 100)
			: 0);

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
							<span className="text-white/60">Input Amount</span>
							<span
								className="font-mono font-semibold text-white"
								data-testid="confirmation-modal-amount"
							>
								<span data-testid="confirmation-modal-input-amount">
									{formatNumber(amount)}{' '}
									{amount === 1 ? 'key' : 'keys'}
								</span>
							</span>
						</div>
						{(unitPriceStroops != null || totalStroops != null) && (
							<div className="flex items-center justify-between text-sm">
								<span className="text-white/60">Expected Price</span>
								<span
									className="font-mono text-white/90"
									data-testid="confirmation-modal-expected-price"
								>
									<span data-testid="expected-price">
										{formatDisplayKeyPrice(
											unitPriceStroops ?? totalStroops
										)}
									</span>
								</span>
							</div>
						)}
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
									{isBuy ? 'Estimated Total' : 'Estimated Output'}
								</span>
								<span
									className="font-mono text-base font-bold text-amber-300"
									data-testid="confirmation-modal-total"
								>
									<span data-testid="confirmation-modal-estimated-output">
										{formatDisplayKeyPrice(totalStroops)}
									</span>
								</span>
							</div>
						)}
						<div className="flex items-center justify-between text-sm">
							<span className="text-white/60">Price Impact</span>
							<span
								className="font-mono text-white/90"
								data-testid="confirmation-modal-price-impact"
							>
								<span data-testid="price-impact">
									{formatPriceImpact(priceImpactPercent ?? 0)}
								</span>{' '}
								(
								<span data-testid="confirmation-modal-price-impact-bps">
									{resolvedPriceImpactBps} bps
								</span>
								)
							</span>
						</div>
						<div className="flex items-center justify-between text-sm">
							<span className="text-white/60">Fee</span>
							<span
								className="font-mono text-white/90"
								data-testid="confirmation-modal-fee"
							>
								{formatDisplayKeyPrice(resolvedFeeStroops)}
							</span>
						</div>
						{resolvedNetReceivedStroops != null && (
							<div className="flex items-center justify-between border-t border-white/5 pt-2 text-sm">
								<span className="text-white/70 font-medium">
									Minimum Received
								</span>
								<span
									className="font-mono font-semibold text-emerald-300"
									data-testid="confirmation-modal-net-received"
								>
									<span data-testid="confirmation-modal-min-received">
										<span data-testid="minimum-received">
											{isBuy
												? `${formatNumber(amount)} ${amount === 1 ? 'key' : 'keys'} (${formatDisplayKeyPrice(resolvedNetReceivedStroops)})`
												: formatDisplayKeyPrice(
														resolvedMinPriceStroops ??
															resolvedNetReceivedStroops
													)}
										</span>
									</span>
								</span>
							</div>
						)}
					</div>

					{/* Dynamic fee breakdown (#994) — rendered whenever a fee quote
					    or its fetch state is supplied by the parent. */}
					{(feeBreakdown || feeIsLoading || feeError) && (
						<DynamicFeeBreakdown
							breakdown={feeBreakdown}
							isLoading={feeIsLoading}
							error={feeError}
							onRetry={onFeeRetry ?? (() => {})}
						/>
					)}

					{pendingFeeChange && (
						<FeeImpactPreview
							pending={pendingFeeChange}
							totalStroops={totalStroops}
						/>
					)}

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
								{currentSlippage}%
							</span>
						</div>

						<SlippageToleranceSelector
							value={currentSlippage}
							onChange={handleSlippageChange}
							disabled={isSubmitting}
						/>

						{isBuy && resolvedMaxPriceStroops != null && (
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
									{formatDisplayKeyPrice(resolvedMaxPriceStroops)}
								</span>
							</div>
						)}

						{!isBuy && resolvedMinPriceStroops != null && (
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
									{formatDisplayKeyPrice(resolvedMinPriceStroops)}
								</span>
							</div>
						)}

						<div className="flex items-start gap-1.5 text-[11px] text-white/50">
							<Info className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-400/70" />
							<p>
								{isBuy
									? `Your transaction will revert if the total cost exceeds ${formatDisplayKeyPrice(
											resolvedMaxPriceStroops
										)}.`
									: `Your transaction will revert if the total proceeds fall below ${formatDisplayKeyPrice(
											resolvedMinPriceStroops
										)}.`}
							</p>
						</div>
					</div>

					{/* High/Low Slippage Warning Banner */}
					{currentSlippage > 5 && (
						<div
							role="status"
							data-testid="slippage-high-warning"
							className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-200"
						>
							<AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-400" />
							<span data-testid="slippage-warning">
								High slippage tolerance. Your transaction may be
								frontrun or execute at an unfavorable price.
							</span>
						</div>
					)}
					{currentSlippage < 0.1 && currentSlippage >= 0.01 && (
						<div
							role="status"
							data-testid="slippage-low-warning"
							className="flex items-start gap-2 rounded-lg border border-blue-500/30 bg-blue-500/10 p-2.5 text-xs text-blue-200"
						>
							<AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-blue-400" />
							<span data-testid="slippage-warning">
								Low slippage tolerance. Your transaction may fail if the
								market price moves slightly.
							</span>
						</div>
					)}

					<Link
						to="/learn/bonding-curve"
						data-testid="trade-explainer-link"
						className="inline-block font-jakarta text-xs font-bold text-amber-300 hover:underline"
					>
						How does the price curve work?
					</Link>

					{/* Price Impact Warning if exceeds 5% */}
					{priceImpactPercent != null &&
						isHighPriceImpact(
							priceImpactPercent,
							PRICE_IMPACT_THRESHOLD_PERCENT
						) && (
							<div data-testid="confirmation-modal-impact-warning">
								<PriceImpactWarning
									impactPercent={priceImpactPercent}
									threshold={PRICE_IMPACT_THRESHOLD_PERCENT}
								/>
							</div>
						)}

					{/* Large Trade Confirmation Guard (#1480) */}
					{hasLargeTradeGuard && (
						<LargeTradeGuard
							triggeredRules={triggeredLargeTradeRules}
							amount={amount}
							unitPriceStroops={unitPriceStroops}
							totalStroops={totalStroops}
							side={side}
							creatorName={creatorName}
							onAcknowledgementChange={setLargeTradeAcknowledged}
						/>
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
						disabled={
							disabled ||
							isSubmitting ||
							slippageError != null ||
							(hasLargeTradeGuard && !largeTradeAcknowledged)
						}
						aria-busy={isSubmitting || undefined}
						data-testid="confirmation-modal-confirm"
						className={cn(
							'font-semibold',
							isBuy
								? 'bg-amber-400 hover:bg-amber-300 text-slate-950'
								: 'bg-rose-500 hover:bg-rose-400 text-white',
							(slippageError != null ||
								(hasLargeTradeGuard && !largeTradeAcknowledged)) &&
								'opacity-50 cursor-not-allowed'
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
