import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { formatNumber } from '@/utils/numberFormat.utils';
import {
	formatDisplayKeyPrice,
	estimateSellProceeds,
} from '@/utils/keyPriceDisplay.utils';
import SlippageToleranceSelector from '@/components/common/SlippageToleranceSelector';
import PriceImpactWarning from '@/components/common/PriceImpactWarning';
import PriceImpactOverrideCheckbox from '@/components/common/PriceImpactOverrideCheckbox';
import TradeConfirmationModal from '@/components/common/TradeConfirmationModal';
import LaunchPenaltyWarning from '@/components/common/LaunchPenaltyWarning';
import {
	computeSlippageBounds,
	type SlippageBounds,
} from '@/utils/slippageTolerance.utils';
import {
	calculateTradePriceImpact,
	isHighPriceImpact,
} from '@/utils/priceImpact.utils';
import { calculateLaunchPenalty } from '@/utils/launchPenalty.utils';
import {
	calculateFeeBreakdown,
	type FeeBreakdown,
} from '@/utils/pricePreview.utils';
import { BUY_QUANTITY_BOUNDS, FEE_BOUNDS } from '@/constants/fees';
import showToast from '@/utils/toast.util';
import { getSignatureErrorMessage } from '@/utils/errorHandling.utils';
import type { KeyConfig } from '@/services/course.service';
import SpreadIndicator from '@/components/common/SpreadIndicator';
import HoldingCapIndicator from '@/components/common/HoldingCapIndicator';
import { cn } from '@/lib/utils';
import { ArrowRight } from 'lucide-react';
import { useSlippageTolerancePreference } from '@/hooks/useSlippageTolerancePreference';

export interface BuySellTradeParams {
	creatorId?: string;
	side: 'buy' | 'sell';
	amount: number;
	priceStroops?: number | null;
	maxPriceStroops?: number | null;
	minPriceStroops?: number | null;
	slippageTolerancePercent: number;
	pricePreview?: FeeBreakdown | null;
}

export interface BuySellKeyFlowProps {
	creatorId?: string;
	creatorName: string;
	initialSide?: 'buy' | 'sell';
	availableHoldings?: number;
	keyPriceStroops?: number | null;
	currentSupply?: number | null;
	maxBuyQuantity?: number | null;
	/** Maximum holding cap per wallet configured by creator (#1015); null means no limit. */
	holdingCap?: number | null;
	maxHoldingCap?: number | null;
	protocolFeeBps?: number;
	creatorFeeBps?: number;
	launchPenaltyBps?: number | null;
	createdAtLedger?: number | null;
	currentLedger?: number | null;
	/** Live key trading config carrying the bid-ask spread (#951). */
	keyConfig?: KeyConfig | null;
	/** Whether the key config query is still loading. */
	isKeyConfigLoading?: boolean;
	onSubmitTrade?: (params: BuySellTradeParams) => Promise<void> | void;
	onSuccess?: (params: BuySellTradeParams) => void;
	onError?: (error: unknown) => void;
	isSubmitting?: boolean;
	className?: string;
}

/**
 * Complete Buy & Sell Key Flow with slippage protection controls (#919).
 * Includes:
 * - Buy/sell input panel with amount field and max button
 * - Slippage tolerance selector (0.5%, 1%, 2%, custom)
 * - Price impact warning when impact exceeds threshold (5%)
 * - Confirmation modal showing max_price/min_price before submission
 * - Transaction status feedback (toasts for loading, success, error)
 */
