import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { StableButtonContent } from '@/components/ui/stable-button-content';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import {
	BottomSheet,
	BottomSheetContent,
	BottomSheetDescription,
	BottomSheetHandle,
	BottomSheetTitle,
} from '@/components/ui/bottom-sheet';
import { useIsMobile } from '@/hooks/useIsMobile';
import { cn } from '@/lib/utils';
import { formatNumber } from '@/utils/numberFormat.utils';
import {
	formatDisplayKeyPrice,
	estimateSellProceeds,
} from '@/utils/keyPriceDisplay.utils';
import PercentageBadge from '@/components/common/PercentageBadge';
import NetworkFeeHint from '@/components/common/NetworkFeeHint';
import BuyFeeBreakdown from '@/components/common/BuyFeeBreakdown';
import SellFeeBreakdown from '@/components/common/SellFeeBreakdown';
import LaunchPenaltyWarning from '@/components/common/LaunchPenaltyWarning';
import SlippageToleranceSelector from '@/components/common/SlippageToleranceSelector';
import { TRADE_FEE_ESTIMATE, FEE_BOUNDS } from '@/constants/fees';
import { formatTransactionFeeDisplay } from '@/utils/transactionFee.utils';
import { clampBuyQuantity } from '@/utils/buyQuantity';
import { calculateLaunchPenalty } from '@/utils/launchPenalty.utils';
import {
	fetchPricePreview,
	type FeeBreakdown,
} from '@/utils/pricePreview.utils';
import {
	DEFAULT_SLIPPAGE_TOLERANCE_PERCENT,
	computeSlippageBounds,
	type SlippageBounds,
} from '@/utils/slippageTolerance.utils';

export type TradeSide = 'buy' | 'sell';

export interface TradeDialogProps {
	open: boolean;
	side: TradeSide;
	creatorName: string;
	availableHoldings: number;
	/** Per-key price in stroops, shown on the buy confirmation step. */
	keyPriceStroops?: number | null;
	/** Current key supply for estimating sell proceeds. */
	currentSupply?: number | null;
	/** Protocol fee in basis points for fee preview (defaults to FEE_BOUNDS.DEFAULT_FEE_BPS) */
	protocolFeeBps?: number;
	/** Creator fee in basis points for fee preview (defaults to FEE_BOUNDS.DEFAULT_FEE_BPS) */
	creatorFeeBps?: number;
	/** Ledger sequence the key was created at, from the key detail API. */
	createdAtLedger?: number | null;
	/** Current network ledger sequence, used to evaluate the 7-day launch window. */
	currentLedger?: number | null;
	/** Early-sell penalty in basis points, from the key detail API. */
	launchPenaltyBps?: number | null;
	/** Max buy quantity allowed per transaction; null means no limit. */
	maxBuyQuantity?: number | null;
	onOpenChange: (open: boolean) => void;
	onConfirm: (
		amount: number,
		pricePreview?: FeeBreakdown | null,
		slippage?: SlippageBounds | null
	) => Promise<void> | void;
	isSubmitting?: boolean;
	networkFeeEstimateProvider?: {
		getFeeData: () => Promise<{ gasPrice?: bigint }>;
	};
}