export const BuySellKeyFlow: React.FC<BuySellKeyFlowProps> = ({
	creatorId = '1',
	creatorName,
	initialSide = 'buy',
	availableHoldings = 0,
	keyPriceStroops,
	currentSupply = 0,
	maxBuyQuantity = null,
	holdingCap = null,
	maxHoldingCap = null,
	protocolFeeBps = FEE_BOUNDS.DEFAULT_FEE_BPS,
	creatorFeeBps = FEE_BOUNDS.DEFAULT_FEE_BPS,
	launchPenaltyBps,
	createdAtLedger,
	currentLedger,
	keyConfig,
	isKeyConfigLoading = false,
	onSubmitTrade,
	onSuccess,
	onError,
	isSubmitting: externalIsSubmitting = false,
	className,
}) => {
	const effectiveHoldingCap = useMemo(
		() =>
			holdingCap ??
			maxHoldingCap ??
			keyConfig?.holdingCap ??
			keyConfig?.maxHoldingCap ??
			null,
		[holdingCap, maxHoldingCap, keyConfig?.holdingCap, keyConfig?.maxHoldingCap]
	);
	const [side, setSide] = useState<'buy' | 'sell'>(initialSide);
	const [amountText, setAmountText] = useState('1');
	const [touched, setTouched] = useState(false);
	const [slippageTolerancePercent, setSlippageTolerancePercent] =
		useSlippageTolerancePreference();
	const [acknowledgedImpactKey, setAcknowledgedImpactKey] = useState<
		string | null
	>(null);
	const [confirmationOpen, setConfirmationOpen] = useState(false);
	const [internalSubmitting, setInternalSubmitting] = useState(false);

	const isSubmitting = externalIsSubmitting || internalSubmitting;

	const parsedAmount = useMemo(() => {
		const trimmed = amountText.trim();
		if (!trimmed) return NaN;
		return Number(trimmed);
	}, [amountText]);

	const validationError = useMemo((): string | null => {
		const trimmed = amountText.trim();
		if (!trimmed) return 'Please enter an amount.';
		if (!Number.isFinite(parsedAmount))
			return 'Amount must be a valid number.';
		if (parsedAmount <= 0) return 'Amount must be greater than zero.';
		if (!Number.isInteger(parsedAmount))
			return 'Amount must be a whole number.';

		if (
			side === 'buy' &&
			maxBuyQuantity != null &&
			parsedAmount > maxBuyQuantity
		) {
			return `Maximum ${formatNumber(maxBuyQuantity)} keys per transaction for this key`;
		}
		if (
			side === 'buy' &&
			effectiveHoldingCap != null &&
			Number.isFinite(effectiveHoldingCap) &&
			effectiveHoldingCap > 0
		) {
			if (availableHoldings >= effectiveHoldingCap) {
				return `Holding cap reached (${formatNumber(effectiveHoldingCap)} keys max per wallet).`;
			}
			if (
				Number.isFinite(parsedAmount) &&
				parsedAmount > 0 &&
				availableHoldings + parsedAmount > effectiveHoldingCap
			) {
				return `Purchase would exceed the holding cap of ${formatNumber(effectiveHoldingCap)} keys (you hold ${formatNumber(availableHoldings)}).`;
			}
		}
		if (side === 'sell' && parsedAmount > availableHoldings) {
			return `You can't sell more than your holdings (${formatNumber(
				availableHoldings
			)} keys).`;
		}
		return null;
	}, [
		amountText,
		parsedAmount,
		side,
		maxBuyQuantity,
		availableHoldings,
		effectiveHoldingCap,
	]);

	const isCapLimitReached = useMemo(
		() =>
			side === 'buy' &&
			effectiveHoldingCap != null &&
			Number.isFinite(effectiveHoldingCap) &&
			effectiveHoldingCap > 0 &&
			availableHoldings >= effectiveHoldingCap,
		[side, effectiveHoldingCap, availableHoldings]
	);

	const isCapBreached = useMemo(
		() =>
			side === 'buy' &&
			effectiveHoldingCap != null &&
			Number.isFinite(effectiveHoldingCap) &&
			effectiveHoldingCap > 0 &&
			Number.isFinite(parsedAmount) &&
			parsedAmount > 0 &&
			availableHoldings + parsedAmount > effectiveHoldingCap,
		[side, effectiveHoldingCap, availableHoldings, parsedAmount]
	);

	const isCapExceeded = isCapLimitReached || isCapBreached;

	const isValid = validationError === null;
	const showError = touched && validationError !== null;

	// Calculate Max value
	const handleMaxClick = () => {
		setTouched(true);
		if (side === 'sell') {
			setAmountText(String(Math.max(0, availableHoldings)));
		} else {
			let maxVal =
				maxBuyQuantity != null
					? maxBuyQuantity
					: BUY_QUANTITY_BOUNDS.MAX_QTY;
			if (
				effectiveHoldingCap != null &&
				Number.isFinite(effectiveHoldingCap) &&
				effectiveHoldingCap > 0
			) {
				const remainingCap = Math.max(0, effectiveHoldingCap - availableHoldings);
				maxVal = Math.min(maxVal, remainingCap);
			}
			setAmountText(String(maxVal));
		}
	};

	// Price calculations
	const pricePreview = useMemo<FeeBreakdown | null>(() => {
		if (side !== 'buy' || keyPriceStroops == null || !isValid) return null;
		return calculateFeeBreakdown({
			quantity: parsedAmount,
			keyPriceStroops,
			currentSupply: currentSupply ?? 0,
			protocolFeeBps,
			creatorFeeBps,
		});
	}, [
		side,
		keyPriceStroops,
		isValid,
		parsedAmount,
		currentSupply,
		protocolFeeBps,
		creatorFeeBps,
	]);

	const estimatedProceedsStroops = useMemo(() => {
		if (side !== 'sell' || !isValid) return null;
		return estimateSellProceeds(keyPriceStroops, currentSupply, parsedAmount);
	}, [side, isValid, keyPriceStroops, currentSupply, parsedAmount]);

	const totalStroops = useMemo(() => {
		if (side === 'buy') {
			return (
				pricePreview?.totalCostStroops ??
				(keyPriceStroops != null
					? keyPriceStroops * (parsedAmount || 0)
					: null)
			);
		}
		return estimatedProceedsStroops;
	}, [
		side,
		pricePreview,
		keyPriceStroops,
		parsedAmount,
		estimatedProceedsStroops,
	]);

	// Slippage bounds computation
	const slippageBounds = useMemo<SlippageBounds | null>(() => {
		if (totalStroops == null) return null;
		return computeSlippageBounds(
			side,
			totalStroops,
			slippageTolerancePercent
		);
	}, [side, totalStroops, slippageTolerancePercent]);

	// Price impact calculation
	const priceImpactPercent = useMemo(() => {
		if (!isValid || !Number.isFinite(parsedAmount)) return 0;
		return calculateTradePriceImpact({
			side,
			quantity: parsedAmount,
			currentSupply: currentSupply ?? 0,
		});
	}, [isValid, parsedAmount, side, currentSupply]);
	const impactWarningActive =
		isValid &&
		isHighPriceImpact(priceImpactPercent, slippageTolerancePercent);
	const impactAcknowledgementKey = `${side}:${parsedAmount}:${currentSupply ?? 0}:${slippageTolerancePercent}`;
	const impactAcknowledged =
		acknowledgedImpactKey === impactAcknowledgementKey;

	// Early sell launch penalty
	const launchPenalty = useMemo(() => {
		return calculateLaunchPenalty(
			estimatedProceedsStroops,
			createdAtLedger,
			currentLedger,
			launchPenaltyBps
		);
	}, [
		estimatedProceedsStroops,
		createdAtLedger,
		currentLedger,
		launchPenaltyBps,
	]);

	// Open confirmation modal
	const handleReviewOrder = () => {
		setTouched(true);
		if (!isValid || (impactWarningActive && !impactAcknowledged)) return;
		setConfirmationOpen(true);
	};

	// Final submission
	const handleConfirmSubmission = async () => {
		if (impactWarningActive && !impactAcknowledged) return;
		setInternalSubmitting(true);
		const tradeParams: BuySellTradeParams = {
			creatorId,
			side,
			amount: parsedAmount,
			priceStroops: keyPriceStroops,
			maxPriceStroops: slippageBounds?.maxPriceStroops ?? null,
			minPriceStroops: slippageBounds?.minPriceStroops ?? null,
			slippageTolerancePercent,
			pricePreview,
		};

		showToast.loading(
			`Submitting ${side} for ${parsedAmount} key${parsedAmount === 1 ? '' : 's'}...`
		);

		try {
			if (onSubmitTrade) {
				await onSubmitTrade(tradeParams);
			} else {
				// Default simulation delay if no external submitter
				await new Promise(resolve => setTimeout(resolve, 800));
			}

			const actionWord = side === 'buy' ? 'Bought' : 'Sold';
			showToast.transactionSuccess(
				'Trade confirmed',
				`${actionWord} ${formatNumber(parsedAmount)} key${
					parsedAmount === 1 ? '' : 's'
				} ${side === 'buy' ? 'from' : 'for'} ${creatorName}`
			);

			setConfirmationOpen(false);
			onSuccess?.(tradeParams);
		} catch (error) {
			const message = getSignatureErrorMessage(error);
			showToast.error(message);
			onError?.(error);
		} finally {
			setInternalSubmitting(false);
		}
	};

	return (
		<div
			className={cn(
				'rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-md space-y-4',
				className
			)}
			data-testid="buy-sell-key-flow"
		>
			{/* Buy / Sell Tab Switcher */}
			<div className="grid grid-cols-2 gap-1 rounded-xl bg-white/[0.04] p-1 border border-white/5">
				<button
					type="button"
					onClick={() => {
						setSide('buy');
						setTouched(false);
					}}
					data-testid="trade-tab-buy"
					className={cn(
						'rounded-lg py-2 text-xs font-bold transition-all',
						side === 'buy'
							? 'bg-amber-400 text-slate-950 shadow-sm'
							: 'text-white/60 hover:text-white'
					)}
				>
					Buy Keys
				</button>
				<button
					type="button"
					onClick={() => {
						setSide('sell');
						setTouched(false);
					}}
					data-testid="trade-tab-sell"
					className={cn(
						'rounded-lg py-2 text-xs font-bold transition-all',
						side === 'sell'
							? 'bg-rose-500 text-white shadow-sm'
							: 'text-white/60 hover:text-white'
					)}
				>
					Sell Keys
				</button>
			</div>

			{/* Holdings / Key Price Overview */}
			<div className="flex items-center justify-between text-xs text-white/60 px-1">
				<span>{side === 'buy' ? 'Key price' : 'Available holdings'}</span>
				<span className="font-mono font-semibold text-white/90">
					{side === 'buy'
						? formatDisplayKeyPrice(keyPriceStroops)
						: `${formatNumber(availableHoldings)} keys`}
				</span>
			</div>

			{/* Configurable bid-ask spread between buy and sell price (#951) */}
			<SpreadIndicator
				buyPriceStroops={keyConfig?.buyPriceStroops}
				sellPriceStroops={keyConfig?.sellPriceStroops}
				spreadStroops={keyConfig?.spreadStroops}
				spreadBps={keyConfig?.spreadBps}
				isLoading={isKeyConfigLoading}
			/>

			{/* Early sell penalty warning if applicable */}
			{side === 'sell' && (
				<LaunchPenaltyWarning
					visible={launchPenalty.applies}
					penaltyBps={launchPenalty.penaltyBps}
				/>
			)}

			{/* Amount Input with MAX Button */}
			<div className="space-y-1.5">
				<div className="flex items-center justify-between text-xs">
					<label
						htmlFor="trade-amount-input"
						className="text-white/70 font-medium"
					>
						Quantity
					</label>
					{side === 'sell' && availableHoldings > 0 && (
						<span className="text-[11px] text-white/40">
							Max: {formatNumber(availableHoldings)}
						</span>
					)}
				</div>
				<div className="relative flex items-center">
					<input
						id="trade-amount-input"
						data-testid="trade-amount-input"
						type="number"
						min={1}
						step={1}
						inputMode="numeric"
						value={amountText}
						onChange={e => {
							setAmountText(e.target.value);
							setTouched(true);
						}}
						disabled={isSubmitting}
						placeholder="1"
						className={cn(
							'w-full rounded-xl border bg-white/[0.04] px-3 py-2.5 pr-16 text-sm font-mono text-white outline-none transition-colors',
							'border-white/10 focus:border-amber-400/50 focus:ring-2 focus:ring-amber-400/15',
							showError &&
								'border-red-500/60 focus:border-red-500/60 focus:ring-red-500/15'
						)}
					/>
					<button
						type="button"
						data-testid="trade-max-button"
						onClick={handleMaxClick}
						disabled={
							isSubmitting || (side === 'sell' && availableHoldings <= 0)
						}
						className={cn(
							'absolute right-2 rounded-lg border border-amber-400/30 bg-amber-400/10 px-2.5 py-1 text-xs font-bold text-amber-300 transition-colors',
							'hover:bg-amber-400/20 active:scale-95 disabled:pointer-events-none disabled:opacity-40'
						)}
					>
						MAX
					</button>
				</div>
				{showError && (
					<p
						role="alert"
						data-testid="trade-amount-error"
						className="text-xs text-red-300"
					>
						{validationError}
					</p>
				)}
				{/* Holding cap indicator on buy form (#1015) */}
				{side === 'buy' && effectiveHoldingCap != null && effectiveHoldingCap > 0 && (
					<HoldingCapIndicator
						currentHoldings={availableHoldings}
						holdingCap={effectiveHoldingCap}
						purchaseAmount={
							Number.isFinite(parsedAmount) && parsedAmount > 0
								? parsedAmount
								: 0
						}
						creatorName={creatorName}
						className="my-2.5"
					/>
				)}
			</div>

			{/* Price & Cost Estimate */}
			{isValid && totalStroops != null && (
				<div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 text-xs space-y-2">
					<div className="flex items-center justify-between">
						<span className="text-white/60">
							{side === 'buy' ? 'Estimated Total' : 'Estimated Proceeds'}
						</span>
						<span
							className="font-mono font-bold text-amber-300"
							data-testid="trade-estimated-total"
						>
							{formatDisplayKeyPrice(totalStroops)}
						</span>
					</div>
					{slippageBounds && (
						<div className="flex items-center justify-between border-t border-white/5 pt-1.5 text-[11px]">
							<span className="text-white/50">
								{side === 'buy' ? 'Max price bound' : 'Min price bound'}
							</span>
							<span
								className="font-mono text-white/80"
								data-testid="trade-slippage-bound"
							>
								{formatDisplayKeyPrice(
									side === 'buy'
										? slippageBounds.maxPriceStroops
										: slippageBounds.minPriceStroops
								)}
							</span>
						</div>
					)}
				</div>
			)}

			{/* Slippage Tolerance Selector (0.5%, 1%, 2%, custom) */}
			<div className="border-t border-white/10 pt-3">
				<SlippageToleranceSelector
					value={slippageTolerancePercent}
					onChange={setSlippageTolerancePercent}
					disabled={isSubmitting}
					presets={[0.5, 1, 2]}
				/>
			</div>

			{/* Price impact warning when impact exceeds the selected tolerance */}
			<PriceImpactWarning
				impactPercent={priceImpactPercent}
				threshold={slippageTolerancePercent}
			/>
			{impactWarningActive && (
				<PriceImpactOverrideCheckbox
					checked={impactAcknowledged}
					onChange={checked =>
						setAcknowledgedImpactKey(
							checked ? impactAcknowledgementKey : null
						)
					}
				/>
			)}

			{/* Review / Proceed to Confirmation Button */}
			<Button
				type="button"
				onClick={handleReviewOrder}
				disabled={
					!isValid ||
					isSubmitting ||
					isCapExceeded ||
					(impactWarningActive && !impactAcknowledged)
				}
				data-testid="trade-review-button"
				className={cn(
					'w-full rounded-xl py-3 font-bold text-sm shadow-md transition-all',
					side === 'buy'
						? 'bg-amber-400 hover:bg-amber-300 text-slate-950'
						: 'bg-rose-500 hover:bg-rose-400 text-white'
				)}
			>
				<span className="flex items-center justify-center gap-1.5">
					{side === 'buy'
						? isCapLimitReached
							? 'Holding Cap Reached'
							: isCapBreached
							? 'Holding Cap Exceeded'
							: 'Review Buy Order'
						: 'Review Sell Order'}
					<ArrowRight className="h-4 w-4" />
				</span>
			</Button>

			{/* Confirmation Modal */}
			<TradeConfirmationModal
				open={confirmationOpen}
				onOpenChange={setConfirmationOpen}
				side={side}
				creatorName={creatorName}
				amount={parsedAmount}
				unitPriceStroops={keyPriceStroops}
				totalStroops={totalStroops}
				slippageTolerancePercent={slippageTolerancePercent}
				maxPriceStroops={slippageBounds?.maxPriceStroops ?? null}
				minPriceStroops={slippageBounds?.minPriceStroops ?? null}
				priceImpactPercent={priceImpactPercent}
				onConfirm={handleConfirmSubmission}
				onCancel={() => setConfirmationOpen(false)}
				isSubmitting={isSubmitting}
			/>
		</div>
	);
};

export default BuySellKeyFlow;