const TradeDialog: React.FC<TradeDialogProps> = ({
	open,
	side,
	creatorName,
	availableHoldings,
	keyPriceStroops,
	currentSupply,
	protocolFeeBps = FEE_BOUNDS.DEFAULT_FEE_BPS,
	creatorFeeBps = FEE_BOUNDS.DEFAULT_FEE_BPS,
	createdAtLedger,
	currentLedger,
	launchPenaltyBps,
	maxBuyQuantity = null,
	onOpenChange,
	onConfirm,
	isSubmitting = false,
}) => {
	const [amountText, setAmountText] = useState('1');
	const [touched, setTouched] = useState(false);
	const [pricePreview, setPricePreview] = useState<FeeBreakdown | null>(null);
	const [previewLoading, setPreviewLoading] = useState(false);
	const [previewError, setPreviewError] = useState<string | null>(null);
	const [slippageTolerancePercent, setSlippageTolerancePercent] = useState(
		DEFAULT_SLIPPAGE_TOLERANCE_PERCENT
	);
	const amountInputRef = useRef<HTMLInputElement | null>(null);
	const pricePreviewFailureLogged = useRef(false);
	const previewAbortControllerRef = useRef<AbortController | null>(null);
	// TradeDialog is opened via `open`/`onOpenChange` props from several
	// different external trigger buttons (see LandingPage.tsx), never via
	// Radix's own <DialogTrigger>. That means Radix's built-in
	// focus-return-to-trigger (which targets its own internal triggerRef)
	// is always a no-op here — there is no triggerRef to return to. We
	// capture whatever had focus right before the dialog opened ourselves
	// and restore it in onCloseAutoFocus instead.
	const triggerElementRef = useRef<HTMLElement | null>(null);

	useEffect(() => {
		if (open) {
			triggerElementRef.current =
				document.activeElement as HTMLElement | null;
			setAmountText('1');
			setTouched(false);
			setPricePreview(null);
			setPreviewLoading(false);
			setPreviewError(null);
			setSlippageTolerancePercent(DEFAULT_SLIPPAGE_TOLERANCE_PERCENT);
			pricePreviewFailureLogged.current = false;
		}
	}, [open]);

	// Internal keyboard shortcuts for amount adjustment when the dialog is open.
	// Quick presets: 1→1, 2→2, 3→3, 4→5, 5→10, Shift+1→10
	// Adjust: +/- to increment/decrement by 1
	useEffect(() => {
		if (!open || isSubmitting) return;

		const handleAmountKey = (event: KeyboardEvent) => {
			if (event.defaultPrevented || event.repeat) return;

			// Only intercept when the amount input is focused
			const activeEl = document.activeElement;
			if (
				!(activeEl instanceof HTMLInputElement) ||
				activeEl.getAttribute('data-testid') !== 'trade-dialog-amount'
			) {
				return;
			}

			// Ignore if modifier keys are held (except Shift for !)
			if (event.ctrlKey || event.metaKey || event.altKey) return;

			const key = event.key;

			// Quick amount presets
			const presets: Record<string, number> = {
				'1': 1,
				'2': 2,
				'3': 3,
				'4': 5,
				'5': 10,
			};

			if (!event.shiftKey && presets[key] !== undefined) {
				event.preventDefault();
				const clamped = clampBuyQuantity(presets[key].toString());
				setAmountText(clamped.value.toString());
				setTouched(true);
				return;
			}

			// Shift+1 = 10
			if (key === '!' && event.shiftKey) {
				event.preventDefault();
				const clamped = clampBuyQuantity('10');
				setAmountText(clamped.value.toString());
				setTouched(true);
				return;
			}

			// Adjust amount: + and -
			if (key === '+' || (key === '=' && event.shiftKey)) {
				event.preventDefault();
				const current = Number(amountText) || 0;
				const next = Math.max(1, current + 1);
				const clamped = clampBuyQuantity(next.toString());
				setAmountText(clamped.value.toString());
				setTouched(true);
				return;
			}

			if (key === '-') {
				event.preventDefault();
				const current = Number(amountText) || 0;
				const next = Math.max(1, current - 1);
				const clamped = clampBuyQuantity(next.toString());
				setAmountText(clamped.value.toString());
				setTouched(true);
				return;
			}
		};

		window.addEventListener('keydown', handleAmountKey);
		return () => window.removeEventListener('keydown', handleAmountKey);
	}, [open, isSubmitting, amountText]);

	const handleBlur = () => {
		setTouched(true);
		const normalized = amountText.trim();
		if (normalized) {
			const clampedResult = clampBuyQuantity(amountText);
			if (clampedResult.adjusted) {
				setAmountText(clampedResult.value.toString());
			}
		}
	};

	const parsedAmount = useMemo(() => {
		const normalized = amountText.trim();
		if (!normalized) return NaN;
		return Number(normalized);
	}, [amountText]);

	const validationError = useMemo((): string | null => {
		const normalized = amountText.trim();
		if (!normalized) return 'Please enter an amount.';
		if (!Number.isFinite(parsedAmount))
			return 'Amount must be a valid number.';
		if (parsedAmount <= 0) return 'Amount must be greater than zero.';
		if (
			side === 'buy' &&
			maxBuyQuantity != null &&
			parsedAmount > maxBuyQuantity
		) {
			return `Maximum ${formatNumber(maxBuyQuantity)} keys per transaction for this key`;
		}
		if (side === 'sell' && parsedAmount > availableHoldings)
			return `You can't sell more than your holdings (${formatNumber(availableHoldings)} keys).`;
		return null;
	}, [amountText, parsedAmount, side, maxBuyQuantity, availableHoldings]);

	const amountValid = validationError === null;
	const showError = touched && validationError !== null;

	const title = side === 'buy' ? 'Buy keys' : 'Sell keys';
	const confirmLabel = side === 'buy' ? 'Confirm buy' : 'Confirm sell';
	const estimatedNetworkFee = formatTransactionFeeDisplay(
		TRADE_FEE_ESTIMATE.DEFAULT_NETWORK_FEE,
		{ unit: TRADE_FEE_ESTIMATE.UNIT }
	);

	const estimatedProceedsStroops = useMemo(() => {
		if (
			side !== 'sell' ||
			!Number.isFinite(parsedAmount) ||
			parsedAmount <= 0
		) {
			return null;
		}
		return estimateSellProceeds(keyPriceStroops, currentSupply, parsedAmount);
	}, [side, keyPriceStroops, currentSupply, parsedAmount]);

	const launchPenalty = useMemo(
		() =>
			calculateLaunchPenalty(
				estimatedProceedsStroops,
				createdAtLedger,
				currentLedger,
				launchPenaltyBps
			),
		[estimatedProceedsStroops, createdAtLedger, currentLedger, launchPenaltyBps]
	);

	const estimatedTotalStroops = useMemo(() => {
		if (
			side !== 'buy' ||
			!Number.isFinite(parsedAmount) ||
			parsedAmount <= 0
		) {
			return null;
		}
		if (keyPriceStroops == null) return null;
		return keyPriceStroops * parsedAmount;
	}, [side, keyPriceStroops, parsedAmount]);

	// The reference price slippage bounds are computed from: the fee-inclusive
	// buy total when available, falling back to the raw estimated total, and
	// the estimated sell proceeds on the sell side. This mirrors the same
	// price shown to the user just above the slippage selector, so the
	// max/min bound the contract enforces always matches what was displayed.
	const slippageReferencePriceStroops = useMemo(() => {
		if (side === 'buy') {
			return pricePreview?.totalCostStroops ?? estimatedTotalStroops ?? null;
		}
		return estimatedProceedsStroops;
	}, [side, pricePreview, estimatedTotalStroops, estimatedProceedsStroops]);

	const slippageBounds = useMemo<SlippageBounds | null>(() => {
		if (slippageReferencePriceStroops == null) return null;
		return computeSlippageBounds(
			side,
			slippageReferencePriceStroops,
			slippageTolerancePercent
		);
	}, [side, slippageReferencePriceStroops, slippageTolerancePercent]);

	// Fetch price preview (fee breakdown) for buy transactions
	useEffect(() => {
		// Only fetch for buy transactions
		if (side !== 'buy' || keyPriceStroops == null) {
			setPricePreview(null);
			setPreviewLoading(false);
			return;
		}

		// Don't fetch if amount is invalid
		if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
			setPricePreview(null);
			setPreviewLoading(false);
			setPreviewError(null);
			return;
		}

		// Debounce the fetch slightly to avoid too many requests while typing
		const timeoutId = window.setTimeout(async () => {
			// Cancel previous fetch if one is in progress
			if (previewAbortControllerRef.current) {
				previewAbortControllerRef.current.abort();
			}

			setPreviewLoading(true);
			setPreviewError(null);

			try {
				const preview = await fetchPricePreview({
					quantity: parsedAmount,
					keyPriceStroops,
					currentSupply: currentSupply ?? 0,
					protocolFeeBps,
					creatorFeeBps,
				});

				setPricePreview(preview);
			} catch (error) {
				if (error instanceof Error && error.name === 'AbortError') {
					// Request was cancelled, ignore
					return;
				}
				setPreviewError(
					error instanceof Error
						? error.message
						: 'Failed to fetch price preview'
				);
				setPricePreview(null);
			} finally {
				setPreviewLoading(false);
			}
		}, 200); // Debounce by 200ms

		return () => clearTimeout(timeoutId);
	}, [
		side,
		parsedAmount,
		keyPriceStroops,
		currentSupply,
		protocolFeeBps,
		creatorFeeBps,
	]);

	useEffect(() => {
		if (process.env.NODE_ENV === 'test') return;
		if (!open || pricePreviewFailureLogged.current) return;

		if (side === 'buy' && keyPriceStroops == null) {
			console.debug('[price-preview-failure]', {
				creator_name: creatorName,
				quantity: Number.isFinite(parsedAmount) ? parsedAmount : null,
				side: 'buy',
				reason: 'key_price_missing',
				timestamp: new Date().toISOString(),
			});
			pricePreviewFailureLogged.current = true;
		}
	}, [open, side, keyPriceStroops, creatorName, parsedAmount]);

	useEffect(() => {
		if (process.env.NODE_ENV === 'test') return;
		if (!open || pricePreviewFailureLogged.current) return;

		if (side === 'sell' && estimatedProceedsStroops == null) {
			console.debug('[price-preview-failure]', {
				creator_name: creatorName,
				quantity: Number.isFinite(parsedAmount) ? parsedAmount : null,
				side: 'sell',
				reason: 'estimate_unavailable',
				timestamp: new Date().toISOString(),
			});
			pricePreviewFailureLogged.current = true;
		}
	}, [open, side, estimatedProceedsStroops, creatorName, parsedAmount]);

	const isMobile = useIsMobile();

	const bodyContent = (
		<>
			{side === 'buy' && keyPriceStroops != null && (
				<p className="text-sm text-white/60">
					Unit price:{' '}
					<span className="font-semibold text-amber-300/90 tabular-nums">
						{formatDisplayKeyPrice(keyPriceStroops)}
					</span>
				</p>
			)}

			{side === 'sell' && (
				<LaunchPenaltyWarning
					visible={launchPenalty.applies}
					penaltyBps={launchPenalty.penaltyBps}
				/>
			)}

			<div className="space-y-2">
				<div className="text-sm text-white/70">Amount</div>
				<input
					ref={amountInputRef}
					inputMode="decimal"
					value={amountText}
					onChange={event => {
						setAmountText(event.target.value);
						setTouched(true);
					}}
					onBlur={handleBlur}
					disabled={isSubmitting}
					className={cn(
						'w-full rounded-xl border bg-white/[0.04] px-3 py-2 text-white outline-none transition-colors',
						'border-white/10 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/15',
						showError ? 'border-red-500/60' : ''
					)}
					aria-label="Trade amount"
					aria-describedby={
						showError ? 'trade-amount-error' : undefined
					}
					aria-invalid={showError || undefined}
					data-focus-order="1"
					data-testid="trade-dialog-amount"
				/>
				{showError && (
					<p
						id="trade-amount-error"
						role="alert"
						className="text-xs text-red-300"
						data-testid="trade-dialog-amount-error"
					>
						{validationError}
					</p>
				)}
				<div className="flex flex-wrap items-center gap-2 text-xs text-white/45">
					<span
						aria-label={`Current wallet holdings: ${formatNumber(availableHoldings)} keys`}
					>
						Holdings: {formatNumber(availableHoldings)} keys
					</span>
					{side === 'sell' &&
						availableHoldings > 0 &&
						Number.isFinite(parsedAmount) &&
						parsedAmount > 0 && (
							<PercentageBadge
								label="of holdings"
								value={(parsedAmount / availableHoldings) * 100}
								tone={
									parsedAmount > availableHoldings
										? 'negative'
										: 'neutral'
								}
							/>
						)}
				</div>
				{side === 'buy' && (
					<NetworkFeeHint
						variant="text"
						fee={estimatedNetworkFee}
						className="text-white/45"
					/>
				)}
				{side === 'buy' && amountValid && (
					<BuyFeeBreakdown
						breakdown={pricePreview}
						isLoading={previewLoading}
						error={previewError}
						onRetry={() => {
							setPreviewError(null);
							setPreviewLoading(true);
						}}
					/>
				)}
				{side === 'buy' && estimatedTotalStroops != null && (
					<div className="text-xs text-white/45 mt-2">
						Estimated total (approximate):{' '}
						<span className="font-semibold text-amber-300/90 tabular-nums">
							{formatDisplayKeyPrice(estimatedTotalStroops)}
						</span>
					</div>
				)}
				{side === 'sell' && (
					<SellFeeBreakdown
						grossProceedsStroops={estimatedProceedsStroops}
						launchPenalty={launchPenalty}
					/>
				)}
				{amountValid && (
					<div className="mt-3 border-t border-white/10 pt-3">
						<SlippageToleranceSelector
							value={slippageTolerancePercent}
							onChange={setSlippageTolerancePercent}
							disabled={isSubmitting}
						/>
						{slippageBounds && (
							<p
								className="mt-2 text-[0.7rem] text-white/45"
								data-testid="trade-dialog-slippage-bound"
							>
								{side === 'buy'
									? slippageBounds.maxPriceStroops != null && (
											<>
												Max price:{' '}
												<span className="font-semibold text-white/70 tabular-nums">
													{formatDisplayKeyPrice(
														slippageBounds.maxPriceStroops
													)}
												</span>
											</>
										)
									: slippageBounds.minPriceStroops != null && (
											<>
												Min price:{' '}
												<span className="font-semibold text-white/70 tabular-nums">
													{formatDisplayKeyPrice(
														slippageBounds.minPriceStroops
													)}
												</span>
											</>
										)}
							</p>
						)}
					</div>
				)}
			</div>
		</>
	);

	const actionButtons = (
		<>
			<Button
				type="button"
				variant="ghost"
				onClick={() => onOpenChange(false)}
				disabled={isSubmitting}
				data-focus-order="2"
				data-testid="trade-dialog-cancel"
			>
				Cancel
			</Button>
			<Button
				type="button"
				onClick={() =>
					onConfirm(parsedAmount, pricePreview, slippageBounds)
				}
				disabled={
					!amountValid ||
					isSubmitting ||
					(side === 'buy' &&
						(previewLoading || previewError != null))
				}
				aria-busy={isSubmitting || undefined}
				data-focus-order="3"
				data-testid="trade-dialog-confirm"
			>
				<StableButtonContent
					isLoading={isSubmitting}
					loadingLabel="Submitting…"
				>
					{confirmLabel}
				</StableButtonContent>
			</Button>
		</>
	);

	if (isMobile) {
		return (
			<BottomSheet
				open={open}
				onOpenChange={next => !isSubmitting && onOpenChange(next)}
			>
				<BottomSheetContent
					className="max-h-[calc(100vh-80px)] overflow-y-auto"
					enableDrag={!isSubmitting}
					hideCloseButton={isSubmitting}
					onOpenAutoFocus={event => {
						event.preventDefault();
						amountInputRef.current?.focus();
					}}
					onCloseAutoFocus={event => {
						event.preventDefault();
						triggerElementRef.current?.focus();
					}}
					onEscapeKeyDown={event => {
						if (isSubmitting) event.preventDefault();
					}}
					onInteractOutside={event => {
						if (isSubmitting) event.preventDefault();
					}}
				>
					<BottomSheetHandle />
					<div className="flex flex-col gap-2 text-center sm:text-left mb-4">
						<BottomSheetTitle className="text-lg leading-none font-semibold">
							{title}
						</BottomSheetTitle>
						<BottomSheetDescription className="text-muted-foreground text-sm">
							{side === 'buy'
								? `Purchase creator keys for ${creatorName}.`
								: `Sell creator keys for ${creatorName}.`}
						</BottomSheetDescription>
					</div>

					{bodyContent}

					<div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
						{actionButtons}
					</div>
				</BottomSheetContent>
			</BottomSheet>
		);
	}

	return (
		<Dialog
			open={open}
			onOpenChange={next => !isSubmitting && onOpenChange(next)}
		>
			<DialogContent
				className="max-w-md"
				showCloseButton={!isSubmitting}
				showEscapeHint={!isSubmitting}
				onOpenAutoFocus={event => {
					event.preventDefault();
					amountInputRef.current?.focus();
				}}
				onCloseAutoFocus={event => {
					event.preventDefault();
					triggerElementRef.current?.focus();
				}}
				onEscapeKeyDown={event => {
					if (isSubmitting) event.preventDefault();
				}}
				onInteractOutside={event => {
					if (isSubmitting) event.preventDefault();
				}}
			>
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					<DialogDescription>
						{side === 'buy'
							? `Purchase creator keys for ${creatorName}.`
							: `Sell creator keys for ${creatorName}.`}
					</DialogDescription>
				</DialogHeader>

				{bodyContent}

				{/*
				 * Focus order is intentional: amount input → Cancel → Confirm.
				 * That matches the visual left-to-right reading order in the
				 * footer (`sm:justify-between` puts Cancel on the left, Confirm
				 * on the right) and keeps the destructive action one Tab away
				 * from the primary action so users always pass through Cancel
				 * before reaching Confirm. The covering test in
				 * `__tests__/TradeDialog.focusOrder.test.tsx` guards this.
				 */}
				<DialogFooter className="sm:justify-between">
					{actionButtons}
				</DialogFooter>

				{/* Subtle keyboard shortcut hint for power users */}
				<div
					className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-t border-white/5 pt-3 text-[11px] text-white/30"
					aria-hidden="true"
					data-testid="trade-dialog-shortcut-hint"
				>
					<span className="flex items-center gap-1">
						<kbd className="rounded border border-white/10 bg-white/[0.04] px-1 py-0.5 font-mono text-[10px]">Enter</kbd>
						confirm
					</span>
					<span className="flex items-center gap-1">
						<kbd className="rounded border border-white/10 bg-white/[0.04] px-1 py-0.5 font-mono text-[10px]">Esc</kbd>
						close
					</span>
					<span className="flex items-center gap-1">
						<kbd className="rounded border border-white/10 bg-white/[0.04] px-1 py-0.5 font-mono text-[10px]">+</kbd>
						<kbd className="rounded border border-white/10 bg-white/[0.04] px-1 py-0.5 font-mono text-[10px]">-</kbd>
						adjust
					</span>
				</div>
			</DialogContent>
		</Dialog>
	);
};

export default TradeDialog;
